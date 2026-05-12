---
name: competitor-vs-page-builder
description: >
  Auto-build comparison pages ("{Your product} vs {Competitor}") using product
  data, G2/TrustRadius reviews, pricing pages, and feature-fit analysis,
  grounded in DataForSEO SERP analysis and head-to-head keyword data.
  Outputs ready-to-publish HTML/markdown with comparison table, FAQ schema,
  switching guide, and a "switch to us" CTA. One run produces an entire
  competitor matrix — typically 5-15 pages — ranking-ready for the "X vs Y"
  and "alternatives to X" search demand.
tags: [seo, competitive-intel]
---

# Competitor vs. Page Builder

## Setup

Read your credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json does not exist, tell the user to run: `npx moatt login`

All endpoints use Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`

"Comparison" pages capture some of the most concentrated buying intent on the internet — people search "X vs Y" when they're already evaluating. This skill builds those pages programmatically, grounded in real review data and DataForSEO SERP/keyword intel, and ships them ready to publish. Pairs with `programmatic-seo-planner` (existing) for the keyword strategy and `seo-opportunity-finder` for the demand validation.

**Built for:** PMM and SEO teams who keep saying "we should ship comparison pages" and never get to it. This is the one-shot way.

## When to Use

- "Build vs-pages against our top competitors"
- "Generate the {Competitor} comparison page"
- "Create the alternatives-to-{Competitor} page"
- "We need {our product} vs {Competitor} pages — generate the matrix"

## Prerequisites

**Recommended:** DataForSEO credentials
- Set `MOATT_API_KEY` — routes DFS through Moatt's proxy and meters usage on your platform credits

**Fallback (no DFS):** The skill still runs on `competitor-research` + `review-site-scraper` for product/pricing/feature intel, but loses the SERP grounding (which-page-currently-ranks insight) and head-to-head keyword overlap. Lower-confidence positioning.

## Cost (DFS path)

| Component | Endpoint | Est. Cost (per competitor) |
|---|---|---|
| SERP analysis (X vs Y query) | `serp/google/organic/live/advanced` | ~$0.002 |
| Search-volume validation (5 queries) | `keywords_data/google_ads/search_volume/live` | ~$0.001 |
| Domain intersection (overlap) | `dataforseo_labs/google/domain_intersection/live` | ~$0.02 |
| Their ranked keywords | `dataforseo_labs/google/ranked_keywords/live` | ~$0.02 |
| **Per-competitor cost** | | **~$0.04** |
| **Full matrix (10 competitors)** | | **~$0.40** |

Plus optional one-time `dataforseo_labs/google/competitors_domain/live` (~$0.01) if auto-discovery is needed to fill out the competitor list.

## Phase 0: Intake

Required:
1. **Your product** — name, URL, one-line positioning, your top 3-5 differentiators
2. **Competitor list** — 1-15 competitors. Each with name + URL.
3. **Our pricing page** — for accurate price-comparison table
4. **Brand voice** — confident / direct / educational. Default: confident-honest.

Optional:
5. **Existing customer references** — past customers who switched from each competitor (raises page quality dramatically)
6. **Verified differentiator framework** — your sales-vetted list of where you actually win
7. **Style guide** — colors, fonts, button styles for the rendered HTML

## Phase 1: Research per competitor

Run in parallel, one block per competitor.

> **Data sources:** `competitor-research` and `review-site-scraper` cover product/pricing/feature/review intel. **DataForSEO is the primary data source for SEO, SERP, and keyword intel** — see Phase 1.5 below. Don't try to scrape SERPs or guess rankings here; pull them from DFS in the next phase.

### 1A — Site research
**Skill:** `competitor-research` (existing)
- Hero claim, category they place themselves in
- Pricing model + tiers
- Top 5 features they emphasize
- Free tier inclusions / exclusions
- Implementation / time-to-value claims

### 1B — Review mining
**Skill:** `review-site-scraper` (existing)
- G2, TrustRadius, Capterra
- Top 5 praised attributes
- Top 5 complaints (this is where you win)
- "Switched from X to {Competitor}" patterns
- "Switched from {Competitor} to X" patterns
- Review count + average score

### 1C — Pricing intelligence
- Fetch their pricing page
- Map: per-seat / usage / flat / hybrid
- Identify hidden costs (overages, implementation, support tiers, integrations gated to enterprise)
- Note when "contact us" is the only price (comparison angle: pricing transparency)

### 1D — Feature comparison data
For each of your top differentiators, score the competitor:
- Has it: equivalent / partial / no
- Implementation difficulty for the buyer (instant / setup / requires services)
- Pricing tier the competitor gates it behind
- Cite the source for each claim (their docs, their pricing page, their changelog)

## Phase 1.5: Search Intelligence (DFS)

This phase grounds every comparison page in real SERP behavior and head-to-head keyword data. **Run all four DFS calls in parallel per competitor** — they're independent. Don't proceed to page construction without this data; it's what separates a credible vs-page from generic AI fluff.

> **(Optional pre-step) Auto-discover competitors.** If the user-supplied list is sparse or you want to validate the matrix is complete:
>
> ```
> POST /v3/dataforseo_labs/google/competitors_domain/live
> {
>   "target": "{your_product}.com",
>   "location_code": 2840,
>   "language_code": "en",
>   "limit": 15
> }
> ```
>
> Returns the top 15 domains DFS sees as your real organic competitors (ranked by keyword overlap). Cross-check against the user's list; surface unknowns for confirmation before building pages for them.

### 1.5A — SERP analysis for "{Your product} vs {Competitor}"

Validates the page targets a real query and shows you exactly who's currently winning the SERP — typically the competitor's own docs, third-party comparison sites (G2, TrustRadius), and sometimes you. Drives positioning decisions.

```
POST /v3/serp/google/organic/live/advanced
{
  "keyword": "{your_product} vs {competitor}",
  "location_code": 2840,
  "language_code": "en",
  "depth": 20
}
```

Extract per page:
- The top 10 ranking URLs + their domains (who's the page actually competing against?)
- SERP features present (featured snippet, PAA, AI overview, video)
- Whether your domain appears in top 20 (and at what rank)
- Whether the competitor's own domain is on page 1 (almost always yes for branded queries)

### 1.5B — Search-demand validation

Skip pages with <50 monthly searches unless the page is strategic (defensive, or competitor is much larger and you're targeting their brand).

```
POST /v3/keywords_data/google_ads/search_volume/live
{
  "keywords": [
    "{product} vs {competitor}",
    "{competitor} vs {product}",
    "{competitor} alternatives",
    "{competitor} pricing",
    "{competitor} review"
  ],
  "location_code": 2840,
  "language_code": "en"
}
```

The five queries above also feed the FAQ block — they're the real long-tail patterns buyers search before/after the main "X vs Y" query. Volume cutoffs:

- Volume > 200/mo → priority page
- Volume 50–200/mo → standard build
- Volume < 50/mo → defensive build, low priority (or skip)

### 1.5C — Head-to-head keyword overlap (`domain_intersection`)

This is the gold for comparison pages. "We rank #3 for X, they rank #11" is a credible, sourced claim that lifts the page above generic competitor content.

**Both rank (intersection mode):**

```
POST /v3/dataforseo_labs/google/domain_intersection/live
{
  "target1": "{your_product}.com",
  "target2": "{competitor}.com",
  "location_code": 2840,
  "language_code": "en",
  "intersections": true,
  "include_serp_info": true,
  "limit": 100
}
```

Returns: keywords both rank for + each side's position. Use to drive the "Where {your product} wins" section (keywords where you outrank them) and the "Where {Competitor} wins" section (keywords where they outrank you).

**Reverse for gap (keywords they have, you don't):**

```
POST /v3/dataforseo_labs/google/domain_intersection/live
{
  "target1": "{competitor}.com",
  "target2": "{your_product}.com",
  "location_code": 2840,
  "language_code": "en",
  "intersections": false,
  "limit": 100
}
```

Returns: keywords where the competitor ranks but you don't. Feeds the "what they're known for" content block + the internal-link target list (these are the pillar pages worth building next).

### 1.5D — Their ranked keywords (for "switch to us" framing)

Their top 50 organic-rank keywords — used to position the "what {Competitor} is known for" block honestly, and to inform which buyer-pain angles to lead with.

```
POST /v3/dataforseo_labs/google/ranked_keywords/live
{
  "target": "{competitor}.com",
  "location_code": 2840,
  "language_code": "en",
  "limit": 50,
  "filters": [
    ["keyword_data.keyword_info.search_volume", ">", 200],
    "and",
    ["ranked_serp_element.serp_item.rank_group", "<=", 10]
  ]
}
```

The filters keep the list to commercially meaningful keywords (>200 searches, top-10 ranks) — drops long-tail noise.

### Output of Phase 1.5 (per competitor)

```json
{
  "competitor": "acme.com",
  "vs_query": {
    "keyword": "yourproduct vs acme",
    "monthly_volume": 480,
    "top_3_serp_urls": ["acme.com/compare", "g2.com/.../acme-vs", "..."],
    "your_position": 7,
    "serp_features": ["people_also_ask", "ai_overview"]
  },
  "demand_signals": {
    "yourproduct vs acme": 480,
    "acme vs yourproduct": 320,
    "acme alternatives": 1100,
    "acme pricing": 2400,
    "acme review": 880
  },
  "head_to_head": {
    "shared_keywords_count": 47,
    "you_outrank_count": 12,
    "they_outrank_count": 35,
    "top_wins": [
      { "keyword": "...", "your_pos": 3, "their_pos": 11, "volume": 590 }
    ],
    "top_losses": [
      { "keyword": "...", "your_pos": 18, "their_pos": 4, "volume": 1900 }
    ],
    "their_only_keywords_count": 240
  },
  "their_top_keywords": [
    { "keyword": "...", "position": 2, "volume": 1900, "kd": 38 }
  ]
}
```

This block is the input that powers Phase 3's page construction — every "we win at X" / "they win at Y" claim cites a row from `head_to_head`.

## Phase 2: Demand check

Before generating a page, validate the search demand:

**Skill:** `seo-opportunity-finder` (existing) or direct keyword check
- Volume + difficulty for "{your product} vs {competitor}"
- Volume + difficulty for "{competitor} alternative"
- Volume + difficulty for "alternatives to {competitor}"
- Cluster these for the page's primary keyword + 3-5 secondary keywords

If volume < 50 / month and difficulty > 70: still build the page (defensive — competitors will), but lower its priority.
If volume > 200 / month: prioritize.

## Phase 3: Build per page

For each competitor, generate a complete page using this structure.

### Page anatomy

```markdown
# {Your product} vs {Competitor}

> {Two-sentence neutral framing. Explains the category, names the alternative,
> and credibly nods at the competitor before pivoting. Avoid "we're better."}

**Last updated:** {date}

## TL;DR
- {Bottom line in one sentence — when each tool wins}
- Best for: {your product} → {description of best-fit buyer}; {competitor} → {description of best-fit buyer}
- Try {your product}: {CTA link}
- Try {competitor}: link to their site (yes, link to them — credibility signal)

---

## At a glance

| | {Your product} | {Competitor} |
|---|---|---|
| Best for | {fit profile} | {their fit profile} |
| Pricing model | {model} | {their model} |
| Starting price | ${X}/mo | ${Y}/mo |
| Free tier | {yes/no, what's included} | {yes/no, what's included} |
| Setup time | {days} | {days} |
| Support | {tier 1, tier 2, etc.} | {their support tiers} |
| Standout feature | {differentiator 1} | {their standout} |

---

## Where {your product} wins

### {Differentiator 1}: {one-line claim}
{2-3 sentences explaining the difference, citing public sources where possible. Includes a real example or customer outcome.}

### {Differentiator 2}
{Same structure}

### {Differentiator 3}
{Same structure}

---

## Where {Competitor} wins

### {Their strength 1}
{Honest assessment. Don't fake-acknowledge to seem fair — call out a real strength.}

### {Their strength 2}
{Same structure}

If those matter most for your team, go with {competitor}. We'd rather you be a happy customer of theirs than an unhappy one of ours.

---

## What real users say

### What people praise about {Competitor} (from {N} reviews)
- "{verbatim quote}" — *G2 reviewer, {role}*
- "{verbatim quote}" — *TrustRadius, {role}*

### What people complain about (your attack angles)
- "{verbatim negative quote}" — *G2, {role}*
- "{verbatim negative quote}" — *G2, {role}*
- "{verbatim negative quote}" — *Capterra, {role}*

(All quotes are from public reviews, sourced and dated.)

---

## Pricing comparison

{Side-by-side table of your pricing vs theirs at common tier breakpoints — typically: starter, mid, enterprise}

### Hidden costs to watch for at {Competitor}
- {Specific cost the competitor gates / charges extra for, sourced}
- {Another, sourced}

### Hidden costs at {Your product}
- {Be honest. List anything we charge for that they include free.}

---

## Switching from {Competitor} to {Your product}

If you're already on {Competitor} and considering a move:

1. **Migration time:** {realistic estimate}
2. **Data export:** {does {competitor} support this? what format?}
3. **Lock-in:** {term length, exit clause, prorated refunds}
4. **What you lose:** {anything from {competitor} that doesn't exist on your side}
5. **What you gain:** {top 3 differentiators}

We offer {migration support / free month / concierge onboarding / etc.} for teams switching from {Competitor}.

---

## FAQ

(Each question is a real long-tail keyword from search. Answers are short,
useful, and cite the comparison data above.)

**Is {Competitor} better than {Your product}?**
{Honest answer with the "depends on what you're optimizing for" framing.}

**How much does {Competitor} cost vs {Your product}?**
{Specific price comparison.}

**Can I migrate from {Competitor} to {Your product}?**
{Yes / how / time / support offer.}

**What's the main difference between {Competitor} and {Your product}?**
{Lead with one specific structural difference — not a feature list.}

{...3-5 more FAQ items based on actual long-tail keywords...}

---

## Final word

{2-3 sentences. Neutral, honest, ends with a soft CTA — try {your product},
or talk to a human about whether it's right for your team.}

[Try {Your product} free →] [Talk to sales →]
```

### Schema markup

Embed the FAQ section as JSON-LD `FAQPage` schema. Include the comparison table as `Product` + `Review` schema. This raises the chance of rich-result rendering in SERPs.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is {Competitor} better than {Your product}?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "{the answer text from the page}"
      }
    },
    ...
  ]
}
</script>
```

## Phase 4: Quality bar

Each page must pass these checks before publish:

- **Honesty bar** — every "we win at X" claim has a public-source citation OR a customer reference. No invented advantages.
- **Acknowledgment bar** — "Where {Competitor} wins" is a real list, not a fake humility move.
- **Quote bar** — every quoted review has a real source. The skill never fabricates quotes.
- **Pricing accuracy** — competitor prices are timestamped (pricing pages change; the page footer says "as of {date}").
- **Word count** — 1,500-2,500 words. Below that, thin content. Above, diluted.
- **Internal linking** — link to your own pricing, security, customers, and at least two related comparison pages from the matrix.

## Phase 5: Output formats

Each generated page produces:

1. **Markdown source** — `output/vs-{competitor-slug}.md` (for CMS ingestion)
2. **Rendered HTML** — `output/vs-{competitor-slug}.html` (with schema)
3. **Page metadata** — `output/vs-{competitor-slug}.meta.json` with title, meta description, canonical URL, OG image suggestion, primary keyword, secondary keywords
4. **Update log** — `output/_audit.csv` listing every claim made and where it's sourced (so review/legal can spot-check)

For a matrix run (multiple competitors at once):
- `output/index.md` — list of all generated pages with their primary keyword + estimated demand
- `output/_matrix-summary.md` — overview document for the team summarizing what was built

## Phase 6: Refresh cadence

Comparison pages decay. Pricing changes, features ship, reviews accumulate. The skill produces a `refresh-triggers.json` per page:

```json
{
  "page": "vs-acme",
  "next_review": "{90 days from generation}",
  "watch_signals": [
    "{competitor} pricing page change",
    "{competitor} review-site review velocity > 2x baseline",
    "{competitor} acquired or major leadership change",
    "Our product changelog: {differentiator} feature changes"
  ]
}
```

Wire these into `signal-scanner` (existing) for automatic refresh prompts.

## Edge Cases

- **Competitor is much smaller / less known** — search demand will be tiny. Build the page anyway as a defensive move (their team may be searching), but mark low priority.
- **Competitor is much larger / dominant** — they'll outrank you on their own brand terms. Target "alternatives to {them}" instead of "us vs them" — the alternative-keyword has different intent.
- **Pricing isn't public for either side** — the comparison table flags both as "contact sales." Use review-mined pricing intel where available; never fabricate.
- **You don't have meaningful differentiators** — refuse to generate. A vs-page without a real why-us angle is page-rank pollution and erodes trust.
- **Competitor was recently acquired** — note this in the page footer ("{Competitor} was acquired by {parent} in {month}"); this affects buyer confidence.

## Cost

| Component | Cost per page |
|---|---|
| Competitor research | ~$0.10 |
| Review mining (G2, TrustRadius, Capterra) | ~$0.50-1.00 |
| Pricing fetch + parse | Free |
| LLM page generation | ~$0.10 |
| Quality-bar verification (LLM) | ~$0.05 |
| **Per page** | **~$0.75-1.25** |
| **Per 10-competitor matrix** | **~$8-13** |

## Tools Required

- `competitor-research` (existing)
- `review-site-scraper` (existing)
- `seo-opportunity-finder` (existing)
- LLM for synthesis + drafting
- Optional: `programmatic-seo-planner` (existing) for keyword strategy
- Optional: `meta-ad-scraper` and `google-ad-scraper` (existing) for paid-search insights into competitor positioning

## Trigger Phrases

- "Build vs-pages against our top competitors"
- "Generate the {Competitor} comparison page"
- "Create the alternatives-to-{Competitor} page"
- "Build the comparison matrix"
