---
name: programmatic-seo-planner
description: >
  Identify which programmatic SEO page patterns are worth building for your product —
  vs/ pages, integrations/, for-{industry}/, alternatives-to/, use-cases/ — then design
  the template structure, data model, and priority order. Emits a complete pSEO
  blueprint with URL patterns, title templates, content frameworks, and data sources
  per variable.
tags: [seo]
---

# Programmatic SEO Page Planner

## Setup

Read your credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json doesn't exist, tell the user to run: `npx moatt login`

All endpoints use Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`

Programmatic SEO is how startups produce hundreds of high-intent pages from templates — "{Your Product} vs {Competitor}", "Best {Category} for {Industry}", "{Integration} + {Your Product}". This skill figures out which patterns are worth building, designs the templates, and prioritizes the build order.

**Core principle:** pSEO isn't about spinning content. It's about finding a data axis (something that varies per page) where each variation has real search demand and your product has a real answer. This skill validates both before you invest in building.

## When to Use

- "How do we scale SEO pages without writing each one manually?"
- "Should we build vs/ comparison pages?"
- "What programmatic SEO patterns work for SaaS?"
- "How can we rank for hundreds of long-tail keywords?"
- "Plan our pSEO strategy"

## Tool Enhancement (Optional)

This skill works with existing capabilities, but produces noticeably better results paired with a keyword data API for bulk volume lookups across hundreds of long-tail variations.

### Agent Prompt to User

> "I can plan your programmatic SEO strategy with the existing tooling. For the sharpest results — especially accurate search volume across hundreds of keyword variations — I'd recommend connecting a keyword data API."
>
> **Recommended: DataForSEO** (pay-per-use, ~$0.01/keyword, no monthly minimum — ToS-clean, JSON-stable, no subscription floor)
> - Sign up at dataforseo.com → get API login + password
> - Set `MOATT_API_KEY` — routes DFS through Moatt's proxy and meters usage on your platform credits
>
> **Other supported (fallback):** Keywords Everywhere (`KEYWORDS_EVERYWHERE_API_KEY`), SEMrush (`SEMRUSH_API_KEY`), or Ahrefs (`AHREFS_API_TOKEN`). Set the corresponding env var to enable. DataForSEO is preferred for ToS-cleanness, JSON stability, and lower per-query cost.
>
> "Want to use DataForSEO or a fallback, or should I proceed with baseline mode? Baseline still works — I'll use the Apify-based SEO tools for top-level data, though volume estimates for individual long-tail patterns will be less precise."

### Mode Selection

- **Recommended mode (DataForSEO)** — Bulk keyword volume lookups via the DataForSEO API. Gives exact monthly search volume, keyword difficulty, and CPC per pattern variation. Enables confident prioritization. Falls back to Keywords Everywhere, SEMrush, or Ahrefs if their env vars are set instead.
- **Baseline mode** — Uses `seo-domain-analyzer` (Apify) for domain-level metrics and `web_search` for pattern validation. Volume estimates are directional, not exact. Still produces a solid blueprint — just less granular on per-variation demand.

## Phase 0: Intake

1. **Your product** — URL + one-sentence description
2. **Category** — What category/market do you play in?
3. **Competitors** — 3-5 competitor URLs (we'll analyze their pSEO plays)
4. **ICP** — Who's searching for your product? (roles, industries, company stages)
5. **Existing content** — Do you already have a blog/resource section? (URL if yes)
6. **CMS/tech stack** — What powers your site? (Webflow, WordPress, Next.js, etc.) — drives template feasibility
7. **Tool preference** — Enhanced mode with a keyword API, or baseline? (see Tool Enhancement above)

## Phase 1: Pattern Discovery

### 1A: Competitor pSEO Analysis

Run `site-content-catalog` for each competitor:

```bash
python3 skills/site-content-catalog/scripts/catalog_content.py \
  --url "<competitor_url>" \
  --output json
```

Inspect URL structures for programmatic patterns:
- `/vs/`, `/compare/`, `/alternatives/` — Comparison pages
- `/integrations/`, `/connect/`, `/apps/` — Integration pages
- `/for-{industry}/`, `/solutions/`, `/use-cases/` — Vertical/use-case pages
- `/templates/`, `/examples/`, `/glossary/` — Resource pages
- `/tools/`, `/calculators/`, `/generators/` — Tool pages

For each pattern, note:
- URL pattern (regex)
- Estimated page count
- What varies per page (the "data axis")
- Sample page titles

### 1B: Market Pattern Mapping

Based on your product category, weigh these standard pSEO pattern types:

| Pattern Type | URL Structure | Data Axis | Best For |
|-------------|---------------|-----------|----------|
| **Versus/Comparison** | /vs/{competitor} | Competitor names | High-intent, bottom-funnel |
| **Alternatives** | /alternatives/{competitor} | Competitor names | Displacement queries |
| **Integrations** | /integrations/{tool} | Tool/app names | Mid-funnel, ecosystem |
| **Industry verticals** | /for/{industry} | Industry names | Vertical targeting |
| **Use cases** | /use-cases/{use-case} | Job-to-be-done | Mid-funnel, discovery |
| **Glossary/Definitions** | /glossary/{term} | Industry terms | Top-funnel, authority |
| **Templates/Examples** | /templates/{type} | Template types | Mid-funnel, utility |
| **Tools/Calculators** | /tools/{tool-name} | Tool functions | Top-funnel, link bait |
| **Location pages** | /{service}-in-{city} | City/region names | Local-intent (if relevant) |

### 1C: Customer Language Mining

Run `reddit-post-finder` to find how the ICP talks about the problem:

```bash
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --subreddit "<relevant_subs>" \
  --keywords "<category>,<problem keyword>" \
  --days 365 --sort top --time year
```

Extract:
- Questions people ask → potential glossary/guide patterns
- "How do I [X] with [tool]?" → integration/use-case patterns
- "Is there a [X] for [industry]?" → vertical page patterns
- Comparison discussions → vs/ page patterns

### 1D: Keyword Volume Validation

**Recommended mode (DataForSEO). Falls back to Keywords Everywhere, SEMrush, or Ahrefs if their env vars are set.**

For each candidate pattern, generate 20-50 keyword variations and pull exact volumes:
- "your-product vs {competitor1}", "your-product vs {competitor2}", etc.
- "best {category} for {industry1}", "best {category} for {industry2}", etc.
- "{your-product} {integration1} integration", etc.

Aggregate per pattern type:
- Total addressable monthly searches across every variation
- Average volume per variation
- Volume distribution (are a few variations high-volume or is it evenly spread?)
- Average keyword difficulty

**Baseline mode:**

Use `seo-domain-analyzer` for competitor domain metrics, `web_search` to spot-check whether key variations have SERP results (indicating real demand), and manual estimation based on:
- Competitor page count per pattern (more pages = likely more demand)
- Google autocomplete suggestions for pattern variations
- Reddit/community question frequency

## Phase 2: Pattern Evaluation

Score each candidate pattern on:

| Factor | Weight | How to Assess |
|--------|--------|---------------|
| **Search demand** | 30% | Total addressable volume across every variation |
| **Intent quality** | 25% | How close to purchase decision? (vs/ = high, glossary = low) |
| **Template feasibility** | 20% | Can you create a useful, differentiated page from a template? |
| **Data availability** | 15% | Can you programmatically source the data that varies? |
| **Competitive gap** | 10% | Are competitors NOT doing this pattern, or doing it poorly? |

Score each pattern 0-100. Rank by score.

### Feasibility Check Per Pattern

For each pattern scoring 50+, validate:

1. **Data source** — Where does the variable data come from?
   - Competitor names → manual list (finite, high-value)
   - Integration/tool names → API marketplace, app directory
   - Industry names → standard industry lists
   - Terms/glossary → keyword research output
   - Templates → product feature matrix

2. **Content differentiation** — Can each page offer real value, or will they be thin?
   - vs/ pages need real feature comparisons, not just "we're better"
   - Integration pages need actual setup guides or use cases
   - Vertical pages need industry-specific pain points and examples

3. **Technical feasibility** — Can your CMS generate these at scale?
   - Static site generators (Next.js, Astro) → excellent for pSEO
   - Webflow CMS → good, max 10K items per collection
   - WordPress → good with custom post types
   - Manual creation → not pSEO, just a lot of pages

## Phase 3: Template Design

For each pattern being built, design:

### Template Blueprint

```markdown
## Pattern: [vs/{competitor}]

### URL Structure
/vs/{competitor-slug}

### Title Template
{Your Product} vs {Competitor} — [Year] Comparison | {Your Brand}

### Meta Description Template
Compare {Your Product} and {Competitor} side-by-side. See pricing, features,
pros/cons, and which is better for {ICP description}.

### H1
{Your Product} vs {Competitor}: Honest Comparison

### Page Sections (content framework)
1. **TL;DR** — 3-sentence summary of key differences (above fold)
2. **Quick comparison table** — Feature matrix with checkmarks
3. **Detailed comparison** — 4-6 key dimensions, 2-3 paragraphs each
4. **Pricing comparison** — Plan-by-plan breakdown
5. **Who should choose {Your Product}** — ICP fit description
6. **Who should choose {Competitor}** — Fair assessment
7. **What real users say** — Review quotes from both sides
8. **CTA** — Trial/demo prompt

### Data Required Per Page
- competitor_name: string
- competitor_slug: string
- competitor_features: array (from their website/docs)
- competitor_pricing: object (from pricing page)
- competitor_reviews: array (from G2/Capterra)
- your_differentiators: array (per competitor)

### Content Guidelines
- Minimum 1,500 words per page
- Must include at least one unique insight (not just feature lists)
- Use actual screenshots or diagrams where possible
- Update quarterly (pricing/features change)
```

Repeat for each pattern type.

## Phase 4: Prioritization & Roadmap

Build the implementation plan:

### Priority Matrix

| Pattern | Score | Est. Pages | Volume/Page | Total Volume | Build Effort | Priority |
|---------|-------|-----------|-------------|-------------|-------------|----------|
| vs/ comparisons | 85 | 15 | 300 | 4,500 | Medium | P0 — Build first |
| integrations/ | 72 | 40 | 80 | 3,200 | High | P1 — Build second |
| for-{industry}/ | 68 | 12 | 200 | 2,400 | Medium | P1 — Build second |
| alternatives-to/ | 65 | 8 | 250 | 2,000 | Low | P0 — Quick win |
| glossary/ | 45 | 100 | 40 | 4,000 | Low | P2 — Authority play |

### Recommended Buildout Sequence

**Month 1: Quick wins**
- Build [pattern A] — [X] pages, [rationale]
- Build [pattern B] — [X] pages, [rationale]

**Month 2: Scale**
- Build [pattern C] — [X] pages, [rationale]
- Measure Month 1 patterns, iterate templates

**Month 3: Expand**
- Build [pattern D] — [X] pages, [rationale]
- Update Month 1 pages with performance data

### Per-Pattern Data Source Plan

For each pattern, specify exactly where the variable data comes from:
- Manual curation (competitors list — finite, high quality)
- API source (integration marketplace)
- Scraping (review sites, competitor pages)
- Internal data (product features, pricing)

## Phase 5: Output

```markdown
# Programmatic SEO Blueprint — [Product Name] — [DATE]

## Executive Summary
- [N] patterns evaluated, [M] recommended for buildout
- Total addressable search volume: [X]/month
- Estimated pages to build: [Y]
- Recommended buildout timeline: [Z] months

---

## Pattern Analysis (ranked by priority)

### P0: [Pattern Name]
- URL structure: [pattern]
- Pages to build: [N]
- Total monthly volume: [X]
- Template blueprint: [see below]
- Data source: [where variable data comes from]
- Build effort: [Low/Medium/High]
- Expected time to rank: [2-4 months / 4-8 months / etc.]

[Full template blueprint per Phase 3]

### P1: [Pattern Name]
...

---

## Technical Requirements
- CMS: [capabilities needed]
- Data pipeline: [how to source variable data]
- Update cadence: [how often to refresh]

---

## Quick-Start Guide
1. Start with [pattern] — lowest effort, highest intent
2. Create [N] pages using the template above
3. Monitor for [X] weeks before expanding
4. ...
```

Save to the current working directory or wherever the user prefers.

## Cost

| Component | Cost |
|-----------|------|
| Site catalog per competitor (Apify) | ~$0.05-0.10 |
| Reddit scraper | ~$0.05-0.10 |
| SEO domain analyzer | ~$0.10-0.20 |
| DataForSEO keyword lookups (recommended) | ~$0.50-2.00 (depending on variation count) |
| Fallback tools (Keywords Everywhere, SEMrush, Ahrefs) | ~$0.01-0.05 (if using instead of DFS) |
| Analysis | Free (LLM reasoning) |
| **Total (baseline)** | **~$0.20-0.50** |
| **Total (enhanced)** | **~$0.70-2.50** |

## Tools Required

- **Apify API token** — `APIFY_API_TOKEN` env var
- **Upstream skills:** `site-content-catalog`, `seo-domain-analyzer`, `reddit-post-finder`
- **Recommended:** DataForSEO via Moatt (`MOATT_API_KEY`) — pay-per-use, ~$0.01–0.05 per query metered on your Moatt account, no monthly subscription.
- **Other supported (fallback):** Keywords Everywhere (`KEYWORDS_EVERYWHERE_API_KEY`), SEMrush (`SEMRUSH_API_KEY`), or Ahrefs (`AHREFS_API_TOKEN`). Set the corresponding env var to enable. DFS is preferred for ToS-cleanness, JSON stability, and lower per-query cost.

## Trigger Phrases

- "Plan our programmatic SEO strategy"
- "What pSEO pages should we build?"
- "Design vs/ comparison pages for our product"
- "How do we scale to hundreds of SEO pages?"
- "Build a pSEO blueprint for [client]"
- "What programmatic patterns should we use?"
