---
name: google-search-ads-builder
description: >
  End-to-end Google Search Ads campaign builder powered by DataForSEO. Pulls real
  keyword search volumes (from Google Ads API panel data), CPCs, difficulty scores,
  search-intent classification, and competitor PPC keyword data. Mines review/Reddit/HN
  language for buyer vocabulary, builds the keyword architecture with funnel mapping,
  generates an ad-group structure + headline / description variants + negative-keyword
  lists, recommends a bid strategy, and exports a campaign-ready CSV for Google Ads
  Editor import.
tags: [ads]
---

# Google Search Ads Builder

## Setup

Load credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json doesn't exist, tell the user to run: `npx moatt login`

All endpoints authenticate via Bearer: `-H "Authorization: Bearer $MOATT_API_KEY"`

Build a complete Google Search Ads campaign from scratch — grounded in real keyword volume, CPC, and difficulty data via DataForSEO, plus buyer-language mining from reviews/Reddit/HN. Produces files ready to import into Google Ads Editor.

**Core principle:** Most early-stage teams torch their first $5K on Google Ads because of bad keyword strategy and fluffy structure. This skill builds the keyword foundation with real DFS volume/CPC/intent data AND a tight, well-organized campaign from day one.

## When to Use

- "Set up Google Search Ads for us"
- "Build a Google Ads campaign for [product]"
- "I want to start running search ads — help me set it up"
- "Create a PPC campaign structure"
- "Generate Google Ads copy for our product"
- "Do keyword research for Google Ads"
- "What keywords should we bid on?"
- "Find high-intent keywords in our space"

## Prerequisites

**Required for production-grade keyword data:** DataForSEO credentials
- Set `MOATT_API_KEY` — routes DFS through Moatt's proxy and meters usage on your platform credits

**Without DFS:** the skill still runs but volume/CPC data degrades to web-search guesses. Bid recommendations become qualitative rather than data-driven.

**Optional:** `APIFY_API_TOKEN` for Reddit scraping (HN Algolia is free).

## Phase 0: Intake

1. **Product name + URL** — what we're advertising
2. **One-line value prop** — what it does, for whom
3. **Product category** — how a buyer would search for this (e.g., "sales automation", "AI writing tool")
4. **ICP** — who's searching (role, pain, company stage)
5. **Monthly budget** — affects structure and bid strategy
6. **Goal** — Free trial / demo bookings / content downloads / direct purchase
7. **Landing pages** — URLs to drive traffic to (or "need to create")
8. **Competitor domains** — 3–5 (for keyword + PPC gap analysis)
9. **Geographic targeting** — countries/regions (DFS location code)
10. **Existing keywords?** — current bidding or known winners
11. **Known converting keywords?** — performance data from prior campaigns

## Phase 1: Deep Keyword Research

### 1A: Seed Keyword Generation

Working from the product description and ICP, generate 3 keyword buckets:

| Bucket | Intent | Examples |
|---|---|---|
| **Problem-aware** | Searching for solutions to a pain | "how to automate outbound", "fix slow sales pipeline" |
| **Solution-aware** | Searching for a category | "AI SDR tool", "outbound automation software" |
| **Brand/Competitor** | Searching for you or competitors by name | "[your brand]", "[competitor] alternative" |

### 1B: DFS Keyword Expansion (replaces guesswork)

For each seed keyword, expand via DFS:

```
POST /v3/dataforseo_labs/google/keyword_ideas/live
{
  "keywords": ["AI SDR tool"],
  "location_code": 2840,
  "language_code": "en",
  "limit": 200,
  "filters": [
    ["search_volume", ">", 30],
    "and",
    ["search_volume", "<", 50000]
  ]
}
```

```
POST /v3/dataforseo_labs/google/related_keywords/live
{
  "keyword": "AI SDR tool",
  "location_code": 2840,
  "language_code": "en",
  "limit": 100,
  "depth": 2
}
```

Each returned keyword carries search volume, CPC, competition (low/med/high), and keyword difficulty. **That data is the structural backbone of the campaign — every keyword has real numbers attached.**

### 1C: Competitor PPC Keyword Mining (DFS)

Pull the keywords each competitor is actively bidding on:

```
POST /v3/dataforseo_labs/google/ranked_keywords/live
{
  "target": "competitor.com",
  "location_code": 2840,
  "language_code": "en",
  "limit": 200,
  "filters": [["keyword_data.keyword_info.search_volume", ">", 50]],
  "load_rank_absolute": true,
  "ignore_synonyms": false,
  "include_serp_info": true
}
```

Then isolate paid (`type: paid`) keywords specifically. That shows which competitors bid on which keywords with which creative — a direct line of sight into their PPC strategy that previously required Semrush.

For each competitor, also fetch the keyword gap (paid vs your domain):

```
POST /v3/dataforseo_labs/google/domain_intersection/live
{
  "target1": "competitor.com",
  "target2": "yourcompany.com",
  "intersections": false,
  "location_code": 2840,
  "language_code": "en",
  "limit": 200
}
```

### 1D: Search Intent Classification (DFS)

DFS classifies intent so budget doesn't bleed onto informational queries:

```
POST /v3/dataforseo_labs/google/search_intent/live
{
  "keywords": [<all expanded keywords from 1B + 1C>],
  "language_code": "en"
}
```

Per keyword: `commercial`, `informational`, `navigational`, `transactional`, plus probability scores. Filter hard — only `commercial` + `transactional` + `navigational` (brand) belong in a paid search campaign.

### 1E: Bulk Keyword Difficulty Scoring (DFS)

```
POST /v3/dataforseo_labs/google/bulk_keyword_difficulty/live
{
  "keywords": [<all surviving keywords from 1D>],
  "location_code": 2840,
  "language_code": "en"
}
```

Up to 1,000 keywords per call. KD is 0–100; for paid search, also pull CPC competition data.

### 1F: Review Language Mining

Real buyer vocabulary matters more than what marketers think buyers search.

```
Search: "[product name]" site:g2.com reviews
Search: "[product name]" site:capterra.com reviews
Search: "[competitor name]" site:g2.com reviews
Search: "best [product category]" site:g2.com
```

Use `fetch_webpage` on the top review pages. Pull phrases like:
- "I was looking for a [term] that could…"
- "We switched from [X] because we needed…"
- "Best [term] for [use case]"

### 1G: Reddit Community Mining

**Option A — Apify Reddit scraper** (if `APIFY_API_TOKEN`):

```
POST https://api.apify.com/v2/acts/trudax~reddit-scraper-lite/runs?token=${APIFY_API_TOKEN}
{ "searches": ["best <category> tool OR software OR platform"], "maxItems": 30 }
```

**Option B — Web search:**

```
Search: site:reddit.com "best [category] tool" OR "recommend [category]"
Search: site:reddit.com "[competitor]" alternative
```

### 1H: HN Algolia (Free)

```
GET https://hn.algolia.com/api/v1/search?query=<category>&tags=story&hitsPerPage=20
```

### 1I: Site Content Audit

WebFetch on the user's landing pages, pricing, top blog posts. Identify keywords already targeted, language already in use, candidate landing pages for ad groups.

### 1J: Autocomplete Expansion (DFS)

```
POST /v3/serp/google/autocomplete/live/advanced
{
  "keyword": "AI SDR tool",
  "location_code": 2840,
  "language_code": "en"
}
```

Returns Google's actual autocomplete suggestions — long-tail goldmine.

## Phase 2: Keyword Architecture

### 2A: Funnel Stage Mapping

Sort every surviving keyword by buyer-journey stage:

| Stage | Intent Signal | Bid Priority |
|---|---|---|
| **Problem-aware** | "how to scale outbound without hiring SDRs" | Medium — educational |
| **Solution-aware** | "AI SDR tool", "outbound automation platform" | High — comparing options |
| **Product-aware** | "[competitor] alternative", "[competitor] vs" | Very high — close to purchase |
| **Most-aware** | "[your brand]", "[your brand] pricing" | Must-have — defend brand |

### 2B: Intent Classification (DFS-driven)

| Intent (DFS) | Ad Group Strategy | Landing Page |
|---|---|---|
| **Transactional** | Aggressive bid, exact match | Direct product/pricing |
| **Commercial** | Strong bid, exact + phrase | Comparison or feature page |
| **Informational** | Skip — save for SEO | (n/a) |
| **Navigational** (brand) | Must-bid, exact match | Brand LP |

### 2C: Competitive Density (DFS competition score)

DFS keyword data includes a `competition` field (0–1) and `competition_level` (LOW/MEDIUM/HIGH). Use it directly:

| Density | Strategy |
|---|---|
| **LOW** (< 0.33) | Bid aggressively — first-mover advantage |
| **MEDIUM** (0.33–0.66) | Bid strategically — differentiate with copy |
| **HIGH** (> 0.66) | Bid selectively — long-tail variants, exact match only |

### 2D: Match Type Matrix

| Keyword Type | Recommended Match | Reason |
|---|---|---|
| Brand terms | Exact | Don't waste spend on broad |
| High-intent solution | Exact + Phrase | Capture precisely + discover adjacent |
| Competitor terms | Exact + Phrase | Control the narrative |
| Problem-aware | Phrase + Broad (with negatives) | Cast a wider net |

### 2E: Keyword Scoring (DFS-grounded)

| Keyword | Volume (DFS) | CPC (DFS) | Competition (DFS) | Intent (DFS) | Priority |
|---|---|---|---|---|---|
| | | | | | (1–5) |

**Priority scale:**
- **5** — High intent + medium competition (sweet spot)
- **4** — High intent + high competition (important but expensive)
- **3** — Medium intent + low competition (good for budget stretch)
- **2** — Low intent + low competition (awareness only)
- **1** — Skip

### 2F: Quick Wins List

Top 10 keywords to launch with — highest intent, manageable competition, real DFS-sourced volume:

| # | Keyword | Match | Volume | CPC | Competition | Intent | Priority |
|---|---|---|---|---|---|---|---|

## Phase 3: Campaign Structure

### 3A: Ad Group Design

Cluster keywords by theme + intent. Each ad group = one tight topic.

```
Campaign: [Product Name] — Search
+-- Ad Group: [Problem Keyword Theme 1]
|   +-- Keywords (5-15 per group)
|   +-- Ads (3 responsive search ads)
+-- Ad Group: [Problem Keyword Theme 2]
+-- Ad Group: [Solution Category]
+-- Ad Group: [Competitor Alternatives]
|   +-- "[Competitor A] alternative"
|   +-- "[Competitor B] alternative"
|   +-- "best [category] alternative"
+-- Ad Group: [Brand]
    +-- "[Your brand name]" (defense)
```

**Rules:**
- Max 15 keywords per ad group
- Shared theme within an ad group
- Each ad group → its own landing page (where possible)
- Apply Phase 2D's match-type matrix

## Phase 4: Ad Copy Generation

Per ad group: **3 Responsive Search Ads** with **15 headlines** (≤30 chars) + **4 descriptions** (≤90 chars).

### Headline Framework (15 per ad group)

| Slot | Purpose | Example |
|---|---|---|
| 1–3 | **Keyword match** | "AI Outbound Automation" |
| 4–5 | **Value prop** | "10x Your Pipeline in 30 Days" |
| 6–7 | **Social proof** | "Trusted by 500+ B2B Teams" |
| 8–9 | **Differentiation** | "No-Code Setup in 5 Minutes" |
| 10–11 | **CTA** | "Start Free Trial Today" |
| 12–13 | **Offer/Urgency** | "Free 14-Day Trial" |
| 14–15 | **Trust/Risk reversal** | "No Credit Card Required" |

### Description Framework (4 per ad group)

| Slot | Purpose | Example |
|---|---|---|
| 1 | **Feature-benefit** | "Automate personalized outbound emails so your team closes more deals without the manual work." |
| 2 | **Pain-agitate** | "Tired of reps spending 4 hours on prospecting? Our AI handles it in minutes." |
| 3 | **Social proof + CTA** | "Join 500+ growth teams. Start your free trial — no credit card needed." |
| 4 | **Differentiator + CTA** | "Unlike legacy tools, [Product] works out of the box. See it in action — book a 15-min demo." |

## Phase 5: Negative Keywords

### 5A: Universal Negatives
```
free (if not freemium)
jobs, careers, hiring, salary, internship
tutorial, course, certification, learn, how to become
review, reddit, quora, forum (if not desired)
login, support, help desk, documentation
download, open source (if not applicable)
```

### 5B: Category-Specific Negatives

Industry-specific terms that share words with your keywords but signal wrong intent. From DFS Phase 1D, any keyword classified `informational` becomes a candidate negative on commercial ad groups.

### 5C: Intent Negatives

- Job seekers: "jobs", "careers", "hiring", "salary"
- Students: "tutorial", "course", "certification", "assignment"
- Support seekers: "login", "support", "help", "docs"

### 5D: Competitor Brand Negatives (Optional)

If you're NOT running competitor campaigns, negative-match competitor brand names. If you ARE, apply only to non-competitor ad groups.

### 5E: Ad Group Cross-Negatives

Cross-negative between ad groups to prevent internal cannibalization.

## Phase 6: Bid Strategy Recommendation

| Budget Range | Strategy | Reason |
|---|---|---|
| < $1K/mo | Manual CPC or Max Clicks | Need data first |
| $1K–5K/mo | Max Conversions (after 30+ conv) | Enough data for Google's algo |
| $5K+/mo | Target CPA or Target ROAS | Optimize at scale |

**First 2 weeks:** always Manual CPC or Max Clicks with a daily cap. Switch to automated bidding only after collecting conversion data.

### Budget Allocation by Funnel Stage

| Stage | % of Budget | Reasoning |
|---|---|---|
| Brand defense | [X%] | Protect brand searches |
| Competitor capture | [X%] | High-intent, ready to switch |
| Solution-aware | [X%] | Category buyers — highest volume |
| Problem-aware | [X%] | Only if budget allows |

### CPC Sanity Check Against DFS

For every ad group's top 3 keywords, check DFS-reported CPC against your max CPC. If your max is < 50% of DFS-reported CPC at HIGH competition → likely won't show. Adjust strategy or de-prioritize.

## Phase 7: Output Format

### 7A: Campaign Strategy Doc (markdown)

```markdown
# Google Search Ads Campaign — [Product Name] — [DATE]
**Data:** DataForSEO

## Campaign Overview
- **Goal:** [Conversions / Demos / Trials]
- **Monthly budget:** $[X]
- **Geographic targeting:** [Countries] (DFS location_code [N])
- **Bid strategy (start):** [Manual CPC / Max Clicks]
- **Bid strategy (after 30 conv):** [Max Conversions / Target CPA]

## Research Summary (DFS-grounded)
- Sources: DFS keyword_ideas + related_keywords + ranked_keywords (competitor PPC),
  G2/Capterra reviews, Reddit, HN, site audit
- Total keywords discovered: [N]
- After DFS intent filter: [N]
- After volume + KD filter: [N]
- Recommended for campaign: [N]

## Competitive PPC Map (DFS data)
| Keyword Theme | Competitors Bidding | Density (DFS) | Recommendation |
|---|---|---|---|

## Campaign Structure
[Tree per Phase 3A]

## Keywords by Ad Group

### Ad Group: [Name]
**Landing page:** [URL]
| Keyword | Match Type | Volume | CPC | Competition | Funnel Stage | Intent (DFS) | Priority |
|---|---|---|---|---|---|---|---|

## Ad Copy

### Ad Group: [Name]
**RSA 1:**
Headlines: [list of 15]
Descriptions: [list of 4]

## Negative Keywords
### Campaign-level + Ad-group-level

## Bid & Budget Recommendations

## Quick Wins — Top 10 Launch Keywords
[Phase 2F]

## Launch Checklist
- [ ] Verify landing pages load + track conversions
- [ ] Set up conversion tracking (Google Tag / GA4)
- [ ] Confirm geographic targeting
- [ ] Set daily budget cap
- [ ] Review ad extensions (sitelinks, callouts, structured snippets)
- [ ] Enable search-term report review (weekly)
```

### 7B: Google Ads Editor Import CSV

```csv
Campaign,Ad Group,Keyword,Match Type,Max CPC,Final URL,Headline 1,Headline 2,Headline 3,Description 1,Description 2
```

Save:
- `google-search-campaign-[YYYY-MM-DD].md`
- `google-ads-import-[YYYY-MM-DD].csv`

## Cost (DFS path)

| Component | Endpoint | Est. Cost |
|---|---|---|
| Keyword expansion | `keyword_ideas/live` + `related_keywords/live` | $0.05–0.15 |
| Competitor PPC keywords (3 competitors) | `ranked_keywords/live` ×3 | $0.06 |
| Keyword gap (3 competitors) | `domain_intersection/live` ×3 | $0.06 |
| Search intent (up to 1,000 keywords) | `search_intent/live` | $0.02 |
| Bulk KD (up to 1,000 keywords) | `bulk_keyword_difficulty/live` | $0.01 |
| Autocomplete expansion | `serp/google/autocomplete/live` | $0.01 |
| Review mining | web search | Free |
| Reddit (Apify) | optional | $0.05–0.10 |
| HN Algolia | free | Free |
| Site audit (fetch_webpage) | | Free |
| Ad copy generation (LLM) | | Free |
| **Total** | | **~$0.20–0.40** |

## Tools Required

- **DataForSEO** — `MOATT_API_KEY` (routes through Moatt's DataForSEO proxy)
- **web_search** — keyword research, review mining
- **fetch_webpage** — landing-page review, site audit, competitor pages
- **HN Algolia API** — free, no key
- **Optional:** `APIFY_API_TOKEN` for Reddit scraping

## Trigger Phrases

- "Set up Google Search Ads for [product]"
- "Build a PPC campaign"
- "Create Google Ads for our product"
- "I need search ad keywords and copy"
- "Generate a Google Ads Editor import file"
- "Do keyword research for Google Ads"
- "What keywords should we bid on?"
- "Build a keyword architecture for [product]"
- "Find high-intent search keywords"
