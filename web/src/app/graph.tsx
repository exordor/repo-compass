"use client";

import type { Health } from "@/lib/github";
import type { Candidate, Relation } from "@/lib/types";
import { REL_COLOR, T, type Lang } from "./i18n";

// Radial map: the original in the centre, one sector per relation, ring
// distance by relevance tier (closer = more related), node size by stars.

const CX = 410;
const CY = 300;
const RING: Record<number, number> = { 3: 135, 2: 195, 1: 250 };

// Clockwise from the top, so upstream sits above and things built on it below.
const ORDER: Relation[] = ["upstream", "alternative", "downstream", "same_author", "peer"];

const nodeR = (stars: number) => 5 + 2.8 * Math.log10(stars + 1);
const short = (s: string) => (s.length > 20 ? `${s.slice(0, 19)}…` : s);
const halo = { paintOrder: "stroke", stroke: "var(--panel)", strokeWidth: 5, strokeLinejoin: "round" } as const;

type Props = {
  original: Health;
  rows: Candidate[];
  lang: Lang;
  selected: string | null;
  onSelect: (repo: string | null) => void;
};

export default function RelationGraph({ original, rows, lang, selected, onSelect }: Props) {
  const t = T[lang];
  const ordered = ORDER.flatMap((rel) => rows.filter((r) => r.relation === rel).sort((a, b) => b.tier - a.tier || b.stars - a.stars));
  const slot = (2 * Math.PI) / Math.max(ordered.length, 1);
  const firstGroup = ordered.filter((r) => r.relation === ordered[0]?.relation).length;
  const start = -Math.PI / 2 - ((firstGroup - 1) * slot) / 2;

  const nodes = ordered.map((r, i) => {
    const a = start + i * slot;
    const rr = RING[r.tier] + (i % 2 === 0 ? 0 : 18);
    return { r, a, x: CX + rr * Math.cos(a), y: CY + rr * Math.sin(a) };
  });

  const tiers = [3, 2, 1].filter((tier) => rows.some((r) => r.tier === tier));
  const outer = Math.max(...tiers.map((tier) => RING[tier])) + 18;
  const padX = 170;
  const padY = 44;
  const vb = [CX - outer - padX, CY - outer - padY, 2 * (outer + padX), 2 * (outer + padY) + 24];
  const present = ORDER.filter((rel) => rows.some((r) => r.relation === rel));

  return (
    <div>
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[15px] text-muted">
        {present.map((rel) => (
          <li key={rel} className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: REL_COLOR[rel] }} />
            {t.relation[rel]}
          </li>
        ))}
      </ul>

      <svg viewBox={vb.join(" ")} className="mt-2 block w-full" role="group" aria-label={t.map}>
        {tiers.map((tier) => (
          <circle key={tier} cx={CX} cy={CY} r={RING[tier] + 9} fill="none" stroke="var(--rule)" strokeDasharray="2 6" />
        ))}

        {nodes.map(({ r, x, y }) => {
          const on = selected === r.repo;
          return (
            <line
              key={`e-${r.repo}`}
              x1={CX}
              y1={CY}
              x2={x}
              y2={y}
              stroke={REL_COLOR[r.relation]}
              strokeWidth={on ? 3 : r.tier === 3 ? 1.8 : 1.2}
              strokeDasharray={r.tier === 1 ? "4 5" : undefined}
              opacity={selected && !on ? 0.18 : 0.5}
            />
          );
        })}

        <g
          role="button"
          tabIndex={0}
          aria-label={original.repo}
          onClick={() => onSelect(null)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(null)}
          style={{ cursor: "pointer" }}
        >
          <circle cx={CX} cy={CY} r={nodeR(original.stars) + 10} fill="var(--sea)" />
          <circle cx={CX} cy={CY} r={nodeR(original.stars) + 16} fill="none" stroke="var(--sea)" strokeOpacity={selected ? 0 : 0.35} strokeWidth="2" />
          <text x={CX} y={CY + nodeR(original.stars) + 36} textAnchor="middle" fontSize="17" fontWeight="600" fill="var(--ink)" className="font-mono" {...halo}>
            {original.repo}
          </text>
        </g>

        {nodes.map(({ r, a, x, y }) => {
          const right = Math.cos(a) >= 0;
          const on = selected === r.repo;
          const rad = nodeR(r.stars);
          return (
            <g
              key={r.repo}
              role="button"
              tabIndex={0}
              aria-pressed={on}
              aria-label={`${r.repo}, ${t.relation[r.relation]}`}
              onClick={() => onSelect(on ? null : r.repo)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(on ? null : r.repo);
                }
              }}
              opacity={selected && !on ? 0.4 : 1}
              style={{ cursor: "pointer" }}
            >
              {/* larger invisible hit target */}
              <circle cx={x} cy={y} r={Math.max(rad + 8, 16)} fill="transparent" />
              <circle cx={x} cy={y} r={rad} fill={REL_COLOR[r.relation]} stroke={on ? "var(--ink)" : "var(--panel)"} strokeWidth={on ? 3 : 2} />
              <text
                x={x + (right ? 1 : -1) * (rad + 7)}
                y={y + 5}
                textAnchor={right ? "start" : "end"}
                fontSize="14.5"
                fontWeight={on ? 700 : 500}
                fill="var(--ink)"
                className="font-mono"
                {...halo}
              >
                {short(r.repo.split("/")[1])}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
