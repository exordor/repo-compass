#!/usr/bin/env python3
"""Fetch GitHub repo metadata for a list of repos and print a health table.

Usage:
    python repo_health.py owner/repo [owner/repo ...]
    python repo_health.py --json owner/repo ...        # machine-readable
    python repo_health.py --tier "3:owner/a,owner/b" --tier "2:owner/c" ...

Set GITHUB_TOKEN to raise the rate limit (60/h unauthenticated is enough
for ~15 repos; PR/closed-issue counts use the search API, 10/min unauth).

What the score means (0-100, higher = safer to depend on):
    recency      35  days since last push, exponential decay (half-life 90 d)
    traction     25  log10(stars) scaled so 10 stars=0, 100k stars=100,
                     plus a bonus if stars/day since creation is high
    maintenance  25  issue close rate and PR merge rate (last 2000 of each)
    maturity     15  age in years (saturates at 3) and has a release

Deliberately NOT a relevance score. Relevance comes from facet overlap,
decided by the model; this script only orders repos *within* a tier and
gives the user a dependability signal. Treat the number as a summary of
the columns next to it, not as truth.
"""
import json, math, os, sys, time, urllib.request, urllib.error, urllib.parse
from datetime import datetime, timezone

API = "https://api.github.com"
TOKEN = os.environ.get("GITHUB_TOKEN")

def get(url):
    req = urllib.request.Request(url, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "repo-health-script",
        **({"Authorization": f"Bearer {TOKEN}"} if TOKEN else {}),
    })
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.load(r), r.headers
    except urllib.error.HTTPError as e:
        if e.code == 403 and "rate limit" in (e.read().decode() or "").lower():
            return {"_error": "rate_limited"}, {}
        return {"_error": f"http_{e.code}"}, {}
    except Exception as e:  # network blocked, DNS, etc.
        return {"_error": f"net:{type(e).__name__}"}, {}

def search_count(q):
    data, _ = get(f"{API}/search/issues?q={urllib.parse.quote(q)}&per_page=1")
    return None if "_error" in data else data.get("total_count")

def days_since(iso):
    if not iso: return None
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return (datetime.now(timezone.utc) - dt).total_seconds() / 86400

def clamp(x, lo=0.0, hi=1.0): return max(lo, min(hi, x))

def fetch(full):
    data, _ = get(f"{API}/repos/{full}")
    if "_error" in data:
        # Fallback: ungh.cc mirrors the core REST fields and is reachable from
        # some sandboxes that block api.github.com. No issue/PR breakdown there.
        mirror, _ = get(f"https://ungh.cc/repos/{full}")
        r = mirror.get("repo") if isinstance(mirror, dict) else None
        if not r:
            return {"repo": full, "error": data["_error"]}
        data = {"full_name": f"{r.get('owner')}/{r.get('name')}", "stargazers_count": r.get("stars", 0),
                "created_at": r.get("createdAt"), "pushed_at": r.get("pushedAt") or r.get("updatedAt"),
                "archived": False, "fork": False, "license": None, "language": None,
                "description": r.get("description"), "_mirror": True}
    moved = data["full_name"] if data["full_name"].lower() != full.lower() else None
    name = data["full_name"]
    stars = data["stargazers_count"]
    age_d = days_since(data["created_at"]) or 1
    push_d = days_since(data["pushed_at"]) or 0
    rel, _ = get(f"{API}/repos/{name}/releases?per_page=1")
    has_release = isinstance(rel, list) and len(rel) > 0

    # Issues vs PRs. open_issues_count from the repo endpoint INCLUDES PRs.
    oi = search_count(f"repo:{name} is:issue is:open")
    ci = search_count(f"repo:{name} is:issue is:closed")
    opr = search_count(f"repo:{name} is:pr is:open")
    mpr = search_count(f"repo:{name} is:pr is:merged")
    cpr = search_count(f"repo:{name} is:pr is:closed is:unmerged")
    time.sleep(0.4 if TOKEN else 1.2)  # stay under search rate limit

    close_rate = ci / (ci + oi) if (ci is not None and oi is not None and ci + oi > 0) else None
    merge_rate = mpr / (mpr + cpr) if (mpr is not None and cpr is not None and mpr + cpr > 0) else None

    recency = math.exp(-math.log(2) * push_d / 90)
    traction = clamp((math.log10(max(stars, 1)) - 1) / 4)
    spd = stars / age_d
    if spd > 50: traction = clamp(traction + 0.15)
    maint_parts = [v for v in (close_rate, merge_rate) if v is not None]
    maintenance = sum(maint_parts) / len(maint_parts) if maint_parts else 0.5
    maturity = 0.7 * clamp(age_d / (3 * 365)) + 0.3 * (1.0 if has_release else 0.0)
    score = round(100 * (0.35 * recency + 0.25 * traction + 0.25 * maintenance + 0.15 * maturity))

    return {
        "repo": name, "moved_from": full if moved else None,
        "stars": stars, "stars_per_day": round(spd, 1),
        "age_days": round(age_d), "pushed_days_ago": round(push_d),
        "open_issues": oi, "closed_issues": ci, "issue_close_rate": None if close_rate is None else round(close_rate, 2),
        "open_prs": opr, "merged_prs": mpr, "pr_merge_rate": None if merge_rate is None else round(merge_rate, 2),
        "has_release": has_release, "archived": data.get("archived", False), "fork": data.get("fork", False),
        "license": (data.get("license") or {}).get("spdx_id"), "language": data.get("language"),
        "description": (data.get("description") or "")[:120],
        "score": score,
    }

def fmt_age(d):
    if d is None: return "?"
    return f"{d}d" if d < 60 else (f"{d//30}mo" if d < 730 else f"{d/365:.1f}y")

def main(argv):
    as_json = "--json" in argv
    args = [a for a in argv if a != "--json"]
    tiers = {}  # repo -> tier
    repos = []
    i = 0
    while i < len(args):
        if args[i] == "--tier":
            t, lst = args[i + 1].split(":", 1)
            for r in lst.split(","):
                r = r.strip().strip("/")
                tiers[r.lower()] = int(t); repos.append(r)
            i += 2
        else:
            r = args[i].strip().strip("/")
            r = r.replace("https://github.com/", "")
            repos.append(r); i += 1
    rows = [fetch(r) for r in repos]
    for row in rows:
        row["tier"] = tiers.get(row["repo"].lower(), tiers.get((row.get("moved_from") or "").lower(), 0))
    rows.sort(key=lambda r: (-(r.get("tier", 0)), -(r.get("score", -1))))
    if as_json:
        print(json.dumps(rows, indent=1, ensure_ascii=False)); return
    hdr = f"{'tier':4} {'score':5} {'repo':42} {'stars':>7} {'★/day':>6} {'age':>5} {'push':>5} {'iss close':>9} {'pr merge':>8} {'rel':3} {'lic':9} flags"
    print(hdr); print("-" * len(hdr))
    for r in rows:
        if "error" in r:
            print(f"{'':4} {'':5} {r['repo']:42} ERROR {r['error']}"); continue
        flags = " ".join(f for f, on in (("ARCHIVED", r["archived"]), ("FORK", r["fork"]),
                                        (f"moved←{r['moved_from']}", r["moved_from"])) if on)
        cr = "?" if r["issue_close_rate"] is None else f"{r['issue_close_rate']:.0%}"
        mr = "?" if r["pr_merge_rate"] is None else f"{r['pr_merge_rate']:.0%}"
        print(f"{r['tier'] or '-':<4} {r['score']:5} {r['repo']:42} {r['stars']:>7} {r['stars_per_day']:>6} "
              f"{fmt_age(r['age_days']):>5} {fmt_age(r['pushed_days_ago']):>5} {cr:>9} {mr:>8} "
              f"{'yes' if r['has_release'] else 'no':3} {str(r['license']):9} {flags}")

if __name__ == "__main__":
    main(sys.argv[1:])
