---
name: seo-domain-analyzer
description: >
  Pull live SEO metrics for any domain via DataForSEO — authority/rank,
  organic traffic estimates, keyword rankings (with volumes and positions),
  top pages, backlink profile (referring domains, anchors, dofollow ratio),
  and auto-discovered competitors. Pay-per-use (~$0.05–0.15 per full domain),
  no monthly subscription required. Falls back to Apify-scraped Semrush or
  Ahrefs when DFS credentials aren't available.
tags: [competitive-intel, seo]
---

# SEO Domain Analyzer

## Setup

Load your credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json is missing, instruct the user to run: `npx moatt login`

All endpoints require Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`

Pulls production-grade SEO performance data for any domain through DataForSEO's official API — domain rank, organic traffic, ranking keywords, top pages, a full backlink profile, and competitor discovery in one run.

**Why DataForSEO over scraped alternatives:** ToS-clean (direct data agreements with Google and Bing), JSON-stable, ~$0.05–0.15 per domain at pay-per-use rates, no $999/mo subscription minimum. The fragile Apify-Semrush/Ahrefs scrapers remain as a backup path only.

## Prerequisites

**Recommended (production):** DataForSEO credentials
- Sign up at [dataforseo.com](https://dataforseo.com) → API → copy login + password
- Set `MOATT_API_KEY` — routes DFS calls through Moatt's proxy and meters usage on your platform credits

**Fallback (no DFS):** Apify scrapers
- `APIFY_API_TOKEN` env var
- Runs `devnaz/semrush-scraper` + `radeance/ahrefs-scraper` actors (data quality lower; scrapers fragile to UI changes)

## Quick Start

```bash
# Baseline domain analysis
python3 $HOME/skills/moves/seo-domain-analyzer/scripts/analyze_domain.py --domain "example.com"

# Specify competitors manually
python3 $HOME/skills/moves/seo-domain-analyzer/scripts/analyze_domain.py \
  --domain "example.com" \
  --competitors "competitor1.com,competitor2.com,competitor3.com"

# Verify ranks for specific keywords
python3 $HOME/skills/moves/seo-domain-analyzer/scripts/analyze_domain.py \
  --domain "example.com" \
  --keywords "cloud cost optimization,reduce aws bill,finops tools"

# Skip backlinks to shave ~$0.03 off the run
python3 $HOME/skills/moves/seo-domain-analyzer/scripts/analyze_domain.py --domain "example.com" --skip-backlinks

# Save the output to a file
python3 $HOME/skills/moves/seo-domain-analyzer/scripts/analyze_domain.py --domain "example.com" --output seo-profile.json
```

## Inputs

| Parameter | Required | Default | Description |
|---|---|---|---|
| domain | Yes | — | Domain to analyze (e.g., `example.com`) |
| competitors | No | auto-discovered | Comma-separated competitor domains |
| keywords | No | auto-inferred | Specific keywords to verify rank for |
| location | No | `2840` (US) | DFS location code (use country-level for B2B) |
| language | No | `en` | DFS language code |
| skip-backlinks | No | false | Skip the backlink phase (saves ~$0.03) |
| output | No | stdout | Path to save JSON output |

## Cost (DFS path)

| Phase | DFS Endpoint | Est. Cost |
|---|---|---|
| Domain overview | `dataforseo_labs/google/domain_rank_overview/live` | ~$0.01 |
| Top ranked keywords (top 100) | `dataforseo_labs/google/ranked_keywords/live` | ~$0.02 |
| Top pages | `dataforseo_labs/google/relevant_pages/live` | ~$0.01 |
| Competitor discovery | `dataforseo_labs/google/competitors_domain/live` | ~$0.01 |
| Backlink summary | `backlinks/summary/live` | ~$0.02 |
| Top referring domains | `backlinks/referring_domains/live` | ~$0.02 |
| Anchor text distribution | `backlinks/anchors/live` | ~$0.01 |
| Keyword rank verify (per keyword) | `serp/google/organic/live/advanced` | ~$0.002 |
| **Typical full run** | | **~$0.10–0.15** |
| **With 3 competitors (lighter)** | | **~$0.20–0.30** |

Compared to the Apify-scrape path: ~$0.30–1.00 per domain, fragile, ToS-violating.

## Process

### Phase 1: Domain Overview

**DFS path (preferred):**

```
POST /v3/dataforseo_labs/google/domain_rank_overview/live
{
  "target": "example.com",
  "location_code": 2840,
  "language_code": "en"
}
```

Returns:
- `metrics.organic.etv` — estimated organic traffic value (proxy for monthly traffic)
- `metrics.organic.count` — number of ranking keywords
- `metrics.organic.pos_1` / `pos_2_3` / `pos_4_10` — ranking distribution
- `metrics.paid.*` — paid traffic and keyword counts (when present)
- `domain_authority` — DFS-computed domain rank (0–100)

**Apify fallback (only when `MOATT_API_KEY` isn't set):**

```python
# Actor: devnaz/semrush-scraper
{ "urls": ["https://example.com"] }
```

### Phase 2: Top Ranked Keywords

**DFS path:**

```
POST /v3/dataforseo_labs/google/ranked_keywords/live
{
  "target": "example.com",
  "location_code": 2840,
  "language_code": "en",
  "limit": 100,
  "order_by": ["keyword_data.keyword_info.search_volume,desc"]
}
```

Per keyword: position, search volume, CPC, KD score, ranking URL, SERP features. This is the most-traffic-per-keyword angle on a domain — what's driving their organic traffic right now.

### Phase 3: Top Pages

**DFS path:**

```
POST /v3/dataforseo_labs/google/relevant_pages/live
{
  "target": "example.com",
  "location_code": 2840,
  "language_code": "en",
  "limit": 50
}
```

Per page: URL, count of organic keywords ranked for, estimated traffic, top keyword, page-level rank metrics.

### Phase 4: Competitor Discovery

**DFS path:**

```
POST /v3/dataforseo_labs/google/competitors_domain/live
{
  "target": "example.com",
  "location_code": 2840,
  "language_code": "en",
  "limit": 20
}
```

Returns competing domains ranked by keyword overlap with their domain metrics included inline. This replaces manually scraping Semrush's "competitors" table.

For each user-provided competitor and each top-3 auto-discovered competitor, optionally re-run Phase 1 to get a comparison metrics block.

### Phase 5: Backlink Profile (skip if `--skip-backlinks`)

**DFS path — three calls fired in parallel:**

```
POST /v3/backlinks/summary/live
{ "target": "example.com", "internal_list_limit": 10, "include_subdomains": true }

POST /v3/backlinks/referring_domains/live
{ "target": "example.com", "limit": 25, "order_by": ["rank,desc"] }

POST /v3/backlinks/anchors/live
{ "target": "example.com", "limit": 50, "order_by": ["backlinks,desc"] }
```

Extract:
- `backlinks` — total inbound link count
- `referring_domains` — count
- `domain_rank` — DFS domain rank (their DR-equivalent)
- `referring_pages_nofollow` / `dofollow` ratio
- Top 25 referring domains (sorted by rank)
- Top 50 anchor texts grouped into branded / keyword / generic / URL

### Phase 6: Keyword Rank Verification

For specific keywords (user-provided or top-N from Phase 2), verify the live SERP position:

**DFS path:**

```
POST /v3/serp/google/organic/live/advanced
{
  "keyword": "cloud cost optimization",
  "location_code": 2840,
  "language_code": "en",
  "depth": 20
}
```

Per keyword: where the target domain actually ranks (or doesn't), the ranking URL, the top-10 SERP, and presence of featured snippet / PAA / AI overview.

**Why this matters:** DFS Labs `ranked_keywords` refreshes weekly; a live SERP scrape is real-time. For high-stakes keywords, run Phase 6 to validate against this morning's SERP.

## Output

### JSON

```json
{
  "domain": "example.com",
  "analysis_date": "2026-05-08",
  "data_source": "dataforseo",
  "domain_metrics": {
    "domain_rank": 45,
    "organic_etv": 28500,
    "organic_keywords": 1240,
    "paid_keywords": 32,
    "ranking_distribution": {
      "pos_1": 14,
      "pos_2_3": 87,
      "pos_4_10": 318,
      "pos_11_20": 412,
      "pos_21_50": 409
    }
  },
  "top_keywords": [
    {
      "keyword": "cloud cost optimization",
      "position": 4,
      "search_volume": 1900,
      "cpc": 8.20,
      "keyword_difficulty": 42,
      "url": "https://example.com/blog/cloud-cost-optimization-guide"
    }
  ],
  "top_pages": [
    {
      "url": "https://example.com/blog/reduce-aws-costs",
      "organic_keywords": 45,
      "etv": 3200,
      "top_keyword": "reduce aws costs"
    }
  ],
  "backlink_profile": {
    "domain_rank": 52,
    "total_backlinks": 8930,
    "referring_domains": 412,
    "dofollow_ratio": 0.78,
    "top_referring_domains": [
      { "domain": "techcrunch.com", "rank": 91, "backlinks": 14 }
    ],
    "anchor_text_distribution": {
      "branded": 0.45,
      "keyword": 0.22,
      "generic": 0.18,
      "url": 0.15
    }
  },
  "competitors": [
    {
      "domain": "competitor1.com",
      "domain_rank": 62,
      "organic_etv": 45000,
      "organic_keywords": 2100,
      "intersections": 340
    }
  ],
  "keyword_rank_verification": [
    {
      "keyword": "cloud cost optimization",
      "verified_position": 4,
      "url": "https://example.com/blog/cloud-cost-optimization-guide",
      "serp_features": ["people_also_ask", "featured_snippet"],
      "ai_overview_present": true,
      "top_3_competitors_in_serp": ["vantage.sh", "antimetal.com", "finout.io"]
    }
  ]
}
```

### Markdown summary (generated alongside)

```markdown
# SEO Domain Profile: example.com
**Date:** 2026-05-08 · **Data:** DataForSEO

## Domain Metrics
| Metric | Value |
|---|---|
| Domain Rank | 45/100 |
| Monthly Organic Traffic (ETV) | ~28,500 |
| Organic Keywords | 1,240 |
| Top-10 Rankings | 419 (pos 1: 14, pos 2–3: 87, pos 4–10: 318) |
| Backlinks | 8,930 |
| Referring Domains | 412 |
| Dofollow Ratio | 78% |

## Top Performing Pages
| # | URL | Keywords | ETV | Top Keyword |
|---|---|---|---|---|
| 1 | /blog/reduce-aws-costs | 45 | 3,200 | reduce aws costs |
| 2 | … | … | … | … |

## Top Ranked Keywords
| # | Keyword | Position | Volume | KD | URL |
|---|---|---|---|---|---|
| 1 | cloud cost optimization | #4 | 1,900 | 42 | /blog/cloud-cost-optimization-guide |

## Backlink Profile
- Domain Rank: 52/100
- Referring domains: 412
- Dofollow: 78%
- Top linking sites: TechCrunch (rank 91), Product Hunt, …
- Anchor distribution: 45% branded, 22% keyword, 18% generic, 15% URL

## Competitor Comparison
| Domain | Rank | ETV | Keywords | Keyword Overlap |
|---|---|---|---|---|
| example.com | 45 | 28.5K | 1,240 | — |
| competitor1.com | 62 | 45K | 2,100 | 340 |
```

## Tips

- **Fire Phases 1–5 in parallel.** All five DFS Labs/Backlinks calls are independent — running concurrently shaves total latency from ~30s to ~6s.
- **Skip backlinks during fast-iteration runs.** When you only need keyword/traffic data, `--skip-backlinks` saves ~$0.03 and ~3s per run.
- **Run competitors lighter.** For each competitor, run only Phase 1 (domain rank overview). Skip Phases 2–5 unless you're explicitly comparing backlink profiles.
- **Use Phase 6 surgically.** Live SERP scrapes cost $0.002 each — reasonable for a list of 5–20 high-stakes keywords. Skip it for the 100-keyword `ranked_keywords` view (Phase 2 already covers that).
- **Combine with `site-content-catalog`** to overlay content inventory on ranking data — what content exists versus what actually drives traffic.
- **DFS location codes matter.** Use `2840` for US, `2826` for UK, `2276` for DE. For B2B SaaS, default to US unless the client targets a specific region.

## Limits & Fallbacks

- **DFS index size:** 2.8T live backlinks compared with Ahrefs' 35T historical. For obscure niche-B2B link discovery, gaps can appear — fall back to Apify-Ahrefs in those cases.
- **No multi-year traffic history.** DFS gives you current-state ETV; for trend graphs, fall back to the Apify-Semrush historical scrape.
- **Regulated verticals.** The Google Ads keyword data (used for KD/CPC enrichment in Phase 2) gets filtered for weapons, drugs, and adult content. For those clients, KD scores will be `null` — flag this in the output.
- **Geographic depth.** Strong in English-language markets (US/UK/AU/CA). Thinner for APAC/LATAM — validate coverage if you're targeting those regions.

## Dependencies

- Python 3.8+ with `requests`
- `MOATT_API_KEY` env var (routes through Moatt's DataForSEO proxy)
- `APIFY_API_TOKEN` env var (only for the Apify fallback path)
- Optional: web search for `site:domain` cross-checks
