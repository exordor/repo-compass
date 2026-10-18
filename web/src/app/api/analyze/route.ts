import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { getCache, ipAddress } from "@vercel/functions";
import { analyze, MODEL, TIER_MODEL, type Lang, type Result } from "@/lib/analyze";
import { parseRepo } from "@/lib/github";
import type { CompassMessage } from "@/lib/types";

export const maxDuration = 300;

const DAILY_LIMIT = Number(process.env.RATE_LIMIT_PER_DAY ?? 2);
const CACHE_TTL = 24 * 3600;

const cache = getCache({ namespace: "repo-compass" });

function lastUserText(messages: CompassMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === "user");
  return last?.parts.map((p) => (p.type === "text" ? p.text : "")).join("") ?? "";
}

function error(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { messages: CompassMessage[]; lang?: Lang };
  const lang: Lang = body.lang === "en" ? "en" : "zh";
  const full = parseRepo(lastUserText(body.messages));
  if (!full) return error(400, "Enter a GitHub URL like https://github.com/owner/repo");

  const key = `result:v2:${full.toLowerCase()}:${lang}`;
  const cached = (await cache.get(key).catch(() => null)) as Result | null;

  if (!cached) {
    // Approximate per-IP daily budget; runtime cache is regional, which is fine for abuse control.
    const ip = ipAddress(req) ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const rlKey = `rl:${ip}:${new Date().toISOString().slice(0, 10)}`;
    const used = Number((await cache.get(rlKey).catch(() => 0)) ?? 0);
    if (used >= DAILY_LIMIT)
      return error(429, `Daily limit reached (${DAILY_LIMIT} new analyses per IP). Cached repos still work.`);
    await cache.set(rlKey, used + 1, { ttl: 26 * 3600 }).catch(() => {});
  }

  const started = Date.now();
  const stream = createUIMessageStream<CompassMessage>({
    execute: async ({ writer }) => {
      writer.write({ type: "data-meta", id: "meta", data: { cached: !!cached, model: MODEL, tierModel: TIER_MODEL } });
      if (cached) {
        writer.write({ type: "data-original", id: "original", data: cached.original });
        writer.write({ type: "data-overview", id: "overview", data: cached.overview });
        writer.write({ type: "data-candidates", id: "candidates", data: cached.candidates });
        writer.write({ type: "text-start", id: "report" });
        writer.write({ type: "text-delta", id: "report", delta: cached.report });
        writer.write({ type: "text-end", id: "report" });
        return;
      }
      const result = await analyze(full, lang, writer);
      writer.write({
        type: "data-meta",
        id: "meta",
        data: { cached: false, model: MODEL, tierModel: TIER_MODEL, elapsedMs: Date.now() - started },
      });
      await cache.set(key, result, { ttl: CACHE_TTL, tags: [full.toLowerCase()] }).catch(() => {});
    },
    onError: (e) => (e instanceof Error ? e.message : String(e)),
  });

  return createUIMessageStreamResponse({ stream, keepAliveMs: 15_000 });
}
