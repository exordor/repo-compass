// GitHub data access: repo metadata, README, manifests, search, and the
// health score ported from skills/github-similar-repos/scripts/repo_health.py.

const API = "https://api.github.com";
const TOKEN = process.env.GITHUB_TOKEN;

function headers(accept = "application/vnd.github+json"): HeadersInit {
  return {
    Accept: accept,
    "User-Agent": "repo-compass-web",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
  };
}

async function gh<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API}${path}`, { headers: headers(), signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

async function ghRaw(path: string): Promise<string | null> {
  const res = await fetch(`${API}${path}`, {
    headers: headers("application/vnd.github.raw"),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  return res.text();
}

export type RepoMeta = {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics?: string[];
  license: { spdx_id: string | null } | null;
  created_at: string;
  pushed_at: string;
  archived: boolean;
  fork: boolean;
  open_issues_count: number;
  homepage: string | null;
  default_branch: string;
  parent?: { full_name: string };
};

export function parseRepo(input: string): string | null {
  const s = input.trim().replace(/\.git$/, "").replace(/\/+$/, "");
  const m =
    s.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)/i) ??
    s.match(/^([\w.-]+)\/([\w.-]+)$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

export const getRepo = (full: string) => gh<RepoMeta>(`/repos/${full}`);

export async function getReadme(full: string, maxChars = 12_000): Promise<string> {
  const text = await ghRaw(`/repos/${full}/readme`);
  return text ? text.slice(0, maxChars) : "";
}

const MANIFESTS = [
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "Cargo.toml",
  "go.mod",
  "environment.yml",
  "setup.py",
  "pom.xml",
  "build.gradle",
  "Gemfile",
  "composer.json",
];

export async function getTreeAndManifests(full: string) {
  const top = (await gh<{ name: string; type: string }[]>(`/repos/${full}/contents`)) ?? [];
  const tree = top.map((e) => (e.type === "dir" ? `${e.name}/` : e.name));
  const present = MANIFESTS.filter((m) => top.some((e) => e.name === m)).slice(0, 4);
  const manifests = await Promise.all(
    present.map(async (name) => ({ name, content: ((await ghRaw(`/repos/${full}/contents/${name}`)) ?? "").slice(0, 4000) })),
  );
  return { tree, manifests };
}

export type SearchHit = { full_name: string; description: string | null; stars: number; pushed_at: string };

export async function searchRepos(query: string, perPage = 8): Promise<SearchHit[]> {
  const data = await gh<{ items: (RepoMeta & { stargazers_count: number })[] }>(
    `/search/repositories?q=${encodeURIComponent(query)}&per_page=${perPage}`,
  );
  return (data?.items ?? []).map((r) => ({
    full_name: r.full_name,
    description: r.description?.slice(0, 200) ?? null,
    stars: r.stargazers_count,
    pushed_at: r.pushed_at,
  }));
}

// ---------------------------------------------------------------- health

export type Health = {
  repo: string;
  url: string;
  description: string | null;
  moved_from: string | null;
  stars: number;
  stars_per_day: number;
  age_days: number;
  pushed_days_ago: number;
  issue_close_rate: number | null;
  pr_merge_rate: number | null;
  open_issues: number | null;
  has_release: boolean;
  archived: boolean;
  fork: boolean;
  license: string | null;
  language: string | null;
  topics: string[];
  score: number;
};

type Counts = { oi: number; ci: number; mpr: number; cpr: number; releases: number };

// One GraphQL query for every repo: issue/PR counts and releases. Needs a token;
// without one we fall back to the REST releases endpoint and skip the rates.
async function graphCounts(repos: string[]): Promise<Record<string, Counts>> {
  if (!TOKEN || repos.length === 0) return {};
  const fields = repos
    .map((full, i) => {
      const [owner, name] = full.split("/");
      return `r${i}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) {
        oi: issues(states: OPEN) { totalCount }
        ci: issues(states: CLOSED) { totalCount }
        mpr: pullRequests(states: MERGED) { totalCount }
        cpr: pullRequests(states: CLOSED) { totalCount }
        releases { totalCount }
      }`;
    })
    .join("\n");
  const res = await fetch(`${API}/graphql`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ query: `query { ${fields} }` }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return {};
  const json = (await res.json()) as { data?: Record<string, Record<string, { totalCount: number }> | null> };
  const out: Record<string, Counts> = {};
  repos.forEach((full, i) => {
    const r = json.data?.[`r${i}`];
    if (r)
      out[full.toLowerCase()] = {
        oi: r.oi.totalCount,
        ci: r.ci.totalCount,
        mpr: r.mpr.totalCount,
        cpr: r.cpr.totalCount,
        releases: r.releases.totalCount,
      };
  });
  return out;
}

const daysSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 86_400_000;
const clamp = (x: number) => Math.max(0, Math.min(1, x));

export async function health(metas: { requested: string; meta: RepoMeta }[]): Promise<Health[]> {
  const counts = await graphCounts(metas.map((m) => m.meta.full_name));
  return Promise.all(
    metas.map(async ({ requested, meta }) => {
      const c = counts[meta.full_name.toLowerCase()];
      let hasRelease: boolean;
      if (c) hasRelease = c.releases > 0;
      else {
        const rel = await gh<unknown[]>(`/repos/${meta.full_name}/releases?per_page=1`);
        hasRelease = Array.isArray(rel) && rel.length > 0;
      }
      const age = Math.max(daysSince(meta.created_at), 1);
      const push = Math.max(daysSince(meta.pushed_at), 0);
      // open_issues_count from the repo endpoint includes PRs, so only the
      // GraphQL split gives a real close rate.
      const closeRate = c && c.oi + c.ci > 0 ? c.ci / (c.oi + c.ci) : null;
      const mergeRate = c && c.mpr + c.cpr > 0 ? c.mpr / (c.mpr + c.cpr) : null;

      const recency = Math.exp((-Math.LN2 * push) / 90);
      const spd = meta.stargazers_count / age;
      let traction = clamp((Math.log10(Math.max(meta.stargazers_count, 1)) - 1) / 4);
      if (spd > 50) traction = clamp(traction + 0.15);
      const maint = [closeRate, mergeRate].filter((v): v is number => v !== null);
      const maintenance = maint.length ? maint.reduce((a, b) => a + b, 0) / maint.length : 0.5;
      const maturity = 0.7 * clamp(age / (3 * 365)) + 0.3 * (hasRelease ? 1 : 0);
      const score = Math.round(100 * (0.35 * recency + 0.25 * traction + 0.25 * maintenance + 0.15 * maturity));

      return {
        repo: meta.full_name,
        url: meta.html_url,
        description: meta.description,
        moved_from: meta.full_name.toLowerCase() !== requested.toLowerCase() ? requested : null,
        stars: meta.stargazers_count,
        stars_per_day: Math.round(spd * 10) / 10,
        age_days: Math.round(age),
        pushed_days_ago: Math.round(push),
        issue_close_rate: closeRate === null ? null : Math.round(closeRate * 100) / 100,
        pr_merge_rate: mergeRate === null ? null : Math.round(mergeRate * 100) / 100,
        open_issues: c ? c.oi : null,
        has_release: hasRelease,
        archived: meta.archived,
        fork: meta.fork,
        license: meta.license?.spdx_id ?? null,
        language: meta.language,
        topics: meta.topics ?? [],
        score,
      };
    }),
  );
}
