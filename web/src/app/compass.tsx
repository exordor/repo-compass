"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type DeepPartial } from "ai";
import { useEffect, useMemo, useState } from "react";
import type { Report } from "@/lib/analyze";
import type { Health } from "@/lib/github";
import type { Candidate, CompassMessage, DataParts, Overview, StepId } from "@/lib/types";
import RelationGraph from "./graph";
import { fmtStars, REL_COLOR, scoreColor, STAGE_COLOR, T, type Lang, type Stage } from "./i18n";

const STEP_ORDER: StepId[] = ["fetch", "facets", "search", "verify", "health", "tier", "report"];
const EXAMPLES = ["karpathy/nanochat", "ollama/ollama", "shadcn-ui/ui", "hugohe3/ppt-master"];

type Notes = Record<string, { what?: string; differs?: string; pickIt?: string; pickOriginal?: string }>;

function parseError(e: Error | undefined, t: (typeof T)[Lang]) {
  if (!e) return null;
  try {
    const body = JSON.parse(e.message) as { error?: string; code?: keyof (typeof T)[Lang]["errors"] };
    return (body.code && t.errors[body.code]) || body.error || t.errorFallback;
  } catch {
    return e.message || t.errorFallback;
  }
}

export default function Compass() {
  const [lang, setLang] = useState<Lang>("zh");
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const t = T[lang];

  const { messages, sendMessage, setMessages, status, error, stop } = useChat<CompassMessage>({
    transport: new DefaultChatTransport({ api: "/api/analyze" }),
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [busy]);

  function run(value: string) {
    const v = value.trim();
    if (!v || busy) return;
    setInput(v);
    setSelected(null);
    setMessages([]);
    setStartedAt(Date.now());
    setNow(Date.now());
    sendMessage({ text: v }, { body: { lang } });
    const url = new URL(window.location.href);
    url.searchParams.set("repo", v.replace(/^https?:\/\/github\.com\//, ""));
    window.history.replaceState(null, "", url);
  }

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
    let overview: Overview | undefined;
    let candidates: Candidate[] | undefined;
    let report: DeepPartial<Report> | undefined;
    let meta: DataParts["meta"] | undefined;
    for (const p of msg?.parts ?? []) {
      if (p.type === "data-step") steps.set(p.data.id, p.data);
      else if (p.type === "data-original") original = p.data;
      else if (p.type === "data-overview") overview = p.data;
      else if (p.type === "data-candidates") candidates = p.data;
      else if (p.type === "data-report") report = p.data;
      else if (p.type === "data-meta") meta = p.data;
    }
    const notes: Notes = {};
    for (const a of report?.alternatives ?? []) if (a?.repo) notes[a.repo] = { ...notes[a.repo], what: a.what, pickIt: a.pickIt, pickOriginal: a.pickOriginal };
    for (const c of report?.closest ?? []) if (c?.repo) notes[c.repo] = { ...notes[c.repo], what: c.what, differs: c.differs };
    for (const n of report?.notes ?? []) if (n?.repo) notes[n.repo] = { ...notes[n.repo], what: n.what };
    return { steps, original, overview, candidates, report, meta, notes };
  }, [messages]);

  const started = messages.length > 0;
  const byRepo = new Map((view.candidates ?? []).map((c) => [c.repo, c]));
  const selectedRow = selected ? byRepo.get(selected) : undefined;

  function focusOnMap(repo: string) {
    setSelected(repo);
    document.getElementById("map")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen">
      {started ? (
        <header className="sticky top-0 z-10 border-b border-rule bg-paper/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3 sm:px-8">
            <button
              onClick={() => {
                if (busy) stop();
                setMessages([]);
                setSelected(null);
                setInput("");
                window.history.replaceState(null, "", "/");
              }}
              className="text-lg font-semibold tracking-tight text-sea"
            >
              repo-compass
            </button>
            <SearchForm compact {...{ input, setInput, run, busy, stop, t }} />
            <LangToggle lang={lang} setLang={setLang} />
          </div>
        </header>
      ) : (
        <section className="contours">
          <div className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold tracking-tight text-sea">repo-compass</span>
              <LangToggle lang={lang} setLang={setLang} />
            </div>
            <h1 className="mt-20 max-w-3xl text-[2.4rem] font-semibold leading-[1.15] tracking-tight sm:mt-28 sm:text-[3.4rem]">{t.headline}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">{t.sub}</p>
            <div className="mt-10 max-w-3xl">
              <SearchForm {...{ input, setInput, run, busy, stop, t }} />
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="text-muted">{t.try}</span>
                {EXAMPLES.map((e) => (
                  <button
                    key={e}
                    onClick={() => run(e)}
                    className="rounded-full border border-rule bg-panel px-4 py-1.5 font-mono text-[15px] transition-colors hover:border-sea hover:text-sea"
                  >
                    {e}
                  </button>
                ))}
              </div>
              <p className="mt-6 text-[15px] leading-7 text-muted">{t.note}</p>
            </div>
          </div>
        </section>
      )}

      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        {error && (
          <div role="alert" className="mt-8 rounded-xl border-l-4 border-bad bg-panel px-6 py-5 text-lg">
            {parseError(error, t)}
          </div>
        )}

        {started && (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-16 py-10 sm:py-14">
            {busy && !view.meta?.cached && <Progress steps={view.steps} t={t} seconds={Math.max(0, Math.round((now - startedAt) / 1000))} />}

            {view.original && <Verdict h={view.original} report={view.report} t={t} />}

            {view.candidates && view.report?.alternatives !== undefined && (
              <Alternatives
                original={view.original!}
                items={(view.report.alternatives ?? []).flatMap((a) => {
                  const row = a?.repo ? byRepo.get(a.repo) : undefined;
                  return row && a ? [{ row, a }] : [];
                })}
                done={!busy}
                t={t}
                onLocate={focusOnMap}
              />
            )}

            {view.original && view.candidates && view.candidates.length > 0 && (
              <section id="map" className="scroll-mt-24">
                <SectionTitle title={t.map} sub={t.mapSub} />
                <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
                  <div className="rounded-3xl bg-panel p-5 sm:p-7">
                    <RelationGraph original={view.original} rows={view.candidates} lang={lang} selected={selected} onSelect={setSelected} />
                  </div>
                  <aside className="lg:sticky lg:top-24 lg:self-start" aria-live="polite">
                    {selectedRow ? (
                      <CandidateDetail row={selectedRow} note={view.notes[selectedRow.repo]} t={t} onBack={() => setSelected(null)} />
                    ) : (
                      <OriginalDetail overview={view.overview} report={view.report} t={t} />
                    )}
                  </aside>
                </div>
              </section>
            )}

            {view.report?.observation && !busy && (
              <p className="max-w-3xl border-l-4 border-sea pl-6 text-xl leading-9">{view.report.observation}</p>
            )}

            {view.candidates && view.candidates.length > 0 && !busy && (
              <AllCandidates rows={view.candidates} notes={view.notes} t={t} onLocate={focusOnMap} />
            )}

            {view.meta && !busy && (
              <p className="text-[15px] text-muted">
                {view.meta.cached ? t.cached : t.took(Math.round((view.meta.elapsedMs ?? 0) / 1000))}. {view.meta.model}, {view.meta.tierModel}
              </p>
            )}
          </div>
        )}
      </main>

      <footer className="mx-auto mt-10 max-w-6xl border-t border-rule px-5 py-8 text-[15px] text-muted sm:px-8">
        <a className="underline-offset-4 hover:text-ink hover:underline" href="https://github.com/exordor/repo-compass">
          github.com/exordor/repo-compass
        </a>
      </footer>
    </div>
  );
}

type TT = (typeof T)[Lang];

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="ml-auto flex overflow-hidden rounded-full border border-rule bg-panel text-[15px]" role="group" aria-label="Language">
      {(["zh", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`px-4 py-1.5 ${lang === l ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
        >
          {l === "zh" ? "中文" : "EN"}
        </button>
      ))}
    </div>
  );
}

function SearchForm({
  compact,
  input,
  setInput,
  run,
  busy,
  stop,
  t,
}: {
  compact?: boolean;
  input: string;
  setInput: (v: string) => void;
  run: (v: string) => void;
  busy: boolean;
  stop: () => void;
  t: TT;
}) {
  return (
    <form
      className={`flex gap-3 ${compact ? "order-last w-full sm:order-none sm:w-auto sm:flex-1" : "flex-col sm:flex-row"}`}
      onSubmit={(e) => {
        e.preventDefault();
        run(input);
      }}
    >
      <label className="sr-only" htmlFor={compact ? "repo-compact" : "repo"}>
        {t.placeholder}
      </label>
      <input
        id={compact ? "repo-compact" : "repo"}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={t.placeholder}
        autoFocus={!compact}
        className={`min-w-0 flex-1 rounded-2xl border border-rule bg-panel font-mono outline-none transition-colors focus:border-sea ${
          compact ? "px-4 py-2.5 text-base" : "px-6 py-5 text-xl"
        }`}
      />
      {busy ? (
        <button type="button" onClick={stop} className={`rounded-2xl border border-rule bg-panel font-medium ${compact ? "px-5 py-2.5" : "px-8 py-5 text-lg"}`}>
          {t.stop}
        </button>
      ) : (
        <button
          type="submit"
          disabled={!input.trim()}
          className={`rounded-2xl bg-sea font-medium text-white transition-opacity disabled:opacity-40 ${compact ? "px-5 py-2.5" : "px-8 py-5 text-lg"}`}
        >
          {t.analyze}
        </button>
      )}
    </form>
  );
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h2 className="text-[1.75rem] font-semibold tracking-tight">{title}</h2>
      {sub && <p className="mt-2 text-lg text-muted">{sub}</p>}
    </div>
  );
}

function Progress({ steps, t, seconds }: { steps: Map<StepId, DataParts["step"]>; t: TT; seconds: number }) {
  const current = [...STEP_ORDER].reverse().find((id) => steps.get(id)?.status === "running") ?? STEP_ORDER.find((id) => !steps.has(id)) ?? "fetch";
  const doneCount = STEP_ORDER.filter((id) => steps.get(id)?.status === "done").length;
  return (
    <section aria-live="polite" className="rounded-3xl bg-panel p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-2xl font-semibold">{t.steps[current]}…</p>
        <p className="text-muted">{t.elapsed(seconds)}</p>
      </div>
      <ol className="mt-6 grid grid-cols-7 gap-1.5" aria-label={`${doneCount}/7`}>
        {STEP_ORDER.map((id) => {
          const s = steps.get(id)?.status;
          return (
            <li key={id} title={t.steps[id]} className="h-2 overflow-hidden rounded-full bg-rule">
              <span
                className={`block h-full rounded-full ${s === "running" ? "animate-pulse" : ""}`}
                style={{ width: s ? "100%" : "0%", background: s === "done" ? "var(--sea)" : "var(--alt)" }}
              />
            </li>
          );
        })}
      </ol>
      <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-[15px] text-muted">
        {STEP_ORDER.filter((id) => steps.get(id)?.status === "done").map((id) => (
          <li key={id}>
            ✓ {t.steps[id]}
            {steps.get(id)?.detail ? `（${steps.get(id)!.detail}）` : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}

function HealthDial({ score, t }: { score: number; t: TT }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center" title={t.healthHint}>
      <svg width="112" height="112" viewBox="0 0 112 112" role="img" aria-label={`${t.health} ${score}`}>
        <circle cx="56" cy="56" r={r} fill="none" stroke="var(--rule)" strokeWidth="9" />
        <circle
          cx="56"
          cy="56"
          r={r}
          fill="none"
          stroke={scoreColor(score)}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${(c * score) / 100} ${c}`}
          transform="rotate(-90 56 56)"
        />
        <text x="56" y="64" textAnchor="middle" fontSize="28" fontWeight="700" fill="var(--ink)">
          {score}
        </text>
      </svg>
      <span className="mt-1 text-[15px] text-muted">{t.health}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-[15px] text-muted">{label}</div>
    </div>
  );
}

function Verdict({ h, report, t }: { h: Health; report?: DeepPartial<Report>; t: TT }) {
  const stage = report?.stage as Stage | undefined;
  return (
    <section className="grid gap-8 rounded-3xl bg-panel p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <a href={h.url} target="_blank" rel="noreferrer" className="break-all font-mono text-[1.6rem] font-semibold underline-offset-4 hover:underline">
            {h.repo}
          </a>
          {stage && t.stage[stage] && (
            <span className="rounded-full px-3 py-1 text-[15px] font-medium text-white" style={{ background: STAGE_COLOR[stage] }}>
              {t.stage[stage]}
            </span>
          )}
          {h.archived && <span className="rounded-full bg-bad px-3 py-1 text-[15px] text-white">{t.archived}</span>}
        </div>
        {h.description && <p className="mt-3 max-w-3xl text-lg leading-8 text-muted">{h.description}</p>}

        <div className="mt-8 max-w-3xl">
          {report?.verdict ? (
            <p className="text-[1.45rem] font-medium leading-[1.7]">{report.verdict}</p>
          ) : (
            <div className="space-y-3" aria-hidden>
              <div className="h-6 w-full animate-pulse rounded bg-rule/60" />
              <div className="h-6 w-2/3 animate-pulse rounded bg-rule/60" />
            </div>
          )}
        </div>

        <div className="mt-10 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label={t.stars} value={fmtStars(h.stars)} />
          <Stat label={t.perDay} value={`+${h.stars_per_day}`} />
          <Stat label={t.pushed} value={t.days(h.pushed_days_ago)} />
          <Stat label={t.license} value={h.license ?? "—"} />
        </div>
      </div>
      <div className="flex items-start lg:pt-2">
        <HealthDial score={h.score} t={t} />
      </div>
    </section>
  );
}

function MiniStats({ row, t }: { row: Candidate; t: TT }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-muted">
      <span>★ {fmtStars(row.stars)}</span>
      <span>
        {t.pushed} {t.days(row.pushed_days_ago)}
      </span>
      <span>
        {t.health} <b style={{ color: scoreColor(row.score) }}>{row.score}</b>
      </span>
    </div>
  );
}

function Alternatives({
  items,
  done,
  t,
  onLocate,
}: {
  original: Health;
  items: { row: Candidate; a: NonNullable<NonNullable<DeepPartial<Report>["alternatives"]>[number]> }[];
  done: boolean;
  t: TT;
  onLocate: (repo: string) => void;
}) {
  return (
    <section>
      <SectionTitle title={t.alternatives} sub={t.alternativesSub} />
      {items.length === 0 && done ? (
        <p className="mt-6 max-w-3xl text-lg leading-8 text-muted">{t.noAlternatives}</p>
      ) : (
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2">
          {items.map(({ row, a }) => (
            <article key={row.repo} className="flex flex-col rounded-3xl bg-panel p-6 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <a href={row.url} target="_blank" rel="noreferrer" className="break-all font-mono text-xl font-semibold underline-offset-4 hover:underline">
                  {row.repo}
                </a>
                <button onClick={() => onLocate(row.repo)} className="shrink-0 rounded-full border border-rule px-3 py-1 text-[14px] text-muted hover:border-sea hover:text-sea">
                  {t.map}
                </button>
              </div>
              <div className="mt-2">
                <MiniStats row={row} t={t} />
              </div>
              {a.what && <p className="mt-4 text-lg leading-8">{a.what}</p>}
              <dl className="mt-5 grid gap-4">
                {a.pickIt && (
                  <div className="border-l-4 pl-4" style={{ borderColor: "var(--alt)" }}>
                    <dt className="text-[15px] font-medium text-muted">{t.pickIt}</dt>
                    <dd className="mt-1 text-[17px] leading-7">{a.pickIt}</dd>
                  </div>
                )}
                {a.pickOriginal && (
                  <div className="border-l-4 border-sea pl-4">
                    <dt className="text-[15px] font-medium text-muted">{t.pickOriginal}</dt>
                    <dd className="mt-1 text-[17px] leading-7">{a.pickOriginal}</dd>
                  </div>
                )}
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function OriginalDetail({ overview, report, t }: { overview?: Overview; report?: DeepPartial<Report>; t: TT }) {
  if (!overview) return null;
  return (
    <div className="rounded-3xl bg-panel p-6 sm:p-7">
      <h3 className="text-xl font-semibold">{t.whatItIs}</h3>
      <p className="mt-3 text-[17px] leading-8">{report?.positioning || overview.summary}</p>
      {overview.upstream.length > 0 && (
        <div className="mt-5">
          <p className="text-[15px] text-muted">{t.builtOn}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {overview.upstream.map((u) => (
              <li key={u} className="rounded-full bg-sea-soft px-3 py-1 text-[15px] text-sea">
                {u}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-6 text-[15px] text-muted">{t.facets}</p>
      <ul className="mt-2 divide-y divide-rule">
        {overview.facets.map((f) => (
          <li key={f.label} className="py-3">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[17px] font-medium">
                {f.label}
                <span className="text-muted transition-transform group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="mt-2 text-[15px] leading-7 text-muted">{f.description}</p>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CandidateDetail({ row, note, t, onBack }: { row: Candidate; note?: Notes[string]; t: TT; onBack: () => void }) {
  return (
    <div className="rounded-3xl bg-panel p-6 sm:p-7">
      <button onClick={onBack} className="text-[15px] text-muted underline-offset-4 hover:text-ink hover:underline">
        ← {t.backToOriginal}
      </button>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full px-3 py-1 text-[14px] font-medium text-white" style={{ background: REL_COLOR[row.relation] }}>
          {t.relation[row.relation]}
        </span>
        {row.archived && <span className="rounded-full bg-bad px-3 py-1 text-[14px] text-white">{t.archived}</span>}
      </div>
      <h3 className="mt-3 break-all font-mono text-xl font-semibold">{row.repo}</h3>
      <p className="mt-3 text-[17px] leading-8">{note?.what || row.description}</p>

      {row.shared.length > 0 && (
        <div className="mt-5">
          <p className="text-[15px] text-muted">{t.shares}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {row.shared.map((s) => (
              <li key={s} className="rounded-full bg-sea-soft px-3 py-1 text-[15px] text-sea">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
      {(note?.differs || note?.pickIt) && (
        <div className="mt-5">
          <p className="text-[15px] text-muted">{t.differs}</p>
          <p className="mt-1 text-[17px] leading-7">{note.differs || note.pickIt}</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-5 border-t border-rule pt-5">
        <Stat label={t.stars} value={fmtStars(row.stars)} />
        <Stat label={t.pushed} value={t.days(row.pushed_days_ago)} />
        <Stat label={t.health} value={String(row.score)} />
        <Stat label={t.license} value={row.license ?? "—"} />
      </div>

      <a
        href={row.url}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex rounded-2xl bg-ink px-5 py-3 font-medium text-paper transition-opacity hover:opacity-85"
      >
        {t.openOnGithub}
      </a>
    </div>
  );
}

function AllCandidates({ rows, notes, t, onLocate }: { rows: Candidate[]; notes: Notes; t: TT; onLocate: (repo: string) => void }) {
  return (
    <details className="group rounded-3xl bg-panel">
      <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5 text-xl font-semibold sm:px-8">
        {t.all(rows.length)}
        <span className="text-2xl text-muted transition-transform group-open:rotate-45" aria-hidden>
          +
        </span>
      </summary>
      <ul className="divide-y divide-rule border-t border-rule">
        {rows.map((r) => (
          <li key={r.repo} className="grid gap-2 px-6 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-8">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => onLocate(r.repo)} className="break-all text-left font-mono text-[17px] font-semibold underline-offset-4 hover:underline">
                  {r.repo}
                </button>
                <span className="flex items-center gap-1.5 text-[15px] text-muted">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: REL_COLOR[r.relation] }} />
                  {t.relation[r.relation]}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-[15px] leading-7 text-muted">{notes[r.repo]?.what || r.description}</p>
            </div>
            <MiniStats row={r} t={t} />
          </li>
        ))}
      </ul>
    </details>
  );
}
