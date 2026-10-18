import {
  experimental_decide as decide,
  gateway,
  generateText,
  isStepCount,
  Output,
  streamText,
  tool,
  toUIMessageStream,
  type UIMessageStreamWriter,
} from "ai";
import { z } from "zod";
import { getReadme, getRepo, getTreeAndManifests, health, searchRepos, type Health, type RepoMeta } from "./github";
import type { Candidate, CompassMessage, Facet, Overview, Relation, StepId, StepStatus } from "./types";

export const MODEL = process.env.ANALYSIS_MODEL ?? "anthropic/claude-sonnet-5.5";
export const TIER_MODEL = process.env.TIER_MODEL ?? "typesafe-ai/jev";

const MAX_VERIFY = 24;
const MAX_KEEP = 14;

type Writer = UIMessageStreamWriter<CompassMessage>;
export type Lang = "zh" | "en";
const LANG_NAME: Record<Lang, string> = { zh: "Simplified Chinese", en: "English" };

const STEP_LABEL: Record<StepId, string> = {
  fetch: "Reading README, manifests and file tree",
  facets: "Decomposing into facets",
  search: "Searching each facet",
  verify: "Verifying candidates via GitHub API",
  tier: "Grading relevance with Jev",
  health: "Computing health scores",
  report: "Writing the report",
};

function step(writer: Writer, id: StepId, status: StepStatus, detail?: string) {
  writer.write({ type: "data-step", id, data: { id, label: STEP_LABEL[id], status, detail } });
}

// ------------------------------------------------------------------ facets

const overviewSchema = z.object({
  summary: z.string().describe("Two or three sentences: what the repo is and who it is for. Plain prose."),
  upstream: z.array(z.string()).max(4).describe("The one to four frameworks, models or libraries doing the heavy lifting, read off manifests/README."),
  facets: z
    .array(
      z.object({
        type: z.enum(["intent", "route", "form", "ecosystem", "signature"]),
        label: z.string().describe("3-8 words"),
        description: z.string().describe("One sentence, concrete."),
        queries: z.array(z.string()).min(1).max(3).describe("Search queries using nouns a matching README would contain"),
      }),
    )
    .min(3)
    .max(6),
});

async function decompose(full: string, meta: RepoMeta, readme: string, tree: string[], manifests: { name: string; content: string }[]) {
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: overviewSchema }),
    instructions: `You analyse GitHub repositories. A repository is never just one thing: decompose it into 3-6 distinct facets, each a different answer to "what is this repo?".
Facet types: intent (problem, for whom), route (stack/architecture/pipeline — trust dependency manifests over marketing), form (library / CLI / agent skill / app / showcase / dataset / benchmark / tutorial…), ecosystem (platform or community it lives in), signature (the one unusual choice you'd mention first to a friend — always include one).
Merge facets that would pull the same candidates. For each facet write 1-3 search queries with the concrete nouns a matching README would contain (not abstract facet names). Write labels and descriptions in English.`,
    prompt: JSON.stringify({
      repo: full,
      description: meta.description,
      topics: meta.topics,
      language: meta.language,
      homepage: meta.homepage,
      top_level_files: tree,
      manifests,
      readme,
    }),
  });
  return output;
}

// ---------------------------------------------------------------- discovery

const discoverySchema = z.object({
  candidates: z
    .array(
      z.object({
        full_name: z.string().describe("owner/repo exactly as on GitHub"),
        found_by: z.string().describe("label of the facet whose search found it, or 'downstream' / 'upstream'"),
        why: z.string().describe("One line: what it is and why it may be related"),
      }),
    )
    .max(MAX_VERIFY),
});

async function discover(full: string, overview: z.infer<typeof overviewSchema>) {
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: discoverySchema }),
    stopWhen: isStepCount(10),
    tools: {
      web_search: gateway.tools.perplexitySearch({ maxResults: 8, maxTokensPerPage: 512, maxTokens: 6000 }),
      github_search: tool({
        description:
          "GitHub repository search (api.github.com/search/repositories). Supports qualifiers like topic:, language:, stars:>10, pushed:>2025-01-01. Returns full_name, description, stars, pushed_at.",
        inputSchema: z.object({ query: z.string() }),
        execute: async ({ query }) => searchRepos(query),
      }),
    },
    instructions: `You find GitHub repositories related to ${full}, one facet at a time.
Search each facet separately with its queries (send several tool calls in parallel). Use github_search for precise keyword/topic hits and small repos; use web_search (add "github" to the query) for awesome-lists, posts and newer repos. Also search for downstream work: "<repo name>" port / plugin / fork / based on.
Rules: only return real owner/repo names you saw in tool results — never from memory. Exclude ${full} itself. Skip mega-frameworks unless they are the upstream. Do not let one facet eat the list; aim for 2-5 per facet, ${MAX_VERIFY} total at most. Finish within a few rounds of searching.`,
    prompt: JSON.stringify({ repo: full, summary: overview.summary, upstream: overview.upstream, facets: overview.facets }),
  });
  return output.candidates;
}

// ------------------------------------------------------------------ tiering

const RELATIONS: Record<Relation | "unrelated", string> = {
  alternative: "Does the same job as the original; a user could pick one instead of the other",
  upstream: "The original builds on, wraps or depends on the candidate",
  downstream: "The candidate builds on, ports, forks or extends the original",
  peer: "Related through some facet but not a substitute",
  same_author: "Another project by the same owner",
  unrelated: "Only matches on a word; not actually related",
};

async function grade(original: Overview & { description: string | null }, cand: Health, readme: string, facets: Facet[]) {
  const questions = {
    same_job: {
      type: "boolean" as const,
      instructions:
        "Does CANDIDATE do the same job as ORIGINAL — same problem, same users, same kind of artefact — so that someone could choose one instead of the other?",
    },
    relation: {
      type: "choice" as const,
      instructions: "How is CANDIDATE related to ORIGINAL?",
      criteria: RELATIONS,
    },
    ...Object.fromEntries(
      facets.map((f, i) => [
        `f${i}`,
        {
          type: "boolean" as const,
          instructions: `Does CANDIDATE share this ${f.type} facet of ORIGINAL: "${f.label}" — ${f.description}`,
        },
      ]),
    ),
  };
  const state = JSON.stringify({
    ORIGINAL: { repo: original.repo, description: original.description, summary: original.summary, upstream: original.upstream },
    CANDIDATE: { repo: cand.repo, description: cand.description, topics: cand.topics, language: cand.language, readme_excerpt: readme },
  });
  const res = await decide({ model: gateway.decisionModel(TIER_MODEL), state, questions });
  const answers = res.answers as Record<string, { type: string; probability?: number; choice?: string }>;
  const shared = facets.filter((_, i) => (answers[`f${i}`]?.probability ?? 0) >= 0.5).map((f) => f.label);
  const sameJob = answers.same_job?.probability ?? 0;
  const relation = (answers.relation?.choice ?? "peer") as Relation | "unrelated";
  return { shared, sameJob, relation };
}

// Jev is conservative on same_job (clear substitutes land around 0.35-0.45),
// so its relation choice is trusted as a second signal.
function tierOf(shared: number, sameJob: number, relation: string): 0 | 1 | 2 | 3 {
  if (sameJob >= 0.5 || shared >= 3 || (relation === "alternative" && sameJob >= 0.3)) return 3;
  if (shared === 2 || relation === "alternative") return 2;
  if (shared === 1 || relation === "upstream" || relation === "downstream") return 1;
  return 0;
}

// ------------------------------------------------------------------- report

function reportInstructions(lang: Lang) {
  return `You write the final repo-compass report. Answer in ${LANG_NAME[lang]}; keep repo names, descriptions and numbers as they are.
Every comparative sentence must be traceable to a number or a README fact in the data you are given. Never add repos that are not in the data. Never invent numbers.
"Tier" (3 = shares 3+ facets or same job, 2 = two facets, 1 = one) was graded by a classifier; "shared" lists the facets it found shared; health columns come from the GitHub API.

Structure (markdown, headings as bold lines, no H1):
**Positioning** — one short paragraph: what the repo is, its facets, and a health line "created <date>, ★N (~M/day), last push <N days ago>, <open issues>, <license>". Say whether it is a launch (high ★/day, young) or an institution. Then: built on <upstream>; <downstream> builds on it, or no visible downstream yet.
**Alternatives — same job, different trade-offs** — 2-4 entries from candidates with relation "alternative" or same_job ≥ 0.5: "owner/repo (★N, last push …) — what it is. Better for: …. The original is better for: …". End with one sentence of verdict. If there are none, say so in one line.
**Closest — share most facets** — tier 3/2 entries: "owner/repo (★N) — one line. Shares: …. Differs: …".
**Same <facet>** groups for the remaining tier 1 entries, grouped by their shared facet.
Optional one-line **Upstream / Downstream** and **Same author** groups.
Optional closing observation at the pattern level if there is a real one.
Cap at 12 recommendations; cut rather than explain. Link every repo name as [owner/repo](https://github.com/owner/repo).
Write the section titles only in ${LANG_NAME[lang]} (no bilingual titles).`;
}

// --------------------------------------------------------------------- main

export type Result = { original: Health; overview: Overview; candidates: Candidate[]; report: string };

export async function analyze(full: string, lang: Lang, writer: Writer): Promise<Result> {
  // 1. Read the repo
  step(writer, "fetch", "running");
  const meta = await getRepo(full);
  if (!meta) throw new Error(`Repository ${full} not found (or GitHub API rate-limited).`);
  const canonical = meta.full_name;
  const [readme, { tree, manifests }, [original]] = await Promise.all([
    getReadme(canonical),
    getTreeAndManifests(canonical),
    health([{ requested: full, meta }]),
  ]);
  writer.write({ type: "data-original", id: "original", data: original });
  step(writer, "fetch", "done", `${manifests.map((m) => m.name).join(", ") || "no manifests"} · README ${readme.length} chars`);

  // 2. Facets
  step(writer, "facets", "running");
  const ov = await decompose(canonical, meta, readme, tree, manifests);
  const facets: Facet[] = ov.facets.map(({ type, label, description }) => ({ type, label, description }));
  const overview: Overview = { repo: canonical, summary: ov.summary, upstream: ov.upstream, facets };
  writer.write({ type: "data-overview", id: "overview", data: overview });
  step(writer, "facets", "done", `${facets.length} facets`);

  // 3. Search
  step(writer, "search", "running", "web + GitHub search per facet");
  const found = await discover(canonical, ov);
  step(writer, "search", "done", `${found.length} candidates`);

  // 4. Verify
  step(writer, "verify", "running");
  const seen = new Set([canonical.toLowerCase()]);
  const verified: { requested: string; meta: RepoMeta; found_by: string; why: string }[] = [];
  const metas = await Promise.all(
    found.slice(0, MAX_VERIFY).map(async (c) => ({ c, meta: await getRepo(c.full_name.replace(/^https?:\/\/github\.com\//, "")) })),
  );
  for (const { c, meta: m } of metas) {
    if (!m || seen.has(m.full_name.toLowerCase())) continue;
    seen.add(m.full_name.toLowerCase());
    verified.push({ requested: c.full_name, meta: m, found_by: c.found_by, why: c.why });
  }
  step(writer, "verify", "done", `${verified.length}/${found.length} exist and are unique`);

  // 5. Health first (cheap, and Jev needs the descriptions/topics)
  step(writer, "health", "running");
  const healths = await health(verified.map(({ requested, meta: m }) => ({ requested, meta: m })));
  step(writer, "health", "done");

  // 6. Tier with Jev
  step(writer, "tier", "running", TIER_MODEL);
  const owner = canonical.split("/")[0].toLowerCase();
  const graded = await Promise.all(
    healths.map(async (h, i) => {
      const v = verified[i];
      let g = { shared: [] as string[], sameJob: 0, relation: "peer" as Relation | "unrelated" };
      try {
        g = await grade({ ...overview, description: meta.description }, h, (await getReadme(h.repo, 2500)) || "", facets);
      } catch (e) {
        console.error("jev failed", h.repo, e);
        g.shared = [v.found_by];
      }
      // "upstream" needs evidence: the original must name the candidate in its README or upstream list.
      const name = h.repo.split("/")[1].toLowerCase();
      const namedByOriginal =
        readme.toLowerCase().includes(h.repo.toLowerCase()) || overview.upstream.some((u) => u.toLowerCase().includes(name));
      const relation: Relation =
        h.repo.split("/")[0].toLowerCase() === owner
          ? "same_author"
          : g.relation === "unrelated" || (g.relation === "upstream" && !namedByOriginal)
            ? "peer"
            : g.relation;
      const tier = g.relation === "unrelated" && g.shared.length === 0 ? 0 : tierOf(g.shared.length, g.sameJob, relation);
      return { ...h, tier, relation, shared: g.shared, same_job: Math.round(g.sameJob * 100) / 100, found_by: v.found_by, why: v.why } satisfies Candidate;
    }),
  );
  const candidates = graded
    .filter((c) => c.tier > 0 && !c.fork)
    .sort((a, b) => b.tier - a.tier || b.score - a.score)
    .slice(0, MAX_KEEP);
  writer.write({ type: "data-candidates", id: "candidates", data: candidates });
  step(writer, "tier", "done", `${candidates.length} kept, ${graded.length - candidates.length} dropped`);

  // 7. Report
  step(writer, "report", "running");
  const result = streamText({
    model: MODEL,
    instructions: reportInstructions(lang),
    prompt: JSON.stringify({ original, overview, candidates }),
  });
  writer.merge(toUIMessageStream({ stream: result.stream, sendStart: false, sendFinish: false }));
  const report = await result.text;
  step(writer, "report", "done");

  return { original, overview, candidates, report };
}
