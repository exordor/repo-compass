"use client";

import { useState } from "react";
import type { Health } from "@/lib/github";
import type { Candidate, Relation } from "@/lib/types";

// Radial map: the original in the centre, one sector per relation, ring
// distance by relevance tier (closer = more facets shared), node size by stars.

const W = 820;
const H = 600;
const CX = W / 2;
const CY = H / 2;
const RING: Record<number, number> = { 3: 130, 2: 190, 1: 245 };

// Clockwise from the top, so upstream sits above and downstream below.
const ORDER: Relation[] = ["upstream", "alternative", "downstream", "same_author", "peer"];

const COLOR: Record<Relation, string> = {
  upstream: "#2563eb",
  alternative: "var(--accent)",
  downstream: "#16a34a",
  peer: "#8b8578",
  same_author: "#9333ea",
};

const LABEL: Record<"zh" | "en", Record<Relation, string>> = {
  zh: { upstream: "上游", alternative: "替代", downstream: "下游", peer: "同类", same_author: "同作者" },
  en: { upstream: "upstream", alternative: "alternative", downstream: "downstream", peer: "peer", same_author: "same author" },
};

const nodeR = (stars: number) => 4 + 2.6 * Math.log10(stars + 1);
const short = (s: string) => (s.length > 22 ? `${s.slice(0, 21)}…` : s);

export default function RelationGraph({ original, rows, lang }: { original: Health; rows: Candidate[]; lang: "zh" | "en" }) {
  const [hover, setHover] = useState<string | null>(null);

  const ordered = ORDER.flatMap((rel) => rows.filter((r) => r.relation === rel).sort((a, b) => b.tier - a.tier || b.stars - a.stars));
  const n = Math.max(ordered.length, 1);
  const slot = (2 * Math.PI) / n;
  // Centre the first group on 12 o'clock.
  const firstGroup = ordered.filter((r) => r.relation === ordered[0]?.relation).length;
  const start = -Math.PI / 2 - ((firstGroup - 1) * slot) / 2;

  const nodes = ordered.map((r, i) => {
    const a = start + i * slot;
    // Alternate ring offset inside a ring so neighbouring labels don't collide.
    const rr = RING[r.tier] + (i % 2 === 0 ? 0 : 16);
    return { r, a, x: CX + rr * Math.cos(a), y: CY + rr * Math.sin(a) };
  });

  const present = ORDER.filter((rel) => rows.some((r) => r.relation === rel));
  const active = hover ? rows.find((r) => r.repo === hover) : undefined;

  return (
    <div className="rounded-xl border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">{lang === "zh" ? "关系图" : "Relationship map"}</h2>
        <div className="flex flex-wrap gap-3 text-[11px] text-muted">
          {present.map((rel) => (
            <span key={rel} className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR[rel] }} />
              {LABEL[lang][rel]}
            </span>
          ))}
          <span>{lang === "zh" ? "· 越近越相关 · 圆越大 ★ 越多" : "· closer = more relevant · bigger = more ★"}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block w-full min-w-[560px] max-w-[820px]" role="img" aria-label="relationship map">
          {[3, 2, 1].map((t) => (
            <g key={t}>
              <circle cx={CX} cy={CY} r={RING[t] + 8} fill="none" stroke="var(--line)" strokeDasharray="3 5" />
              <text x={CX + 4} y={CY - RING[t] - 12} fontSize="10" fill="var(--muted)">
                {"◆".repeat(t)}
              </text>
            </g>
          ))}

          {nodes.map(({ r, x, y }) => (
            <line
              key={`e-${r.repo}`}
              x1={CX}
              y1={CY}
              x2={x}
              y2={y}
              stroke={COLOR[r.relation]}
              strokeWidth={r.tier === 3 ? 2 : r.tier === 2 ? 1.4 : 1}
              strokeDasharray={r.tier === 1 ? "4 4" : undefined}
              opacity={hover && hover !== r.repo ? 0.15 : 0.55}
            />
          ))}

          <g>
            <circle cx={CX} cy={CY} r={nodeR(original.stars) + 8} fill="var(--ink)" />
            <text x={CX} y={CY + nodeR(original.stars) + 26} textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--ink)" className="font-mono">
              {original.repo}
            </text>
            <text x={CX} y={CY + nodeR(original.stars) + 42} textAnchor="middle" fontSize="11" fill="var(--muted)">
              ★{original.stars.toLocaleString()} · {lang === "zh" ? "健康分" : "health"} {original.score}
            </text>
          </g>

          {nodes.map(({ r, a, x, y }) => {
            const right = Math.cos(a) >= 0;
            const dim = hover && hover !== r.repo;
            return (
              <a key={r.repo} href={r.url} target="_blank" rel="noreferrer">
                <g
                  onMouseEnter={() => setHover(r.repo)}
                  onMouseLeave={() => setHover(null)}
                  opacity={dim ? 0.3 : 1}
                  style={{ cursor: "pointer" }}
                >
                  <circle cx={x} cy={y} r={nodeR(r.stars)} fill={COLOR[r.relation]} stroke="var(--panel)" strokeWidth="2" />
                  <text
                    x={x + (right ? 1 : -1) * (nodeR(r.stars) + 5)}
                    y={y + 4}
                    textAnchor={right ? "start" : "end"}
                    fontSize="12"
                    fill="var(--ink)"
                    className="font-mono"
                  >
                    {short(r.repo.split("/")[1])}
                  </text>
                  <title>{`${r.repo} · ★${r.stars} · ${LABEL[lang][r.relation]} · tier ${r.tier}\n${r.description ?? ""}`}</title>
                </g>
              </a>
            );
          })}
        </svg>
      </div>

      <div className="min-h-10 px-5 pb-4 text-xs text-muted">
        {active ? (
          <span>
            <span className="font-mono text-ink">{active.repo}</span> · ★{active.stars.toLocaleString()} · {LABEL[lang][active.relation]} ·{" "}
            {"◆".repeat(active.tier)} · {active.shared.join(" · ") || "—"}
          </span>
        ) : lang === "zh" ? (
          "悬停查看详情，点击打开仓库"
        ) : (
          "Hover for details, click to open the repo"
        )}
      </div>
    </div>
  );
}
