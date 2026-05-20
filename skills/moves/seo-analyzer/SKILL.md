---
name: seo-analyzer
description: >
  General-purpose SEO analyzer for any domain via DataForSEO — authority + ranking
  snapshot, top ranked keywords, content opportunities (keyword_ideas), and live
  competitive SERP for the top keyword. The lightweight first-look
  "analyze SEO for {domain}" entry point. Pay-per-use, ~$0.06–0.15 per run via
  the Moatt DataForSEO proxy.
tags: [seo]
---

# SEO Analyzer

The lightweight, first-look SEO analyzer. Point it at any domain to get a
snapshot — **authority + ranking**, **content opportunities**, and **competitive
SERP threats** — in a single run. Powered by DataForSEO via the Moatt proxy
(metered against your Moatt credits, no DFS account required).

## Steps

This skill ships with an executable recipe — do NOT compose the curls yourself.

1. Confirm `$MOATT_API_KEY` and `$MOATT_API_BASE` are set in the Box env
   (they are, by default — sourced from `/tmp/moatt-env.sh`).
2. Run the recipe via `boxExec`:

   ```bash
   bash /workspace/skills/seo-analyzer/scripts/run.sh <domain> [location_code] [language_code]
   ```

   Defaults: `location_code=2840` (US), `language_code=en`.

3. The script prints the absolute path of `report.json` on its last line
   (e.g. `/workspace/home/projects/seo-analyzer-2026-05-20/stripe.com/report.json`).
4. Read that `report.json` with `boxRead`, then render a tight summary inline
   — keep it under ~300 words. Highlight: domain rank, organic traffic estimate,
   top 5 ranked keywords with position + volume, 3 best content opportunities,
   and who's dominating the SERP for the top keyword.
5. Tell the user where the full JSON lives (the path from step 3) so they can
   open it from the file panel.

If the script exits non-zero, surface the JSON error from stderr verbatim
to the user. Do not retry by inventing curls.

## When to use this skill

- User asks "analyze SEO for {domain}" with no further specifics → this skill.
- User wants the *deep-dive* metrics-only view (backlinks, rank verification,
  full keyword profile) → use `seo-domain-analyzer` instead.
- User wants the *full audit report* with content inventory, gap matrices,
  and recommendations → use `seo-content-audit` instead.

This skill is the entry point. The other two are deeper specialists.

## How the recipe works

`scripts/run.sh` POSTs to the **Moatt DataForSEO proxy** — never directly to
`api.dataforseo.com`. The proxy contract is:

```
POST $MOATT_API_BASE/api/v1/proxy/dataforseo/rest
Authorization: Bearer $MOATT_API_KEY
Content-Type: application/json

{ "endpoint": "/v3/...", "body": [ { ...DFS task spec... } ] }
```

The script runs four DFS phases against this proxy:

| Phase | DFS endpoint | Output |
|---|---|---|
| 1. Authority + rank | `/v3/dataforseo_labs/google/domain_rank_overview/live` | `domain_rank.json` |
| 2. Top ranked keywords (50) | `/v3/dataforseo_labs/google/ranked_keywords/live` | `ranked_keywords.json` |
| 3. Content opportunities | `/v3/dataforseo_labs/google/keyword_ideas/live` (seeded from phase 2) | `keyword_ideas.json` |
| 4. Competitive SERP | `/v3/serp/google/organic/live/advanced` (top keyword from phase 2) | `serp_top_keyword.json` |

All four files plus a merged `report.json` land in
`/workspace/home/projects/seo-analyzer-YYYY-MM-DD/<domain>/`.

## Cost

| Phase | DFS endpoint | Est. cost (passthrough at 20% markup) |
|---|---|---|
| 1. domain_rank_overview | live | ~$0.01 |
| 2. ranked_keywords (top 50) | live | ~$0.02 |
| 3. keyword_ideas (100) | live | ~$0.02 |
| 4. serp/organic/advanced (1 kw) | live | ~$0.002 |
| **Typical run** | | **~$0.06–0.10** |

Credits are deducted via the proxy automatically. Each phase fails-soft: if a
domain has no ranked keywords, phases 3 and 4 are skipped (not retried) and
the report flags `"skipped":"no_seed_keywords"` for those sections.

## Inputs

| Parameter | Required | Default | Description |
|---|---|---|---|
| domain | Yes | — | Domain to analyze (e.g., `example.com`). Scheme + path are stripped. |
| location_code | No | `2840` (US) | DFS location code |
| language_code | No | `en` | DFS language code |

Common location codes: `2840` US · `2826` UK · `2276` DE · `2036` AU · `2124` CA.

## What's in `report.json`

```json
{
  "domain": "stripe.com",
  "analysis_date": "2026-05-20",
  "location_code": 2840,
  "language_code": "en",
  "data_source": "dataforseo_via_moatt_proxy",
  "domain_rank_overview": { ...raw DFS response... },
  "ranked_keywords":      { ...raw DFS response... },
  "keyword_ideas":        { ...raw DFS response... },
  "competitive_serp":     { ...raw DFS response... }
}
```

DFS responses are kept verbatim — render summaries from the model, not from
post-processed fields. The richest paths:

- `domain_rank_overview.tasks[0].result[0].metrics.organic` — `etv`, `count`,
  `pos_1`, `pos_2_3`, `pos_4_10`
- `ranked_keywords.tasks[0].result[0].items[]` — `keyword_data.keyword`,
  `ranked_serp_element.serp_item.rank_absolute`,
  `keyword_data.keyword_info.search_volume`,
  `keyword_data.keyword_info.cpc`
- `keyword_ideas.tasks[0].result[0].items[]` — same shape as ranked, filter
  against ranked keywords to surface net-new opportunities
- `competitive_serp.tasks[0].result[0].items[]` — top 20 SERP positions for
  the top-seed keyword (find target's rank + dedupe competitors)

## Limits & fallbacks

- **No DFS credentials in the proxy?** The proxy returns a 503
  `vendor_misconfigured` — the recipe surfaces this to the model verbatim.
- **Insufficient Moatt credits?** The proxy returns a 402
  `insufficient_credits` with the user's current balance. Tell the user to
  top up at `/settings/billing`.
- **Domain has zero ranked keywords?** Phases 3 + 4 are skipped automatically
  — the report still contains phases 1 + 2 and flags the rest.
- **Regulated verticals (weapons / drugs / adult)** — KD/CPC fields will be
  `null` from DFS. Surface the limitation rather than failing.

## Dependencies

- `curl` + `jq` (already installed in Upstash Box).
- `$MOATT_API_KEY` and `$MOATT_API_BASE` in env (already set by Box bootstrap).
- For a deeper view: escalate to `seo-domain-analyzer` (adds backlinks +
  top pages + full competitor metrics) or `seo-content-audit` (adds content
  inventory + gap matrices + prioritized recommendations).
