---
name: seo-opportunity-finder
description: >
  Find quick-win SEO content opportunities by comparing your site's existing
  content against competitor keyword rankings through DataForSEO. Uses
  `site-content-catalog` for your content inventory and DFS Labs domain
  intersection (the canonical keyword-gap endpoint) to surface topics that
  competitors rank for and that you don't cover yet. Outputs a prioritised
  list of posts to write or update, backed by real volume + difficulty data.
tags: [seo]
---

# SEO Opportunity Finder

## Setup

Pull credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json is missing, tell the user to run: `npx moatt login`

Every endpoint uses Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`

Identify the highest-leverage content gaps between your site and your competitors. Combines a crawl of your existing content with DataForSEO Labs' keyword-gap analysis (domain_intersection) to surface the prioritised list of posts worth writing — grounded in real search volume and keyword difficulty, not guesses.

**Core principle:** Don't start from a blank keyword list. Start by knowing what you have, then find what competitors rank for and you don't — and pick the gaps with real demand and feasible difficulty.

## When to Use

- "Find SEO content gaps vs our competitors"
- "What topics should we write about to rank?"
- "We're starting a blog — where should we focus first?"
- "What keywords are [competitor] ranking for that we're missing?"

## Prerequisites

**Recommended:** DataForSEO credentials
- Set `MOATT_API_KEY` — routes DFS through Moatt's proxy and meters usage against your platform credits

**Fallback (no DFS):** `seo-domain-analyzer` in Apify mode (`APIFY_API_TOKEN` set) — gap analysis becomes coarser but still functional.

## Phase 0: Intake

1. Your website URL (e.g., `https://yourcompany.com`)
2. 2–3 competitor URLs to compare against
3. Primary ICP — who you're trying to attract (filters for commercial intent)
4. Topics/keyword themes definitely in scope (optional — sharpens prioritisation)
5. Geography / location code (default `2840` US)

## Phase 1: Catalog Your Existing Content

Build the inventory of the target site's current pages and posts using `site-content-catalog`:

1. Fetch sitemap.xml (`/sitemap.xml`, `/sitemap_index.xml`, `robots.txt` `Sitemap:` directives)
2. Fall back to RSS feeds (`/feed`, `/blog/feed`) or a blog-index crawl
3. Extract every URL: title, inferred topic/theme, content age

This prevents recommending content you've already written.

## Phase 2: Keyword Gap via DFS `domain_intersection`

**This is the killer endpoint for this skill.** DFS Labs' `domain_intersection` returns keywords where one domain ranks but another doesn't (or ranks lower) — the structured answer to "what are competitors ranking for that we're missing?"

```
POST /v3/dataforseo_labs/google/domain_intersection/live
{
  "target1": "competitor.com",
  "target2": "yourcompany.com",
  "intersections": false,                # false = gap mode (only target1 ranks)
  "location_code": 2840,
  "language_code": "en",
  "limit": 200,
  "order_by": ["first_domain_serp_element.rank_group,asc"],
  "filters": [
    ["keyword_data.keyword_info.search_volume", ">", 50],
    "and",
    ["first_domain_serp_element.rank_group", "<=", 20]
  ]
}
```

Run this once per competitor. Each call returns:

- The keyword
- Search volume + CPC + KD
- Competitor's ranking URL + position
- Your URL + position (or null if you don't rank)
- SERP features present

This replaces manual scraping/comparison entirely. ~$0.02 per competitor call.

For each user-provided competitor, also run with `intersections: true` to surface keywords where both rank — useful for mapping shared territory.

## Phase 3: Competitor Domain Snapshot

For each competitor, run a quick `seo-domain-analyzer` Phase 1 (domain rank overview only) — gives you organic traffic ETV + total keyword count for the comparison header.

```
POST /v3/dataforseo_labs/google/domain_rank_overview/live
{ "target": "competitor.com", "location_code": 2840, "language_code": "en" }
```

## Phase 4: Identify & Classify Gaps

From Phase 2's gap output, classify each gap:

### Gap Classification

| Type | Definition | Priority |
|---|---|---|
| **Hard gap** | Competitor ranks top 10, you don't appear in top 50 | High |
| **Soft gap** | You're page 2–3 (pos 11–30); competitor is top 5 | Medium |
| **Volume gap** | You rank but at a lower position; competitor higher and keyword has high volume | Medium |
| **White space** | Neither you nor the competitor ranks well; high volume; opportunity for the first mover | Variable |

### Commercial Intent Filter

For each gap topic, score commercial intent (1–5):

- **5** — Maps directly to your product (e.g., "best AI SDR tools for startups")
- **4** — Problem-aware, not product-specific (e.g., "how to scale outbound SDR")
- **3** — Adjacent pain (e.g., "cold email open rates benchmark 2026")
- **2** — Educational, tangential (e.g., "what is lead scoring")
- **1** — Generic, low-conversion

Pull DFS `search_intent` to assist the classification:

```
POST /v3/dataforseo_labs/google/search_intent/live
{
  "keywords": ["best AI SDR tools", "outbound automation platform", ...],
  "language_code": "en"
}
```

Returns `commercial`, `informational`, `navigational`, `transactional` per keyword. Filter to commercial + transactional for the priority list.

## Phase 5: Synthesize & Output

```markdown
# SEO Opportunity Report — [Your Company] vs [Competitors]
Generated: [DATE] · Data: DataForSEO

## Your Content Snapshot
- Total indexed pages: [N]
- Blog posts: [N]
- Main topic clusters: [list]

## Competitor Benchmarks
| Domain | Rank | ETV (mo organic) | Keywords | Avg position |
|---|---|---|---|---|
| [comp1] | [X] | [X] | [X] | [X] |
| [comp2] | [X] | [X] | [X] | [X] |

## Top 10 Content Opportunities

### 1. [Topic / Title Suggestion]
- **Keyword target:** [keyword phrase]
- **Search volume:** [exact monthly] (DFS)
- **Keyword difficulty:** [score 0–100]
- **Search intent:** commercial / transactional
- **Competitor owning it:** [competitor URL] (position [#X])
- **Your current position:** [#X or "Not ranking"]
- **Why it matters:** [what problem it solves for ICP]
- **Recommended format:** [listicle / how-to / comparison / landing page]
- **Estimated effort:** [hours or word count target]
- **Internal-link targets:** [pillar page + 2 related articles]

### 2. ...

## Quick Wins — Update Existing Posts

| Your Post | Current Position | Issue | What to Add | Volume Lift Potential |
|---|---|---|---|---|
| [URL] | #11 | One position from page 1 | Add 3 sections from competitor outline | +[X]/mo |
| [URL] | #18 | Thin (400 words), outdated | Expand to [X] words, refresh stats | +[X]/mo |

## Recommended Content Calendar (Next 90 Days)

| Month | Post | Intent | KD | Est. Volume | Priority |
|---|---|---|---|---|---|
| Month 1 | [post 1] | Transactional | 35 | 1,900 | P0 |
| Month 1 | [post 2] | Commercial | 42 | 1,200 | P0 |
| Month 2 | [post 3] | Commercial | 28 | 800 | P1 |

## Keyword-Gap Summary
- Total gap keywords (from DFS domain_intersection): [N]
- After volume filter (≥50/mo): [N]
- After commercial intent filter (≥3): [N]
- Recommended top 10 above are the highest priority of these [N]
```

Save to the current working directory or wherever the user prefers.

## Cost

| Component | DFS path | Apify-only fallback |
|---|---|---|
| Site content catalog | Free (sitemap) | Free |
| Domain rank overview (per competitor, ~3) | $0.03 | $0.30 |
| Domain intersection / keyword gap (per competitor, ~3) | $0.06 | $0.30+ |
| Search intent classification (top 50 keywords) | $0.02 | n/a |
| Analysis | Free (LLM) | Free |
| **Total per run** | **~$0.10–0.20** | **~$3–10** |

DFS path is **30–50× cheaper** AND ToS-clean.

## Tools Required

- **DataForSEO** — `MOATT_API_KEY` env var (routes through Moatt's DataForSEO proxy)
- **Upstream skills:** `site-content-catalog`, `seo-domain-analyzer`
- **Optional fallback:** `APIFY_API_TOKEN` for Semrush scrape if DFS unset
- Web search + web fetch capabilities

## Trigger Phrases

- "Find our SEO content gaps"
- "What should we write about to rank?"
- "Compare our content coverage to [competitor]"
- "Run SEO opportunity finder for [client]"
