---
name: seo-content-audit
description: >
  Comprehensive SEO footprint analysis powered by DataForSEO. Catalogs every piece
  of content, pulls real SEO metrics (domain rank, ranked keywords, top pages,
  backlinks), runs an OnPage technical audit (Core Web Vitals, broken links,
  duplicate tags), runs competitor comparison via DFS Labs, builds topic/keyword
  and content-type gap matrices, and produces a prioritized recommendations
  report. The complete SEO audit for any company.
tags: [seo]
---

# SEO Content Audit

## Setup

Load credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json doesn't exist, tell the user to run: `npx moatt login`

All endpoints authenticate via Bearer: `-H "Authorization: Bearer $MOATT_API_KEY"`

The complete SEO footprint analysis — content inventory, real SEO metrics, OnPage technical health, competitor comparison, gap matrices, and prioritized recommendations in one report. Built on DataForSEO for production-grade data accuracy.

## Quick Start

```
Run an SEO content audit for [company]. Website: [url]. Competitors: [list].
```

## Prerequisites

**Recommended:** DataForSEO credentials
- Set `MOATT_API_KEY` — routes DFS through Moatt's proxy and meters usage on your platform credits

**Fallback:** `APIFY_API_TOKEN` (Semrush/Ahrefs scrapers — used only when DFS is unset; data quality is lower).

## Inputs

| Input | Required | Description |
|---|---|---|
| **Company name** | Yes | User provides |
| **Company domain** | Yes | e.g., `example.com` |
| **Seed competitors** | Recommended | 2–5 competitor domains; system also auto-discovers |
| **Target keywords** | Optional | User provides; system also auto-discovers via DFS Labs |
| **Location** | Optional | Default `2840` (US); use a country-level code |

## Cost (DFS path)

| Component | Endpoint | Est. Cost |
|---|---|---|
| Content catalog (target) | sitemap crawl | Free |
| Domain overview (target) | `domain_rank_overview/live` | $0.01 |
| Top ranked keywords (target, 100) | `ranked_keywords/live` | $0.02 |
| Top pages (target, 50) | `relevant_pages/live` | $0.01 |
| OnPage audit (target) | `on_page/task_post` + `summary` | $0.05–0.10 |
| Backlink profile (target) | `backlinks/summary/live` + `referring_domains/live` + `anchors/live` | $0.05 |
| Competitor discovery | `competitors_domain/live` | $0.01 |
| Per-competitor light overview (3 competitors × Phase 1 only) | `domain_rank_overview/live` × 3 | $0.03 |
| Keyword-gap analysis (3 competitors) | `domain_intersection/live` × 3 | $0.06 |
| Search intent (top 50 keywords) | `search_intent/live` | $0.02 |
| Brand voice extraction | WebFetch | Free |
| **Total typical audit** | | **~$0.30–0.50** |

Versus the Apify-scrape path: ~$3–8 per audit, fragile, ToS-violating.

## Step-by-Step Process

### Phase 1: Context & Setup

Gather basics from the user: company name, domain, seed competitors, target keywords, location.

### Phase 2: Content Inventory

Crawl the target domain to build a complete content inventory:

1. Fetch sitemap.xml (or RSS, blog index as fallback)
2. Catalog every page: URL, title, date, content type, topic cluster
3. Group content by type (blog, landing, case studies, comparisons, etc.)
4. Analyze publishing cadence (posts/month, trend, recency)
5. Optionally deep-analyze the top 20 pages: word count, funnel stage, CTA presence

### Phase 3: SEO Performance Data

Pull SEO metrics for the target domain via `seo-domain-analyzer` (DFS-powered):

1. **Domain overview** — rank, organic ETV, keyword count, top-10 distribution
2. **Top ranked keywords (top 100)** — keyword, position, volume, KD, ranking URL
3. **Top pages (top 50)** — URL, organic keywords, ETV, top keyword
4. **Backlink profile** — total links, referring domains, dofollow ratio, top linking sites, anchor distribution
5. **Competitor discovery** — `competitors_domain/live` returns the top 20 keyword-overlap competitors with metrics inline

### Phase 4: OnPage Technical Audit

DFS OnPage API runs a full crawl with JS rendering and Lighthouse:

```
POST /v3/on_page/task_post
{
  "target": "example.com",
  "max_crawl_pages": 200,
  "load_resources": true,
  "enable_javascript": true,
  "enable_browser_rendering": true,
  "custom_js": "meta.scroll_depth = 3"
}
```

Then poll for completion:

```
GET /v3/on_page/summary/{task_id}
GET /v3/on_page/pages/{task_id}
```

Pull out:
- **Broken links** (4xx/5xx)
- **Redirect chains** (3+ hops)
- **Duplicate title / meta description / H1** counts
- **Non-indexable pages** (noindex, robots-blocked, canonical pointing elsewhere)
- **Missing alt text / titles / metas**
- **Page weight, render time, CWV** (LCP, CLS, INP via Lighthouse subendpoint)

For Core Web Vitals specifically:

```
POST /v3/on_page/lighthouse/task_post
{ "url": "https://example.com/", "for_mobile": true }
```

### Phase 5: Competitor Comparison

For each competitor (3–5 max):

1. **Lightweight domain snapshot** — `domain_rank_overview/live` (DR, ETV, keyword count)
2. **Keyword gap** — `domain_intersection/live` with `intersections: false` (their keywords you don't rank for)
3. **Content structure** — crawl their sitemap (no DFS cost), classify content types

```
POST /v3/dataforseo_labs/google/domain_intersection/live
{
  "target1": "competitor.com",
  "target2": "yourcompany.com",
  "intersections": false,
  "location_code": 2840,
  "language_code": "en",
  "limit": 200,
  "filters": [
    ["keyword_data.keyword_info.search_volume", ">", 50]
  ]
}
```

That's structurally cleaner than the old Apify approach — no scraping, structured JSON output, ~$0.02 per competitor.

### Phase 6: Build Gap Matrices

#### A) Topic / Keyword Gap Matrix

Cross-reference target keyword rankings (Phase 3) and content topics against competitors:

```markdown
| Topic / Keyword | [Target] | [Comp 1] | [Comp 2] | [Comp 3] | DFS Volume | KD | Gap? |
|---|---|---|---|---|---|---|---|
| cloud cost optimization | #4, 3 posts | #1, 12 posts | #2, 8 posts | #7, 5 posts | 1,900 | 42 | Partial |
| aws savings plans | No content | #3, 4 posts | No content | #1, 6 posts | 880 | 38 | YES |
| finops best practices | 1 post, not ranking | #5, 3 posts | #2, 7 posts | — | 720 | 35 | YES |
```

Real volume + KD numbers come from DFS Labs `bulk_keyword_difficulty/live` (cheap — ~$0.01 per call covering up to 1,000 keywords):

```
POST /v3/dataforseo_labs/google/bulk_keyword_difficulty/live
{
  "keywords": ["cloud cost optimization", "aws savings plans", ...],
  "location_code": 2840,
  "language_code": "en"
}
```

#### B) Content Type Gap Matrix

```markdown
| Content Type | [Target] | [Comp 1] | [Comp 2] | [Comp 3] | Gap? |
|---|---|---|---|---|---|
| Blog posts | 89 | 156 | 112 | 45 | Volume gap |
| Comparison pages | 0 | 12 | 8 | 3 | YES |
| Case studies | 5 | 22 | 15 | 8 | Weak |
| Glossary / educational | 0 | 45 | 0 | 30 | YES |
| Integration pages | 12 | 34 | 28 | 15 | Partial |
| ROI calculator / tools | 0 | 1 | 2 | 0 | Opportunity |
```

### Phase 7: Brand Voice Extraction (Optional)

If the audit feeds into content creation:

1. From Phase 2, pick 10–15 of the strongest blog posts (recent, longest, diverse topics)
2. Fetch each via WebFetch
3. Produce brand voice guidelines: tone, vocabulary patterns, sentence structure, do's/don'ts

### Phase 8: Synthesis & Report

Roll every finding into the final report. Save to the current working directory.

---

## Output Template

```markdown
# SEO Content Audit: [Company Name]

**Date:** YYYY-MM-DD · **Data:** DataForSEO
**Domain:** [domain]
**Competitors analyzed:** [list]
**Data sources:** DFS Labs (rankings, gaps, intent), DFS Backlinks, DFS OnPage (technical), DFS SERP (rank verification), sitemap crawl

---

## Executive Summary

[3–5 sentences. SEO health assessment. Biggest strength. Biggest gap. Most important recommendation. How they compare to competitors overall.]

---

## 1. Content Inventory

### Overview
- **Total pages cataloged:** X
- **Blog posts:** X
- **Landing pages:** X
- **Case studies:** X
- **Comparison pages:** X
- **Other:** X

### Content by Topic Cluster
| Topic | Posts | % of Content | Most Recent |
|---|---|---|---|

### Publishing Cadence
- **Average:** X posts/month
- **Trend:** [increasing / decreasing / stable]
- **Most recent publish:** YYYY-MM-DD
- **Unique authors:** X

---

## 2. SEO Performance (DFS data)

### Domain Metrics
| Metric | [Target] |
|---|---|
| Domain Rank | X/100 |
| Monthly Organic Traffic (ETV) | ~X |
| Organic Keywords | X |
| Top-10 Positions | X (pos 1: X, pos 2–3: X, pos 4–10: X) |
| Backlinks | X |
| Referring Domains | X |
| Dofollow Ratio | X% |

### Top Performing Pages
| # | URL | Keywords | ETV | Top Keyword |
|---|---|---|---|---|

### Top Ranked Keywords
| Keyword | Position | Volume | KD | URL |
|---|---|---|---|---|

### Backlink Profile
- Domain Rank: X/100
- Referring Domains: X
- Top linking sites: [list]
- Anchor distribution: X% branded / X% keyword / X% generic / X% URL

---

## 3. Technical Health (DFS OnPage)

| Issue | Count | Severity |
|---|---|---|
| Broken internal links (4xx) | X | High |
| Redirect chains (3+ hops) | X | Medium |
| Duplicate titles | X | Medium |
| Duplicate meta descriptions | X | Low |
| Non-indexable pages | X | Review |
| Missing alt text | X | Low |

### Core Web Vitals (Mobile)
- **LCP:** X.Xs ([Pass/Fail] vs 2.5s threshold)
- **CLS:** X.XX ([Pass/Fail] vs 0.1 threshold)
- **INP:** Xms ([Pass/Fail] vs 200ms threshold)

---

## 4. Competitor Comparison

### Domain Metrics
| Metric | [Target] | [Comp 1] | [Comp 2] | [Comp 3] |
|---|---|---|---|---|
| Domain Rank | | | | |
| Organic ETV | | | | |
| Keywords | | | | |
| Blog Posts | | | | |

### Topic / Keyword Gap Matrix
[Per Phase 6A]

### Content Type Gap Matrix
[Per Phase 6B]

---

## 5. Gaps & Opportunities

### Critical Gaps (High Impact)
1. **[Gap]:** [Description with DFS volume + KD numbers]

### Quick Wins (Low Effort, Immediate Impact)
1. **[Quick win]:** [Action + expected impact]

### Keyword Opportunities (DFS-sourced)
| Keyword | Volume | KD | Intent | Comp Position | Priority |
|---|---|---|---|---|---|

---

## 6. Brand Voice Profile

[Per Phase 7]

---

## 7. Recommendations (Prioritized)

### Tier 1: High Impact, Do First
1. **[Recommendation]**
   - What: [specific action]
   - Why: [evidence from DFS data]
   - Expected impact: [traffic/ranking improvement]
   - Effort: [Low/Medium/High]

### Tier 2: Medium Impact, Plan For
1. ...

### Tier 3: Long-term Strategic
1. ...

---

## Appendix

- A. Full content catalog (`content-inventory.md`)
- B. Complete SEO profile (`seo-profile.md`)
- C. OnPage technical report (`onpage-audit.md`)
- D. Brand voice guidelines (`brand-voice.md`)
- E. Raw DFS JSON exports
```

---

## Tips

- **Run Phases 2–5 in parallel.** Content cataloging, DFS Labs calls, OnPage, and Backlinks are independent — fire them concurrently.
- **OnPage is async — start it first.** The crawl takes 1–5 min depending on `max_crawl_pages`. Kick off the task at the start of Phase 4, work through Phases 2–3 in parallel, then poll for OnPage results.
- **3 competitors > 5.** Each adds DFS cost; gap matrices get noisier past 3.
- **Update quarterly.** SEO landscapes shift. Re-run to track progress and find new gaps.
- **The gap matrices are the most valuable output.** Focus there — they directly drive content strategy.
- **Combine with the `aeo` skill** for a complete organic search picture — traditional SEO + AI answer-engine coverage.

## Tools Required

- **DataForSEO** — `MOATT_API_KEY` env var (routes through Moatt's DataForSEO proxy)
- **Upstream skills:** `site-content-catalog`, `seo-domain-analyzer`
- **Optional fallback:** `APIFY_API_TOKEN` for Semrush/Ahrefs scrape when DFS is unset
- Web search + web fetch capabilities
