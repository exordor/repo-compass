"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import RelationGraph from "./graph";
import type { Health } from "@/lib/github";
import type { Candidate, CompassMessage, DataParts, StepId } from "@/lib/types";

type Lang = "zh" | "en";

const STEP_ORDER: StepId[] = ["fetch", "facets", "search", "verify", "health", "tier", "report"];

const T = {
  zh: {
    tagline: "这个 GitHub 仓库处在什么位置？值得用吗？",
    sub: "粘贴一个仓库链接：拆解它的多个侧面，逐个搜索同类项目，用 GitHub API 核实每个候选，用 Jev 判定相关度，再给出定位、替代方案和健康度。",
    placeholder: "https://github.com/owner/repo",
    go: "分析",
    running: "分析中…",
    examples: "试试",
    steps: {
      fetch: "读取 README、依赖清单和目录",
      facets: "拆解 facet",
      search: "按 facet 分别搜索",
      verify: "通过 GitHub API 核实候选",
      health: "计算健康度",
      tier: "Jev 判定相关度分级",
      report: "撰写报告",
    },
    facets: "Facets",
    upstream: "上游",
    candidates: "候选仓库",
    report: "报告",
    tier: "层级",
    score: "健康分",
    shared: "共享 facet",
    push: "最近推送",
    perDay: "★/天",
    cached: "缓存结果（24 小时内）",
    took: "耗时",
    note: "体验版：通常需要 1–3 分钟，每个 IP 每天可做 2 次新分析；已分析过的仓库直接读取缓存，不占次数。",
    days: (d: number) => (d === 0 ? "今天" : `${d} 天前`),
  },
  en: {
    tagline: "Where does this GitHub repo sit, and should I use it?",
    sub: "Paste a repo link: it is decomposed into facets, each facet is searched separately, every candidate is verified against the GitHub API, graded for relevance by Jev, and you get positioning, alternatives and health.",
    placeholder: "https://github.com/owner/repo",
    go: "Analyze",
    running: "Analyzing…",
    examples: "Try",
    steps: {
      fetch: "Read README, manifests and tree",
      facets: "Decompose into facets",
      search: "Search each facet",
      verify: "Verify candidates via GitHub API",
      health: "Compute health",
      tier: "Grade relevance with Jev",
      report: "Write the report",
    },
    facets: "Facets",
    upstream: "Upstream",
    candidates: "Candidates",
    report: "Report",
    tier: "Tier",
    score: "Health",
    shared: "Shared facets",
    push: "Last push",
    perDay: "★/day",
    cached: "Cached result (within 24h)",
    took: "Took",
    note: "Demo: usually 1–3 minutes, 2 new analyses per IP per day; repos analysed before come from cache and don't count.",
    days: (d: number) => (d === 0 ? "today" : `${d}d ago`),
  },
} as const;

const EXAMPLES = ["karpathy/nanochat", "ollama/ollama", "shadcn-ui/ui", "hugohe3/ppt-master"];

function fmtStars(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : String(n);
}

function scoreColor(s: number) {
  return s >= 70 ? "text-good" : s >= 45 ? "text-warn" : "text-bad";
}

function parseError(e: Error | undefined) {
  if (!e) return null;
  try {
    return (JSON.parse(e.message) as { error?: string }).error ?? e.message;
  } catch {
    return e.message;
  }
}

export default function Compass() {
  const [lang, setLang] = useState<Lang>("zh");
  const [input, setInput] = useState("");
  const t = T[lang];

  const { messages, sendMessage, setMessages, status, error, stop } = useChat<CompassMessage>({
    transport: new DefaultChatTransport({ api: "/api/analyze" }),
  });
  const busy = status === "submitted" || status === "streaming";

  function run(value: string) {
    const v = value.trim();
    if (!v || busy) return;
    setInput(v);
    setMessages([]);
    sendMessage({ text: v }, { body: { lang } });
    const url = new URL(window.location.href);
    url.searchParams.set("repo", v.replace(/^https?:\/\/github\.com\//, ""));
    window.history.replaceState(null, "", url);
  }

  // Support shareable links: /?repo=owner/name
  useEffect(() => {
    const repo = new URLSearchParams(window.location.search).get("repo");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time start from a shared ?repo= link
    if (repo) run(repo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const view = useMemo(() => {
    const msg = messages.findLast((m) => m.role === "assistant");
    const steps = new Map<StepId, DataParts["step"]>();
    let original: Health | undefined;
    let overview: DataParts["overview"] | undefined;
    let candidates: Candidate[] | undefined;
    let meta: DataParts["meta"] | undefined;
    let report = "";
    for (const p of msg?.parts ?? []) {
      if (p.type === "data-step") steps.set(p.data.id, p.data);
      else if (p.type === "data-original") original = p.data;
      else if (p.type === "data-overview") overview = p.data;
      else if (p.type === "data-candidates") candidates = p.data;
      else if (p.type === "data-meta") meta = p.data;
      else if (p.type === "text") report += p.text;
    }
    return { steps, original, overview, candidates, meta, report };
  }, [messages]);

  const started = messages.length > 0;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:py-16">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link href="/" className="font-mono text-sm tracking-wide text-accent">
            ◈ repo-compass
          </Link>
          <h1 className="mt-3 text-2xl font-semibold leading-tight sm:text-3xl">{t.tagline}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{t.sub}</p>
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-md border border-line text-xs">
          {(["zh", "en"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2.5 py-1 ${lang === l ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}
            >
              {l === "zh" ? "中文" : "EN"}
            </button>
          ))}
        </div>
      </header>

      <form
        className="mt-8 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          run(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.placeholder}
          className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-4 py-3 font-mono text-sm outline-none focus:border-accent"
          autoFocus
        />
        {busy ? (
          <button type="button" onClick={stop} className="rounded-lg border border-line px-5 py-3 text-sm">
            {t.running} ■
          </button>
        ) : (
          <button type="submit" className="rounded-lg bg-accent px-5 py-3 text-sm font-medium text-white disabled:opacity-50" disabled={!input.trim()}>
            {t.go}
          </button>
        )}
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>{t.examples}:</span>
        {EXAMPLES.map((e) => (
          <button key={e} onClick={() => run(e)} disabled={busy} className="rounded-full border border-line px-2.5 py-0.5 font-mono hover:border-accent hover:text-ink">
            {e}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">{t.note}</p>

      {error && <div className="mt-6 rounded-lg border border-bad/40 bg-bad/5 px-4 py-3 text-sm text-bad">{parseError(error)}</div>}

      {started && (
        <section className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-6">
          {!view.meta?.cached && view.steps.size > 0 && (
            <ol className="grid gap-1.5 rounded-xl border border-line bg-panel p-4 text-sm">
              {STEP_ORDER.map((id) => {
                const s = view.steps.get(id);
                const icon = !s ? "○" : s.status === "done" ? "●" : s.status === "error" ? "✕" : "◐";
                return (
                  <li key={id} className={`flex gap-2 ${s ? "" : "text-muted/60"}`}>
                    <span className={`w-4 ${s?.status === "running" ? "animate-pulse text-accent" : s?.status === "done" ? "text-good" : ""}`}>{icon}</span>
                    <span>{t.steps[id]}</span>
                    {s?.detail && <span className="truncate text-muted">· {s.detail}</span>}
                  </li>
                );
              })}
            </ol>
          )}

          {view.original && <OriginalCard h={view.original} lang={lang} />}

          {view.overview && (
            <div className="rounded-xl border border-line bg-panel p-5">
              <p className="text-sm leading-6">{view.overview.summary}</p>
              {view.overview.upstream.length > 0 && (
                <p className="mt-3 text-xs text-muted">
                  {t.upstream}: <span className="font-mono text-ink">{view.overview.upstream.join(" · ")}</span>
                </p>
              )}
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {view.overview.facets.map((f) => (
                  <div key={f.label} className="rounded-lg border border-line px-3 py-2">
                    <div className="flex items-baseline gap-2">
                      <span className="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] uppercase text-accent">{f.type}</span>
                      <span className="text-sm font-medium">{f.label}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted">{f.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view.original && view.candidates && view.candidates.length > 0 && (
            <RelationGraph original={view.original} rows={view.candidates} lang={lang} />
          )}

          {view.report && (
            <article className="rounded-xl border border-line bg-panel p-5 sm:p-6">
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">{t.report}</h2>
              <div className="report text-[15px] break-words">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{view.report}</ReactMarkdown>
              </div>
            </article>
          )}

          {view.candidates && view.candidates.length > 0 && <CandidateTable rows={view.candidates} lang={lang} />}

          {view.meta && (view.meta.cached || view.meta.elapsedMs) && (
            <p className="text-xs text-muted">
              {view.meta.cached ? t.cached : `${t.took} ${Math.round((view.meta.elapsedMs ?? 0) / 1000)}s`} · {view.meta.model} · {view.meta.tierModel}
            </p>
          )}
        </section>
      )}

      <footer className="mt-16 border-t border-line pt-4 text-xs text-muted">
        <a className="hover:text-ink" href="https://github.com/exordor/repo-compass">
          github.com/exordor/repo-compass
        </a>{" "}
        · Vercel AI Gateway
      </footer>
    </main>
  );
}

function OriginalCard({ h, lang }: { h: Health; lang: Lang }) {
  const t = T[lang];
  const stats: [string, string][] = [
    ["★", fmtStars(h.stars)],
    [t.perDay, String(h.stars_per_day)],
    [t.push, t.days(h.pushed_days_ago)],
    ["license", h.license ?? "—"],
    ["issues close", h.issue_close_rate === null ? "—" : `${Math.round(h.issue_close_rate * 100)}%`],
    ["PR merge", h.pr_merge_rate === null ? "—" : `${Math.round(h.pr_merge_rate * 100)}%`],
  ];
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-5 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <a href={h.url} className="font-mono text-lg font-semibold hover:text-accent" target="_blank" rel="noreferrer">
          {h.repo}
        </a>
        {h.moved_from && <span className="ml-2 text-xs text-warn">← {h.moved_from}</span>}
        {h.archived && <span className="ml-2 text-xs text-bad">ARCHIVED</span>}
        <p className="mt-1 text-sm text-muted">{h.description}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {stats.map(([k, v]) => (
            <span key={k}>
              <span className="text-muted">{k}</span> <span className="font-mono">{v}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="text-center">
        <div className={`font-mono text-4xl font-semibold ${scoreColor(h.score)}`}>{h.score}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted">{t.score}</div>
      </div>
    </div>
  );
}

function CandidateTable({ rows, lang }: { rows: Candidate[]; lang: Lang }) {
  const t = T[lang];
  return (
    <div className="rounded-xl border border-line bg-panel">
      <h2 className="px-5 pt-4 text-xs font-medium uppercase tracking-wider text-muted">{t.candidates}</h2>
      <div className="overflow-x-auto">
        <table className="mt-2 w-full min-w-[640px] text-left text-xs">
          <thead className="text-muted">
            <tr className="border-b border-line">
              <th className="px-5 py-2 font-normal">{t.tier}</th>
              <th className="py-2 font-normal">repo</th>
              <th className="py-2 text-right font-normal">★</th>
              <th className="py-2 text-right font-normal">{t.perDay}</th>
              <th className="py-2 text-right font-normal">{t.push}</th>
              <th className="py-2 text-right font-normal">{t.score}</th>
              <th className="px-5 py-2 font-normal">{t.shared}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.repo} className="border-b border-line/60 align-top last:border-0">
                <td className="px-5 py-2.5 font-mono">{"◆".repeat(c.tier)}</td>
                <td className="py-2.5 pr-3">
                  <a href={c.url} target="_blank" rel="noreferrer" className="font-mono font-medium hover:text-accent">
                    {c.repo}
                  </a>
                  <span className="ml-1.5 rounded bg-accent-soft px-1 text-[10px] text-accent">{c.relation}</span>
                  {c.archived && <span className="ml-1 text-[10px] text-bad">ARCHIVED</span>}
                  <div className="mt-0.5 max-w-xs truncate text-muted">{c.description}</div>
                </td>
                <td className="py-2.5 text-right font-mono">{fmtStars(c.stars)}</td>
                <td className="py-2.5 text-right font-mono">{c.stars_per_day}</td>
                <td className="py-2.5 text-right font-mono">{t.days(c.pushed_days_ago)}</td>
                <td className={`py-2.5 text-right font-mono ${scoreColor(c.score)}`}>{c.score}</td>
                <td className="px-5 py-2.5 text-muted">{c.shared.join(" · ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
