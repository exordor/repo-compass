import type { UIMessage } from "ai";
import type { Health } from "./github";

export type StepId = "fetch" | "facets" | "search" | "verify" | "tier" | "health" | "report";
export type StepStatus = "running" | "done" | "error";

export type Facet = {
  type: "intent" | "route" | "form" | "ecosystem" | "signature";
  label: string;
  description: string;
};

export type Relation = "alternative" | "upstream" | "downstream" | "peer" | "same_author";

export type Candidate = Health & {
  tier: 0 | 1 | 2 | 3;
  relation: Relation;
  shared: string[]; // facet labels Jev judged as shared
  same_job: number; // Jev probability
  found_by: string;
  why: string;
};

export type Overview = {
  repo: string;
  summary: string;
  upstream: string[];
  facets: Facet[];
};

export type DataParts = {
  step: { id: StepId; label: string; status: StepStatus; detail?: string };
  original: Health;
  overview: Overview;
  candidates: Candidate[];
  meta: { cached: boolean; model: string; tierModel: string; elapsedMs?: number };
};

export type CompassMessage = UIMessage<never, DataParts>;
