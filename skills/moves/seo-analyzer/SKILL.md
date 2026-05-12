---
name: seo-analyzer
description: >
  General-purpose SEO analyzer for any domain via DataForSEO — technical health
  (OnPage API + Lighthouse CWV, broken links, meta issues), authority + ranking
  snapshot (Labs domain rank, ranked keywords), top content opportunities
  (keyword_ideas), and live competitive SERP for top keywords. The lightweight
  first-look "analyze SEO for {domain}" entry point. Pay-per-use, ~$0.10–0.20
  per run.
tags: [seo]
---

# SEO Analyzer

## Setup

Read your credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json does not exist, tell the user to run: `npx moatt login`

All endpoints use Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`

The lightweight, first-look SEO analyzer. Point it at any domain to get a four-part snapshot — **technical health**, **authority + ranking**, **content opportunities**, and **competitive SERP threats** — in a single run. Powered by DataForSEO's official APIs.

**When to use this skill:**
- User asks "analyze SEO for {domain}" with no further specifics → this skill.
- User wants the *deep-dive* metrics-only view (backlinks, rank verification, full keyword profile) → use `seo-domain-analyzer`.
- User wants the *full audit report* with content inventory, gap matrices, and recommendations → use `seo-content-audit`.

This skill is the entry point. The other two are deeper specialists.

## Prerequisites

**Recommended (production):** DataForSEO credentials
- Sign up at [dataforseo.com](https://dataforseo.com) → API → copy login + password
- Set `MOATT_API_KEY` — routes DFS through Moatt's proxy and meters usage on your platform credits

All DFS REST calls use HTTP Basic auth:
```bash
curl -H "Authorization: Bearer $MOATT_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST "https://api.dataforseo.com/v3/<endpoint>" \
  -d '[ { ... } ]'
```

DFS request bodies are arrays of task objects — even for a single task. Wrap each example body below in `[ ... ]`.

## Quick Start

```bash
# Lightweight default run
python3 scripts/analyze_seo.py --domain "example.com"

# With explicit seed keywords (skips keyword auto-discovery)
python3 scripts/analyze_seo.py \
  --domain "example.com" \
  --keywords "cloud cost optimization,reduce aws bill"

# Skip OnPage crawl for ultra-fast metrics-only run
python3 scripts/analyze_seo.py --domain "example.com" --skip-onpage

# Save full output
python3 scripts/analyze_seo.py --domain "example.com" --output seo-snapshot.json
```

## Inputs

| Parameter | Required | Default | Description |
|---|---|---|---|
| domain | Yes | — | Domain to analyze (e.g., `example.com`) |
| keywords | No | auto from `ranked_keywords` | Seed keywords for opportunity + SERP phases |
| location | No | `2840` (US) | DFS location code |
| language | No | `en` | DFS language code |
| max-crawl-pages | No | `100` | Pages to crawl in OnPage audit |
| skip-onpage | No | `false` | Skip technical audit (saves ~$0.05) |
| output | No | stdout | Path to save JSON output |

## Cost (DFS path)

| Phase | DFS Endpoint | Est. Cost |
|---|---|---|
| Technical audit (OnPage post + summary + pages) | `on_page/task_post` + `on_page/summary` + `on_page/pages` | ~$0.05–0.10 |
| Domain authority + rank | `dataforseo_labs/google/domain_rank_overview/live` | ~$0.01 |
| Top ranked keywords (top 50) | `dataforseo_labs/google/ranked_keywords/live` | ~$0.02 |
| Content opportunities (keyword ideas) | `dataforseo_labs/google/keyword_ideas/live` | ~$0.02 |
| Competitive SERP (per top keyword × 5) | `serp/google/organic/live/advanced` | ~$0.01 |
| **Typical full run** | | **~$0.11–0.16** |
| **With `--skip-onpage`** | | **~$0.06** |

## Process

### Phase 1: Technical Health (OnPage API)

OnPage is async — kick it off **first**, then run Phases 2–4 in parallel while it crawls.

**Submit crawl:**

```
POST /v3/on_page/task_post
[{
  "target": "example.com",
  "max_crawl_pages": 100,
  "load_resources": true,
  "enable_javascript": true,
  "enable_browser_rendering": true
}]
```

Response returns a `task_id`. Poll every 15s until `crawl_progress == "finished"` (typically 1–3 min for 100 pages).

**Pull summary:**

```
GET /v3/on_page/summary/{task_id}
```

Returns site-wide health rollup. Extract:
- `crawl_status.pages_crawled` / `pages_in_queue`
- `domain_info.checks.*` — boolean flags for `ssl`, `http2`, `sitemap`, `robots_txt`
- `page_metrics.checks.*` — counts for `broken_links`, `broken_resources`, `duplicate_title`, `duplicate_description`, `duplicate_content`, `redirect`, `is_4xx_code`, `is_5xx_code`, `no_h1_tag`, `no_image_alt`, `large_page_size`, `low_content_rate`, `no_title`, `no_description`, `no_favicon`, `is_https`
- `page_metrics.onpage_score` — site-wide score 0–100

**Pull per-page issues (top offenders):**

```
POST /v3/on_page/pages
[{
  "id": "{task_id}",
  "limit": 50,
  "order_by": ["onpage_score,asc"]
}]
```

Returns the 50 weakest pages with full per-page issue breakdown — feed straight into the issues table in the output.

**Compute Technical Health Score:** weighted blend of `onpage_score`, broken-link ratio, CWV pass rate (if Lighthouse subendpoint runs), and indexability rate. Output as 0–100 with letter grade.

### Phase 2: Authority + Ranking Snapshot

```
POST /v3/dataforseo_labs/google/domain_rank_overview/live
[{
  "target": "example.com",
  "location_code": 2840,
  "language_code": "en"
}]
```

Returns:
- `metrics.organic.etv` — estimated monthly organic traffic value
- `metrics.organic.count` — total ranked keywords
- `metrics.organic.pos_1` / `pos_2_3` / `pos_4_10` — ranking distribution
- `metrics.paid.*` — paid keyword count + traffic (if any)
- `domain_authority` — DFS-computed domain rank (0–100)

```
POST /v3/dataforseo_labs/google/ranked_keywords/live
[{
  "target": "example.com",
  "location_code": 2840,
  "language_code": "en",
  "limit": 50,
  "order_by": ["keyword_data.keyword_info.search_volume,desc"]
}]
```

Per keyword: position, search volume, CPC, KD score, ranking URL, SERP features. Captures what's *currently driving traffic*. The top 5 by position × volume feed Phase 4.

### Phase 3: Content Opportunities

Pull keyword ideas around the top 1–3 seed terms (or auto-pick from Phase 2's top keywords):

```
POST /v3/dataforseo_labs/google/keyword_ideas/live
[{
  "keywords": ["cloud cost optimization", "aws cost"],
  "location_code": 2840,
  "language_code": "en",
  "limit": 100,
  "order_by": ["keyword_info.search_volume,desc"],
  "filters": [
    ["keyword_info.search_volume", ">", 100],
    "and",
    ["keyword_info.competition_level", "in", ["LOW", "MEDIUM"]]
  ]
}]
```

Returns up to 100 related keywords with volume, CPC, competition, and SERP intent signals. Filter against Phase 2's already-ranking set to surface **net-new opportunities** (keywords the domain doesn't rank for yet).

### Phase 4: Competitive SERP Threats

For the top 5 keywords from Phase 2 (sorted by `volume × position_score`), run live SERPs:

```
POST /v3/serp/google/organic/live/advanced
[{
  "keyword": "cloud cost optimization",
  "location_code": 2840,
  "language_code": "en",
  "depth": 20
}]
```

Per keyword extract:
- Target's verified live position (or absent)
- Top 10 competing domains (dedup across keywords → cross-keyword competitor set)
- SERP features: `featured_snippet`, `people_also_ask`, `ai_overview`, `video`, `images`, `knowledge_graph`
- AI Overview presence flag (zero-click risk indicator)

The dedup-across-5-keywords competitor set is the **"who's actually beating you in the SERPs"** view — distinct from `competitors_domain` (Labs-aggregated keyword overlap).

## Output

### JSON

```json
{
  "domain": "example.com",
  "analysis_date": "2026-05-09",
  "data_source": "dataforseo",
  "technical_health": {
    "onpage_score": 78,
    "grade": "B",
    "pages_crawled": 100,
    "issues": {
      "broken_links_4xx": 12,
      "broken_resources": 3,
      "duplicate_title": 5,
      "duplicate_description": 8,
      "redirect_chains": 2,
      "no_h1_tag": 4,
      "no_image_alt": 47,
      "large_page_size": 3,
      "low_content_rate": 6,
      "non_indexable": 9
    },
    "core_web_vitals": {
      "lcp_ms": 2400,
      "cls": 0.08,
      "inp_ms": 180,
      "mobile_pass": true
    },
    "weakest_pages": [
      { "url": "/blog/old-post", "onpage_score": 42, "issues": ["broken_link", "no_h1_tag", "low_content_rate"] }
    ]
  },
  "authority_ranking": {
    "domain_rank": 45,
    "organic_etv": 28500,
    "organic_keywords": 1240,
    "paid_keywords": 0,
    "ranking_distribution": {
      "pos_1": 14,
      "pos_2_3": 87,
      "pos_4_10": 318,
      "pos_11_20": 412,
      "pos_21_50": 409
    },
    "top_keywords": [
      {
        "keyword": "cloud cost optimization",
        "position": 4,
        "search_volume": 1900,
        "cpc": 8.20,
        "keyword_difficulty": 42,
        "url": "/blog/cloud-cost-optimization-guide"
      }
    ]
  },
  "content_opportunities": [
    {
      "keyword": "aws savings plans calculator",
      "search_volume": 880,
      "cpc": 6.40,
      "competition": "LOW",
      "keyword_difficulty": 28,
      "currently_ranking": false
    }
  ],
  "competitive_serp": {
    "keywords_analyzed": 5,
    "top_competitors": [
      { "domain": "vantage.sh", "appearances": 5, "avg_position": 2.4 },
      { "domain": "antimetal.com", "appearances": 4, "avg_position": 3.5 }
    ],
    "ai_overview_present_for": 3,
    "featured_snippet_held_by": [
      { "keyword": "cloud cost optimization", "domain": "vantage.sh" }
    ]
  }
}
```

### Markdown summary

```markdown
# SEO Snapshot: example.com
**Date:** 2026-05-09 · **Data:** DataForSEO

## Technical Health
**Score: 78/100 (B)** · 100 pages crawled

| Issue | Count |
|---|---|
| Broken internal links (4xx) | 12 |
| Duplicate titles | 5 |
| Duplicate metas | 8 |
| Missing H1 | 4 |
| Missing alt text | 47 |
| Non-indexable pages | 9 |

**Core Web Vitals (mobile):** LCP 2.4s ✓ · CLS 0.08 ✓ · INP 180ms ✓ — passing

## Authority & Ranking
| Metric | Value |
|---|---|
| Domain Rank | 45/100 |
| Monthly Organic Traffic (ETV) | ~28,500 |
| Organic Keywords | 1,240 |
| Top-10 Rankings | 419 |

### Top 5 Ranked Keywords
| Keyword | Position | Volume | KD | URL |
|---|---|---|---|---|
| cloud cost optimization | #4 | 1,900 | 42 | /blog/cloud-cost-optimization-guide |

## Content Opportunities (not currently ranking)
| Keyword | Volume | KD | Competition |
|---|---|---|---|
| aws savings plans calculator | 880 | 28 | Low |

## Competitive SERP Threats (top 5 keywords)
| Domain | Appears in | Avg Position |
|---|---|---|
| vantage.sh | 5/5 | 2.4 |
| antimetal.com | 4/5 | 3.5 |

**AI Overview present for 3/5 keywords** — zero-click risk on those queries.
```

## Tips

- **Kick off OnPage first, then parallelize Phases 2–4.** OnPage takes 1–3 min; the three Labs/SERP phases are independent and finish in ~5–8s combined. Don't serialize.
- **DFS bodies are arrays.** Even for a single task, wrap in `[ { ... } ]`. The `on_page/summary` endpoint is the exception (GET with task_id in path).
- **Use `--skip-onpage` for fast iteration.** If you only need authority + ranking + opportunities (the metrics view), skip the crawl entirely.
- **5 keywords for SERP phase is the sweet spot.** Each is $0.002; going to 20+ inflates cost without changing the competitor set materially.
- **Filter `keyword_ideas` by `competition_level: LOW/MEDIUM`.** High-competition ideas exist but aren't *opportunities* for most clients — focus the output on actionable wins.
- **DFS location codes matter.** `2840` US, `2826` UK, `2276` DE, `2036` AU, `2124` CA. Default US for B2B SaaS unless the client serves a specific region.
- **For a deeper view, escalate to `seo-domain-analyzer`** (adds backlink profile, top pages, full competitor metrics) **or `seo-content-audit`** (adds content inventory, gap matrices, recommendations).

## Limits & Fallbacks

- **OnPage crawl ceiling:** Default 100 pages keeps cost predictable. For sites >500 pages, bump `max_crawl_pages` and budget accordingly (~$0.0005/page).
- **`keyword_ideas` is seed-sensitive.** Bad seeds → bad ideas. If Phase 2 returns thin keyword data, default to brand + 1 product term as seeds and surface that limitation in the output.
- **Live SERP variance.** SERPs change hourly. Phase 4 is a snapshot, not a longitudinal track. For trend monitoring, schedule recurring runs.
- **AI Overview detection:** DFS surfaces `ai_overview` as a SERP feature, but coverage varies by query intent. Treat its absence as "not detected this run" rather than "guaranteed absent".
- **Regulated verticals (weapons / drugs / adult):** Google Ads-derived KD/CPC fields will be `null`. Flag in output rather than failing.
- **No DFS credentials?** Tell the user to set `MOATT_API_KEY`. There is no scrape-based fallback for this skill — for production data you need the Moatt-routed DFS path.

## Dependencies

- Python 3.8+ with `requests`
- `MOATT_API_KEY` env var (routes through Moatt's DataForSEO proxy)
- Optional: web search for cross-checking flagged issues against live pages
