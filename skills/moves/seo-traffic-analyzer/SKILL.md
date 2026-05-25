---
name: seo-traffic-analyzer
description: >
  Reverse-engineer how a domain wins organic traffic via DataForSEO: multi-month
  trends, top traffic-driving pages and keywords, and competitive share-of-traffic
  shifts. Pay-per-use (~$0.08-0.15 per domain) with no monthly subscription.
  WebSearch fallback when DFS credentials are missing.
tags: [competitive-intel, seo]
---

# SEO Traffic Analyzer

## Setup

Read your credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json doesn't exist, tell the user to run: `npx moatt login`

All endpoints use Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`

Track *how* a domain's organic traffic moves over time and *why*: which pages drive it, which keywords convert, and how its share of voice shifts against named competitors. Built on DataForSEO's historical Labs endpoints — the longitudinal companion to `seo-domain-analyzer`'s static snapshot.

**Why DataForSEO over scraped alternatives:** ToS-clean (direct data agreements with Google/Bing), JSON-stable, $0.08-0.15 per domain at pay-per-use rates, no $999/mo subscription floor. Historical rank data reaches back ~24 months — fragile SimilarWeb / web.archive.org scrapes stay as a backup path only.

**How this differs from `seo-domain-analyzer`:** That one is a static *snapshot* — current rankings, current backlinks. This one is the *longitudinal* and *competitive* lens: trend deltas month over month, page-level traffic attribution, and head-to-head share shifts against a competitor set. Run them together for the full picture.

## Prerequisites

**Recommended (production):** DataForSEO credentials
- Sign up at [dataforseo.com](https://dataforseo.com) → API → copy login + password
- Set `MOATT_API_KEY` — routes DFS through Moatt's proxy and meters usage on your platform credits

**Fallback (no DFS):** WebSearch + WebFetch
- No keys needed, but trend data is approximate and SimilarWeb's free tier is rate-limited
- Use only when DFS credentials aren't available; results are signal-grade, not decision-grade

## Quick Start

```bash
# Basic traffic analysis (12 months of history by default)
python3 $HOME/skills/moves/seo-traffic-analyzer/scripts/analyze_traffic.py --domain "example.com"

# Compare against named competitors
python3 $HOME/skills/moves/seo-traffic-analyzer/scripts/analyze_traffic.py \
  --domain "example.com" \
  --competitors "competitor1.com,competitor2.com,competitor3.com"

# Custom history window
python3 $HOME/skills/moves/seo-traffic-analyzer/scripts/analyze_traffic.py --domain "example.com" --months 24

# Confirm live rank on high-stakes keywords
python3 $HOME/skills/moves/seo-traffic-analyzer/scripts/analyze_traffic.py \
  --domain "example.com" \
  --keywords "cloud cost optimization,reduce aws bill,finops tools"

# Save output
python3 $HOME/skills/moves/seo-traffic-analyzer/scripts/analyze_traffic.py --domain "example.com" --output traffic-trends.json
```

## Inputs

| Parameter | Required | Default | Description |
|---|---|---|---|
| domain | Yes | — | Domain to analyze (e.g., `example.com`) |
| competitors | No | auto-discovered | Comma-separated competitor domains for share-of-traffic comparison |
| keywords | No | auto-inferred from top traffic | Keywords to verify live rank on |
| months | No | `12` | Months of historical trend data to pull (max ~24) |
| location | No | `2840` (US) | DFS location code (use country-level for B2B) |
| language | No | `en` | DFS language code |
| top-pages-limit | No | `25` | How many top traffic-driving pages to pull |
| top-keywords-limit | No | `100` | How many top traffic-driving keywords to pull |
| output | No | stdout | Path to save JSON output |

## Cost (DFS path)

| Phase | DFS Endpoint | Est. Cost |
|---|---|---|
| Current overview | `dataforseo_labs/google/domain_rank_overview/live` | ~$0.01 |
| **Historical trend (12mo)** | `dataforseo_labs/google/historical_rank_overview/live` | ~$0.02 |
| Top traffic-driving keywords | `dataforseo_labs/google/ranked_keywords/live` | ~$0.02 |
| Top traffic-driving pages | `dataforseo_labs/google/relevant_pages/live` | ~$0.01 |
| Competitor discovery | `dataforseo_labs/google/competitors_domain/live` | ~$0.01 |
| Competitor history (per competitor) | `dataforseo_labs/google/historical_rank_overview/live` | ~$0.02 |
| Live rank verification (per keyword) | `serp/google/organic/live/advanced` | ~$0.002 |
| **Typical solo run** | | **~$0.08-0.10** |
| **With 3 competitors compared** | | **~$0.15-0.20** |

Versus a SimilarWeb/Ahrefs scrape path: ~$0.30-1.00 per domain, fragile, ToS-violating, no API guarantee.

## Process

### Phase 1: Current Traffic Baseline

Lock the present-day reference point against which deltas will be measured.

```
POST /v3/dataforseo_labs/google/domain_rank_overview/live
{
  "target": "example.com",
  "location_code": 2840,
  "language_code": "en"
}
```

Extract:
- `metrics.organic.etv` — current estimated organic traffic value (proxy for monthly visits)
- `metrics.organic.count` — current ranked keyword count
- `metrics.organic.pos_1` / `pos_2_3` / `pos_4_10` — current ranking distribution
- `metrics.organic.estimated_paid_traffic_cost` — equivalent paid spend value of the organic traffic

### Phase 2: Historical Traffic Trend (the core differentiator)

Pull month-by-month traffic and ranking data — the unique value of this skill versus the static `seo-domain-analyzer`.

```
POST /v3/dataforseo_labs/google/historical_rank_overview/live
{
  "target": "example.com",
  "location_code": 2840,
  "language_code": "en",
  "date_from": "2025-05-01",
  "date_to": "2026-05-01"
}
```

Returns one record per month. Per record extract:
- `year` / `month` — period
- `metrics.organic.etv` — monthly traffic value
- `metrics.organic.count` — ranked keyword count
- `metrics.organic.pos_1` / `pos_2_3` / `pos_4_10` — top-position counts

Compute the trend metrics:
- **MoM delta** — `(etv[n] − etv[n−1]) / etv[n−1]`
- **YoY delta** — `(etv[latest] − etv[12mo_ago]) / etv[12mo_ago]`
- **Growth phase classification** — accelerating / steady-growth / plateau / decline (based on a 3-month rolling slope)
- **Inflection points** — months where MoM delta exceeded ±20% (often signals a content launch, algorithm hit, or migration)

### Phase 3: Top Traffic-Driving Pages

Identify which URLs actually carry the organic traffic — the reverse-engineering core.

```
POST /v3/dataforseo_labs/google/relevant_pages/live
{
  "target": "example.com",
  "location_code": 2840,
  "language_code": "en",
  "limit": 25,
  "order_by": ["metrics.organic.etv,desc"]
}
```

Per page extract:
- `page_address` — URL
- `metrics.organic.etv` — page-level traffic value
- `metrics.organic.count` — keywords this page ranks for
- `metrics.organic.pos_1` / `pos_2_3` — top-rank counts on this page

Then bucket each page by inferred content type (blog post, comparison page, pricing, product/feature, glossary, case study, tool/calculator). Traffic concentration reveals the playbook: if 70% of organic traffic comes from comparison pages, that's the acquisition strategy.

### Phase 4: Top Traffic-Driving Keywords

Pull the keywords that actually move the needle — sorted by traffic contribution, not just volume.

```
POST /v3/dataforseo_labs/google/ranked_keywords/live
{
  "target": "example.com",
  "location_code": 2840,
  "language_code": "en",
  "limit": 100,
  "order_by": ["ranked_serp_element.serp_item.etv,desc"]
}
```

Per keyword extract:
- `keyword_data.keyword` — the term
- `ranked_serp_element.serp_item.rank_absolute` — current position
- `keyword_data.keyword_info.search_volume` — monthly volume
- `keyword_data.keyword_info.cpc` — commercial intent proxy
- `keyword_data.keyword_info.keyword_difficulty` — KD score
- `ranked_serp_element.serp_item.etv` — per-keyword traffic value
- `ranked_serp_element.serp_item.url` — landing URL

Then bucket keywords by intent (brand / category / problem / comparison / informational) with a simple rule pass on the keyword string. The intent mix tells you whether the domain wins on brand demand, category demand, or pain-point search.

### Phase 5: Competitor Discovery & Share-of-Traffic Comparison

Find who competes for the same keyword universe, then compare trajectories.

**Step 5a — discover the competitor set (skipped if the user provides `--competitors`):**

```
POST /v3/dataforseo_labs/google/competitors_domain/live
{
  "target": "example.com",
  "location_code": 2840,
  "language_code": "en",
  "limit": 10
}
```

Returns competing domains ranked by keyword overlap with current ETV inline.

**Step 5b — pull the historical trend for each competitor (in parallel):**

For each competitor (provided or top-5 discovered), fire the same `historical_rank_overview/live` call as Phase 2.

**Step 5c — compute the share-of-traffic shift:**

For each month, calculate:
- `share[d, m] = etv[d, m] / sum(etv[all_d, m])`
- `share_delta_yoy = share[d, latest] − share[d, 12mo_ago]`

Flag domains with `|share_delta_yoy| > 0.05` (5%) as "gaining share" or "losing share" in the cohort. This is the signal that's invisible in any single static snapshot.

### Phase 6: Live Rank Verification (optional)

DFS Labs trend data refreshes weekly. For the high-stakes keywords from Phase 4, verify the live SERP position right now:

```
POST /v3/serp/google/organic/live/advanced
{
  "keyword": "cloud cost optimization",
  "location_code": 2840,
  "language_code": "en",
  "depth": 20
}
```

Per keyword extract: the target's actual current position, ranking URL, top-10 SERP, featured snippet / PAA / AI overview presence. Run this surgically on 5-20 keywords, not the full 100.

## Output

### JSON

```json
{
  "domain": "example.com",
  "analysis_date": "2026-05-08",
  "data_source": "dataforseo",
  "window_months": 12,
  "current_metrics": {
    "organic_etv": 28500,
    "organic_keywords": 1240,
    "ranking_distribution": {
      "pos_1": 14,
      "pos_2_3": 87,
      "pos_4_10": 318
    }
  },
  "trend": {
    "etv_history": [
      { "year": 2025, "month": 5, "etv": 18200, "keywords": 980 },
      { "year": 2025, "month": 6, "etv": 19500, "keywords": 1010 },
      { "year": 2026, "month": 5, "etv": 28500, "keywords": 1240 }
    ],
    "mom_delta_latest": 0.06,
    "yoy_delta": 0.57,
    "growth_phase": "accelerating",
    "inflection_points": [
      { "year": 2025, "month": 11, "mom_delta": 0.34, "note": "likely content launch or algorithm tailwind" }
    ]
  },
  "top_pages": [
    {
      "url": "https://example.com/blog/reduce-aws-costs",
      "etv": 3200,
      "keywords": 45,
      "inferred_type": "blog/guide",
      "share_of_domain_traffic": 0.11
    }
  ],
  "top_keywords": [
    {
      "keyword": "cloud cost optimization",
      "position": 4,
      "search_volume": 1900,
      "etv": 1450,
      "cpc": 8.20,
      "keyword_difficulty": 42,
      "url": "https://example.com/blog/cloud-cost-optimization-guide",
      "intent_bucket": "category"
    }
  ],
  "intent_mix": {
    "brand": 0.18,
    "category": 0.42,
    "problem": 0.27,
    "comparison": 0.08,
    "informational": 0.05
  },
  "competitive_share": [
    {
      "domain": "example.com",
      "current_etv": 28500,
      "share_now": 0.21,
      "share_12mo_ago": 0.15,
      "share_delta_yoy": 0.06,
      "trajectory": "gaining"
    },
    {
      "domain": "competitor1.com",
      "current_etv": 45000,
      "share_now": 0.34,
      "share_12mo_ago": 0.41,
      "share_delta_yoy": -0.07,
      "trajectory": "losing"
    }
  ],
  "live_rank_verification": [
    {
      "keyword": "cloud cost optimization",
      "verified_position": 4,
      "url": "https://example.com/blog/cloud-cost-optimization-guide",
      "serp_features": ["people_also_ask", "featured_snippet"],
      "ai_overview_present": true
    }
  ]
}
```

### Markdown summary (also generated)

```markdown
# SEO Traffic Analysis: example.com
**Date:** 2026-05-08 · **Window:** 12 months · **Data:** DataForSEO

## Trend Snapshot
| Metric | Value |
|---|---|
| Current Monthly Organic Traffic (ETV) | ~28,500 |
| YoY Delta | +57% |
| MoM Delta (latest) | +6% |
| Growth Phase | Accelerating |
| Ranked Keywords | 1,240 (vs 980 a year ago) |

## Inflection Points
- **2025-11:** +34% MoM — likely content launch or algorithm tailwind

## Top Traffic-Driving Pages
| # | URL | ETV | Keywords | Type | % of Domain Traffic |
|---|---|---|---|---|---|
| 1 | /blog/reduce-aws-costs | 3,200 | 45 | blog/guide | 11% |
| 2 | … | … | … | … | … |

## Acquisition Strategy (Intent Mix)
- Category keywords: 42%
- Problem keywords: 27%
- Brand keywords: 18%
- Comparison keywords: 8%
- Informational: 5%

→ Strategy read: category-led acquisition with strong problem-aware pull. Comparison gap.

## Competitive Share-of-Traffic
| Domain | ETV Now | Share Now | Share 12mo Ago | Δ YoY | Trajectory |
|---|---|---|---|---|---|
| example.com | 28.5K | 21% | 15% | +6pp | Gaining |
| competitor1.com | 45K | 34% | 41% | -7pp | Losing |
| competitor2.com | … | … | … | … | … |

## Live Rank Verification (high-stakes keywords)
| Keyword | Position | URL | SERP Features |
|---|---|---|---|
| cloud cost optimization | #4 | /blog/cloud-cost-optimization-guide | PAA, featured snippet, AI overview |
```

## Tips

- **Run Phases 1-5 in parallel.** Every Labs call is independent — fire concurrently to cut latency from ~25s to ~5s. Phase 5b's per-competitor history calls are the biggest parallelization win.
- **12 months is the sweet spot.** YoY deltas are the most actionable signal. Pulling 24 months adds noise without proportional insight unless you're investigating a specific historical event.
- **Use the intent mix to read strategy.** A domain with 70% category-keyword traffic is playing a different game than one with 70% problem-keyword traffic. The intent breakdown predicts what content investments will compound.
- **Share-of-traffic is the single most useful exec slide.** Stakeholders care about "are we gaining or losing ground vs named rivals" — Phase 5c answers that with data, not vibes.
- **Run Phase 6 surgically.** Live SERP scrapes cost $0.002 each — fine for 5-20 high-stakes keywords. Skip for the 100-keyword `ranked_keywords` view (Phase 4 already has that).
- **Combine with `seo-domain-analyzer`** for the full picture — that skill gives the static snapshot (backlinks, current full keyword list); this one gives the longitudinal trend and competitive share view.
- **DFS location codes matter.** Use `2840` for US, `2826` for UK, `2276` for DE, `2392` for JP. For B2B SaaS, default to US unless the client serves a specific region.
- **Detect content launches retroactively.** Inflection points (>20% MoM) almost always trace to a specific page going live — cross-reference with `relevant_pages` ETV history per URL.

## Limits & Fallbacks

- **Historical depth:** DFS history reliably reaches ~24 months. For older trends, no clean API alternative exists; use a SimilarWeb scrape with caveats.
- **Weekly index refresh:** DFS Labs data refreshes ~weekly. Run Phase 6 (live SERP) for any keyword where the position is decision-critical today.
- **Regulated verticals:** Google Ads keyword data (KD/CPC) is filtered for weapons/drugs/adult — KD scores will be `null` in those niches; flag in output.
- **Geographic depth:** Strong in English-language markets (US/UK/AU/CA). APAC/LATAM is thinner — validate coverage if targeting.
- **DFS index size:** 2.8T live backlinks vs Ahrefs 35T historical. Backlink trend gaps are possible for obscure niches; use `seo-domain-analyzer` with the Apify-Ahrefs fallback for those.

## Free Fallback (no DFS credentials)

If `MOATT_API_KEY` is unset, fall back to web-only signals. Results are *signal-grade, not decision-grade* — flag this clearly in the output.

- **Indexation proxy:** `site:[domain]` WebSearch — approximate page count
- **Traffic proxy:** WebFetch `https://www.similarweb.com/website/[domain]/` — free-tier monthly visits and source mix (rate-limited)
- **History proxy:** WebFetch `https://web.archive.org/web/*/[domain]` — snapshot frequency loosely correlates with traffic importance
- **Ranking probes:** WebSearch each target keyword and scan the top-10 results for the domain — gives presence/absence on page 1, not an exact position
- **Backlink proxy:** WebSearch `"[domain]" -site:[domain]` and bucket the sources

This path is reserved for cost-zero scenarios; don't use it for client deliverables.

## Dependencies

- Python 3.8+ with `requests`
- `MOATT_API_KEY` env var (routes through Moatt's DataForSEO proxy)
- Optional: WebSearch + WebFetch tools (free fallback path only)
