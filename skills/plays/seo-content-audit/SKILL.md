---
name: seo-content-audit
description: >
  Comprehensive SEO footprint audit for any domain via DataForSEO — domain
  authority + ranking, top ranked keywords (100), top pages, backlink profile,
  competitor discovery, OnPage technical crawl, and keyword-gap vs the top
  competitor. Runs the full 7-phase pipeline through the Moatt proxy and writes
  a single report.json the model summarizes inline. Pay-per-use, ~$0.20–0.40
  per run.
tags: [seo]
---

# SEO Content Audit

The full SEO footprint audit. One bash recipe runs seven DataForSEO phases
through the Moatt proxy and writes a structured `report.json` covering
authority, rankings, content, backlinks, competitors, technical health, and
keyword-gap intel.

## Steps

This skill ships with an executable recipe — do NOT compose the curls yourself.

1. Confirm `$MOATT_API_KEY` and `$MOATT_API_BASE` are set in the Box env
   (they are, by default — sourced from `/tmp/moatt-env.sh`).
2. Run the recipe via `boxExec`. **Set `timeoutMs` to at least 300000 (5 min)**
   because the OnPage phase polls until the crawl finishes (up to ~4 min):

   ```bash
   bash /workspace/skills/seo-content-audit/scripts/run.sh <domain> [location_code] [language_code]
   ```

   Defaults: `location_code=2840` (US), `language_code=en`, crawl 50 pages.

3. The script prints the absolute path of `report.json` on its last line
   (e.g. `/workspace/home/projects/seo-content-audit-2026-05-20/stripe.com/report.json`).
4. Read that `report.json` with `boxRead` and render a structured executive
   summary inline. Cover, in this order:
   - **Snapshot**: domain rank, organic ETV, total keywords, backlinks, refdomains.
   - **Top performers**: top 5 ranked keywords (position, volume), top 3 pages.
   - **Technical health**: OnPage score, broken-link count, duplicate titles/metas,
     non-indexable pages. If `onpage_summary.skipped` is set, say so plainly.
   - **Competitors**: list the 3–5 discovered competitors with overlap intensity.
   - **Keyword gap**: top 10 keywords the top competitor ranks for that the
     target does NOT — these are the highest-leverage content opportunities.
   - **Recommendations**: 3 prioritized actions, tied directly to the data.
5. Always end by telling the user where the full JSON + per-phase files live
   so they can open them from the file panel.

If the script exits non-zero, surface the JSON error from stderr verbatim.
Do not retry by inventing curls or scraping.

## When to use this skill

- User wants the **full audit** with competitors, gap analysis, and
  prioritized recommendations → this skill.
- User wants a **lightweight snapshot** (rank + top keywords + opportunities)
  → use `seo-analyzer` instead, which is ~$0.10 cheaper and ~30s faster.
- User wants a **metrics-only deep dive** (backlinks + full keyword profile
  without competitor work) → use `seo-domain-analyzer`.

## How the recipe works

`scripts/run.sh` POSTs to the **Moatt DataForSEO proxy** — never directly to
`api.dataforseo.com`. The proxy contract is:

```
POST $MOATT_API_BASE/api/v1/proxy/dataforseo/rest
Authorization: Bearer $MOATT_API_KEY
Content-Type: application/json

{ "endpoint": "/v3/...", "body": [ { ...DFS task spec... } ] }
```

Phases (the script runs phase 1 first, then 2–7 sequentially while 1 is
crawling, then polls 1 for completion at the end):

| Phase | DFS endpoint | File |
|---|---|---|
| 1. OnPage technical crawl (async) | `/v3/on_page/task_post` + `/v3/on_page/summary/{id}` | `onpage_post.json`, `onpage_summary.json` |
| 2. Domain authority + rank | `/v3/dataforseo_labs/google/domain_rank_overview/live` | `domain_rank.json` |
| 3. Top ranked keywords (100) | `/v3/dataforseo_labs/google/ranked_keywords/live` | `ranked_keywords.json` |
| 4. Top pages (50) | `/v3/dataforseo_labs/google/relevant_pages/live` | `top_pages.json` |
| 5. Backlinks summary | `/v3/backlinks/summary/live` | `backlinks_summary.json` |
| 6. Competitor discovery (top 5) | `/v3/dataforseo_labs/google/competitors_domain/live` | `competitors.json` |
| 7. Keyword gap (vs top competitor) | `/v3/dataforseo_labs/google/domain_intersection/live` | `keyword_gap.json` |

All files plus a merged `report.json` land in
`/workspace/home/projects/seo-content-audit-YYYY-MM-DD/<domain>/`.

## Cost

| Phase | Est. cost (passthrough at 20% markup) |
|---|---|
| 1. OnPage crawl (50 pages) | ~$0.05 |
| 2. domain_rank_overview | ~$0.01 |
| 3. ranked_keywords (100) | ~$0.03 |
| 4. relevant_pages (50) | ~$0.02 |
| 5. backlinks summary | ~$0.02 |
| 6. competitors_domain | ~$0.01 |
| 7. domain_intersection | ~$0.03 |
| **Typical audit** | **~$0.20–0.30** |

Credits are deducted via the proxy automatically. Each phase fails-soft —
if e.g. OnPage doesn't finish in time, the report still ships with phases 2–7
and flags `onpage_summary.skipped`.

## Inputs

| Parameter | Required | Default | Description |
|---|---|---|---|
| domain | Yes | — | Domain to audit (e.g., `example.com`). Scheme + path stripped. |
| location_code | No | `2840` (US) | DFS location code |
| language_code | No | `en` | DFS language code |

Env overrides (rarely needed):
- `MAX_CRAWL_PAGES` (default 50) — bump for sites > 100 pages
- `ONPAGE_POLL_INTERVAL` (default 20s)
- `ONPAGE_MAX_POLLS` (default 12 — caps the wait at ~4 min)

Common location codes: `2840` US · `2826` UK · `2276` DE · `2036` AU · `2124` CA.

## What's in `report.json`

```json
{
  "domain": "stripe.com",
  "analysis_date": "2026-05-20",
  "location_code": 2840,
  "language_code": "en",
  "data_source": "dataforseo_via_moatt_proxy",
  "onpage_task_id": "07140248-...",
  "top_competitor": "adyen.com",
  "domain_rank_overview":          { ...raw DFS response... },
  "ranked_keywords":               { ...raw DFS response... },
  "top_pages":                     { ...raw DFS response... },
  "backlinks_summary":             { ...raw DFS response... },
  "competitors":                   { ...raw DFS response... },
  "keyword_gap_vs_top_competitor": { ...raw DFS response... },
  "onpage_summary":                { ...raw DFS response... }
}
```

DFS responses are kept verbatim — render summaries from the model, not from
post-processed fields.

Useful paths inside each block:

- `domain_rank_overview.tasks[0].result[0].metrics.organic` — `etv`, `count`, `pos_*`
- `ranked_keywords.tasks[0].result[0].items[]` — sorted by volume desc
- `top_pages.tasks[0].result[0].items[]` — `.page_address`, `.metrics.organic.etv`
- `backlinks_summary.tasks[0].result[0]` — `.backlinks`, `.referring_domains`, `.referring_main_domains`
- `competitors.tasks[0].result[0].items[]` — `.domain`, `.intersections`, `.full_domain_metrics`
- `keyword_gap_vs_top_competitor.tasks[0].result[0].items[]` — competitor-only keywords
- `onpage_summary.tasks[0].result[0]` — `.crawl_progress`, `.domain_info.checks`, `.page_metrics.onpage_score`, `.page_metrics.checks.*`

## Limits & fallbacks

- **No DFS credentials in the proxy?** Returns 503 `vendor_misconfigured`.
- **Insufficient Moatt credits?** Returns 402 `insufficient_credits` with the
  user's current balance. Tell them to top up at `/settings/billing`.
- **DFS Backlinks subscription not enabled?** Phase 5 (`/v3/backlinks/summary/live`)
  requires the DFS Backlinks API tier, which is sold separately from Labs,
  SERP, and OnPage. If the org's DataForSEO account doesn't include it, the
  phase returns an error and `backlinks_summary.json` will contain the
  upstream error message instead of metrics. The report still ships — the
  field is just empty. Surface this to the user as "backlink data isn't on
  your DFS plan" rather than treating it as a script failure.
- **OnPage crawl too slow?** Each poll is logged. If the crawl doesn't finish
  within `ONPAGE_MAX_POLLS * ONPAGE_POLL_INTERVAL`, the report still ships
  with `onpage_summary.skipped = "crawl_did_not_finish_in_time"` and the
  `task_id` so a follow-up call can fetch it later.
- **No top competitor identified?** Phase 7 (keyword gap) is skipped and
  flagged in the report.
- **Domain with zero ranked keywords?** Phases proceed but most blocks will
  be near-empty. Surface this to the user as "the domain is not yet indexed
  for measurable volume keywords" rather than reporting noise.

## Dependencies

- `curl` + `jq` (already installed in Upstash Box).
- `$MOATT_API_KEY` and `$MOATT_API_BASE` in env (already set by Box bootstrap).
- Pairs well with the upstream `seo-analyzer` skill (lighter, faster snapshot).
