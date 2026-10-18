# repo-compass web

A web version of the [`github-similar-repos`](../skills/github-similar-repos/SKILL.md) skill: paste a GitHub URL, get positioning, alternatives and health.

Pipeline (`src/lib/analyze.ts`):

1. Read README, manifests and top-level tree via the GitHub API.
2. Decompose into 3–6 facets (Claude Sonnet 5.5 via Vercel AI Gateway).
3. Search each facet with AI Gateway's Perplexity search tool and GitHub repository search.
4. Verify every candidate against `api.github.com/repos/<owner>/<repo>`.
5. Health score, ported from `scripts/repo_health.py` (issue/PR counts via one GraphQL query when `GITHUB_TOKEN` is set).
6. Relevance tier per candidate with `typesafe-ai/jev` (boolean per facet, same-job, relation).
7. Stream the report.

## Environment

| Variable | Required | |
|---|---|---|
| `AI_GATEWAY_API_KEY` | locally | On Vercel, OIDC authenticates the gateway automatically |
| `GITHUB_TOKEN` | recommended | Public-read token; raises rate limits and enables close/merge rates |
| `ANALYSIS_MODEL` | no | Default `anthropic/claude-sonnet-5.5` |
| `TIER_MODEL` | no | Default `typesafe-ai/jev` |
| `RATE_LIMIT_PER_DAY` | no | New analyses per IP per day, default 5. Cached repos (24h) don't count |

```bash
pnpm install
pnpm dev
```

Deploy on Vercel with Root Directory set to `web`.
