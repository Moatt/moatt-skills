---
name: alternatives-to-page-builder
description: >
  Build "Best alternatives to {Competitor}" pages — separate from
  one-on-one comparisons. Targets the search intent of users actively
  shopping for replacements, lists 5-7 alternatives (positioning your
  product as one), gives an honest comparison matrix, and ranks
  alternatives by best-fit-by-buyer-profile. Critical SEO play
  for competitors much larger than you, where 1-on-1 comparisons
  can't compete on brand-keyword authority, grounded in DataForSEO
  SERP and Labs data.
tags: [seo, competitive-intel]
---

# Alternatives-to Page Builder

## Setup

Read your credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json does not exist, tell the user to run: `npx moatt login`

All endpoints use Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`

When you're competing against a category leader much bigger than you, "{your product} vs {giant}" pages won't outrank the giant's own brand pages. The high-leverage move is the "alternatives to {giant}" page — different intent, different SERP. People searching it are *already shopping for replacements* and the page that ranks here captures concentrated late-funnel demand.

**Built for:** Challengers competing against incumbents whose brand-keyword pages they can't outrank, but whose alternatives-keyword they can.

## When to Use

- "Build the alternatives-to-{Competitor} page"
- "Create alternative landing pages for our top competitors"
- "Generate alternatives pages for the matrix"

## Why this is different from `competitor-vs-page-builder`

| | `competitor-vs-page-builder` | `alternatives-to-page-builder` |
|---|---|---|
| Search intent | "I'm comparing two specific products" | "I want to leave my current product, what else is out there?" |
| Page scope | Two products | 5-7 products |
| Positioning | Direct head-to-head | Categorize alternatives by buyer profile |
| Best when | You're a credible peer | You're a challenger to a much bigger incumbent |
| SERP | Often dominated by the named competitor | Mostly third-party listicles + product pages |
| Tone | Confident, side-by-side | Curatorial, honest about who fits where |

The alternatives page is friendlier in tone because the reader is mid-evaluation; aggressive positioning backfires.

## Prerequisites

**Recommended:** DataForSEO credentials
- Set `MOATT_API_KEY` — routes DFS through Moatt's proxy and meters usage on your platform credits

DFS grounds the page in real SERP data — who actually ranks for "alternatives to {Competitor}", validated search volume, auto-discovered alternatives via keyword overlap, and per-alternative authority scores so you can order the list by category credibility instead of guessing.

**Fallback (no DFS):** The skill still runs using `competitor-research` + `review-site-scraper` alone, but you lose SERP intelligence and the "go/no-go" search-volume gate.

## Cost (DFS path)

| Component | Endpoint | Est. Cost |
|---|---|---|
| SERP analysis | `serp/google/organic/live/advanced` | ~$0.002 |
| Competitor discovery | `dataforseo_labs/google/competitors_domain/live` | ~$0.01 |
| Search volume validation (5 queries) | `keywords_data/google_ads/search_volume/live` | ~$0.001 |
| Per-alternative keyword strength (×5–7) | `dataforseo_labs/google/ranked_keywords/live` | ~$0.10–0.14 |
| **Typical run** | | **~$0.12–0.16** |

Add this on top of the existing competitor-research + review-mining cost (~$1–2 per page).

## Inputs

Required:
- **The competitor you're listing alternatives to** — name, URL
- **Your product** — name, URL, positioning
- **Other alternatives** — 4-6 other tools in the category. Each: name, URL, positioning. (Required — if you only list yourself, the page reads as a sales page, not a curation.)

Optional but improves quality:
- **Buyer profiles in your category** — 3-5 buyer types (e.g., "scrappy startup," "mid-market PMM team," "enterprise IT"). Used for the "best for" categorization.
- **Customer references** — for citing real people who switched
- **Pricing intelligence** — for the comparison block

## Workflow

### Phase 0.5 — SERP + Demand Intelligence (DFS)

Before researching any product, ground the page in real search data. Four DFS calls, all independent — fire concurrently.

**1) SERP analysis for "alternatives to {Competitor}"**

Pull the top 20 organic results for the exact query the page is targeting. This tells you who you're competing against on this page (typically G2/Capterra/TrustRadius listicles, plus a few product sites). The page's structure, depth, and tone should match or exceed what's already winning the SERP.

```
POST /v3/serp/google/organic/live/advanced
{
  "keyword": "alternatives to {competitor}",
  "location_code": 2840,
  "language_code": "en",
  "depth": 20
}
```

Extract: ranking domains, page titles, page types (listicle vs. product page vs. forum), SERP features (PAA, featured snippet, AI overview), average word count of top 5.

**2) Auto-discover alternatives via keyword overlap**

Don't rely on the user's hand-picked list of 4-6 alternatives. DFS Labs returns the domains with the highest keyword overlap to `{competitor}.com` — these are the most credible "alternatives" because they're already competing for the same search terms.

```
POST /v3/dataforseo_labs/google/competitors_domain/live
{
  "target": "{competitor}.com",
  "location_code": 2840,
  "language_code": "en",
  "limit": 20
}
```

Cross-reference the user's list against the DFS-discovered list. Add any high-overlap domains the user missed; flag any user-supplied alternatives that don't appear (may be too small to belong on this page).

**3) Validate search demand**

Before spending hours on the page, confirm the query has volume worth chasing.

```
POST /v3/keywords_data/google_ads/search_volume/live
{
  "keywords": [
    "alternatives to {competitor}",
    "{competitor} alternatives",
    "best {competitor} alternatives",
    "{competitor} competitors",
    "free {competitor} alternative"
  ],
  "location_code": 2840,
  "language_code": "en"
}
```

Sum monthly volume across the cluster. Decision rule:
- **>1,000/mo combined:** proceed at full quality bar (1,800–3,000 words, full schema, internal-link mesh).
- **300–1,000/mo:** proceed but cap effort — shorter page, no separate per-alternative deep dives.
- **<300/mo:** skip. The competitor is too small to justify the page; build a vs-page instead.

**4) Per-alternative authority scores**

For each of the 5–7 alternatives that survive step 2, pull their ranked-keyword footprint to score category authority.

```
POST /v3/dataforseo_labs/google/ranked_keywords/live
{
  "target": "{alternative}.com",
  "location_code": 2840,
  "language_code": "en",
  "limit": 50,
  "filters": [["keyword_data.keyword_info.search_volume", ">", 100]]
}
```

Score each alternative by: count of keywords ranked in top-10, sum of search volume across top-10 rankings, and presence in the top 5 of the SERP from step 1. Use this to order the list — most-authoritative alternatives go higher in the page (readers trust the order; burying a category leader at the bottom looks dishonest).

**Phase 0.5 outputs:**
- Current SERP rankings (who you're competing against on this page)
- Validated search-volume verdict (proceed full / proceed light / skip)
- Auto-discovered alternatives via `competitors_domain` (cross-checked against user input)
- Per-alternative authority score (drives ordering in the page body)

Run these four DFS calls in parallel — total wall time ~6–10s.

### Step 1 — Research the named competitor

**Skill:** `competitor-research` + `review-site-scraper` (existing)

Pull:
- Their stated positioning + category claim
- Top 5 praised features
- Top 5 complaints from G2/TrustRadius — these are the "why people are looking for alternatives" signals
- Pricing model
- Recent negative news / churn signals (acquisitions, leadership exits, lawsuits)

The complaints are the SEO body of the page. Frame the alternative-search itself around the most common complaints.

### Step 2 — Research each listed alternative

For each alternative (yours and the 4-6 others):

- Their positioning in their own words
- Their best-fit buyer profile (size, vertical, sophistication)
- Their pricing model + entry tier
- Their standout differentiator vs. the named competitor
- Real customers / logos for credibility

For honesty: list at least one weakness per alternative. A page that says every alternative is great loses trust.

### Step 3 — Categorize alternatives by buyer profile

Map each alternative to the buyer profile it serves best:

- "Best for scrappy startups": cheaper, simpler tools (often yours, if you fit)
- "Best for mid-market": balance of feature depth and price
- "Best for enterprise": deeper customization, larger price point
- "Best for {specific niche}": vertical-specific tools

Your product appears in *one* category (the one where you're genuinely best fit). Listing yourself in every category is sales spam and triggers SEO/trust penalties.

### Step 4 — Generate the page

```markdown
# {N} Best Alternatives to {Named Competitor} ({year})

> {One-sentence framing — neutral, acknowledges {Competitor}'s strengths, hints at why someone would shop alternatives.}

**Updated:** {date}

---

## Why people look for alternatives to {Competitor}

{2-3 paragraphs based on the review-mining complaints. Honest: the goal is to validate the reader's reason for searching, not to bash {Competitor}. List 3-5 common reasons drawn from real reviews.}

> "{Verbatim quote from a real review on G2/TrustRadius}" — *{role}, {company size}*

> "{Another verbatim quote}" — *{role}*

If those resonate, here are the {N} alternatives most worth a look.

---

## Quick comparison

| Tool | Best for | Starting price | Key differentiator |
|---|---|---|---|
| {Alternative 1} | {profile} | ${X}/mo | {differentiator} |
| {Alternative 2} | {profile} | ${X}/mo | {differentiator} |
| {Your product} | {profile} | ${X}/mo | {differentiator} |
| ... | ... | ... | ... |
| {Named Competitor} | {their best fit} | ${X}/mo | (the one being replaced) |

---

## {Alternative 1}

**Best for:** {buyer profile}
**Starting price:** ${X}/mo

{1-2 paragraphs. What it is, who it's built for.}

**Pros:**
- {Specific strength, sourced}
- {Specific strength}
- {Specific strength}

**Cons:**
- {Specific weakness — honest}
- {Specific weakness}

**vs. {Named Competitor}:** {1-2 sentences. Where this alternative wins, where the competitor still wins.}

[Try {Alternative 1} →]({url})

---

## {Alternative 2}

(Same structure)

---

## {Your product}

(Same structure — but the page editorially places yours in the slot where you're genuinely the best fit. The "vs. {Named Competitor}" line should be your strongest single differentiator, not a feature list.)

---

## {Alternatives 3-N}

(Same structure)

---

## How to choose

{2-3 paragraphs of practical guidance. Frame by buyer profile or use case — "If you're a {profile}, the right move is usually {alternative}; if you're {other profile}, look at {other alternative}."}

This is the section that builds trust. Be honest. The reader is going to land on a comparison page next; if your guidance doesn't match their experience there, they bounce on yours.

---

## Switching from {Named Competitor}: practical considerations

- **Data export:** {what {Named Competitor} supports}
- **Lock-in risk:** {term length, exit clauses}
- **Migration support:** which alternatives offer it
- **Realistic timeline:** {how long the switch typically takes}

---

## FAQ

### Why is {Named Competitor} losing customers?
{Honest answer based on review trends + complaints — usually pricing pressure, feature gaps, or specific operational issues.}

### What's the cheapest alternative to {Named Competitor}?
{Specific answer naming a tool.}

### What's the best enterprise alternative?
{Specific answer.}

### Is {Your product} a real alternative to {Named Competitor}?
{Honest answer covering when yes / when no.}

### Do any alternatives offer free migration from {Named Competitor}?
{List the ones that do.}

---

## Final word

{2-3 sentences. Neutral. Ends with a soft suggestion — try the comparison
that fits your profile, or talk to a human at one of the listed tools.}

[Browse all comparisons →]
```

### Step 5 — Add schema

Embed the FAQ as JSON-LD `FAQPage`. Add `ItemList` schema for the alternatives:

```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Best alternatives to {Competitor}",
  "itemListElement": [
    {"@type": "SoftwareApplication", "position": 1, "name": "{Alt 1}", "url": "..."},
    ...
  ]
}
```

### Step 6 — Quality bar

The page passes if:

- **You're not in every "best for" slot** — listed in exactly one editorial category
- **Each alternative has a real con** — no "every option is great"
- **Quotes are real** — sourced from actual public reviews
- **Comparison table is consistent** — same fields populated for every entry
- **Total length 1,800-3,000 words** — alternatives pages have to be more substantive than vs-pages
- **Internal links** — to the matching `{Your product} vs {Named Competitor}` page (built by `competitor-vs-page-builder`)

### Step 7 — Output

Per page generated:
- `output/alternatives/alternatives-to-{competitor-slug}.md`
- `output/alternatives/alternatives-to-{competitor-slug}.html` with schema
- `output/alternatives/alternatives-to-{competitor-slug}.meta.json`
- `output/alternatives/_audit.csv` listing every claim and source

### Step 8 — Pair with vs-pages

The strongest funnel:
1. **Top of funnel:** `alternatives-to-{Competitor}` — captures replacement intent
2. **Mid-funnel:** `{Your product} vs {Competitor}` — captures direct comparison
3. **Bottom of funnel:** Pricing + demo

The skill writes internal links from this page to the matching vs-page automatically when both exist.

## Honesty Guardrails

- Never list yourself in a category where you're a stretch. The page's SEO and trust value comes from being a useful curation. If you can't honestly fit one of the buyer profiles, restructure or skip the page.
- Never fabricate user quotes. Every quote has a public source.
- Never lie about a competitor's pricing or features. Pricing is timestamped; "as of {date}" footer is mandatory.
- Don't bury the named competitor in the comparison. Listing them at the bottom or omitting them looks defensive. They're listed at the same level as the alternatives.

## Edge Cases

- **You don't have 4-6 other strong alternatives to list** — find them. Your competitive set being larger than your immediate peers is fine. If genuinely only 2-3 alternatives exist, the page becomes a comparison page (different format), not an alternatives page.
- **Named competitor's reviews don't surface clear complaints** — they probably have a strong product; alternatives pages still work but the framing shifts from "why people are leaving" to "when people outgrow." Adjust the intro paragraph accordingly.
- **You're trying to write an alternatives page about yourself** — don't. The page only works when targeting a competitor.

## Cost

| Component | Cost per page |
|---|---|
| Competitor research | ~$0.10 |
| Review mining | ~$0.50-1.00 |
| Each alternative research (×5) | ~$0.30 |
| Page generation | ~$0.10 |
| Schema + validation | ~$0.02 |
| **Per page** | **~$1-2** |

## Tools Required

- `competitor-research` (existing)
- `review-site-scraper` (existing)
- `competitor-vs-page-builder` (Wave 1) for cross-linking
- LLM for synthesis
- Optional: keyword data for prioritization

## Trigger Phrases

- "Build alternatives-to-{Competitor} page"
- "Create alternatives pages for our matrix"
- "Generate alternatives content"
