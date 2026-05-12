---
name: comparison-matrix-builder
description: >
  Generate a structured feature/pricing/fit comparison matrix across
  N tools in the same category. Each cell is sourced — pricing pages,
  product docs, G2/TrustRadius features lists, public roadmap. Outputs
  a clean markdown / HTML / CSV matrix ready for sales enablement,
  proposal docs, or competitor-vs page generation. Distinct from
  competitor-vs-page-builder (full marketing page); this is the data
  asset you reuse downstream.
tags: [competitive-intel]
---

# Comparison Matrix Builder

A clean, sourced feature/pricing matrix is the most-reused asset in sales enablement. Every battlecard, vs-page, sales deck, and procurement objection answer pulls from one. This skill builds it once, sourced and updateable, so downstream artifacts stay consistent rather than drifting.

**Built for:** Product marketing, sales enablement, and competitive intel teams that maintain comparison content and want to stop rebuilding the same data five different ways.

## When to Use

- "Build the comparison matrix for {Category}"
- "Generate the feature comparison across {Tool list}"
- "Refresh the {Competitor} pricing matrix"
- "Create the comparison data for the battlecard / vs-page"

## What's in the matrix

The matrix has three sections:

### Section A: Feature comparison

| Feature | Tool A | Tool B | Tool C | Notes |
|---|---|---|---|---|
| {feature 1} | Yes (since v3.2) | Limited | No | Core differentiator for B |
| {feature 2} | Yes | Yes | Yes | Table-stakes |
| {feature 3} | No | Yes | Yes (enterprise tier) | Pricing gate on C |

Each cell sourced. Each cell timestamped.

### Section B: Pricing comparison

| Tier | Tool A | Tool B | Tool C |
|---|---|---|---|
| Free | 5 users / unlimited projects | Not offered | 1 user / 14-day trial |
| Starter | $29/seat/mo | $50/seat/mo | $39/seat/mo |
| Pro | $79/seat/mo | $125/seat/mo | $99/seat/mo |
| Enterprise | Contact sales (~$200K floor) | Contact sales | Contact sales (~$150K floor) |
| Hidden costs | Implementation extra | Overages on storage | API rate limits in lower tiers |

### Section C: Fit profile

| | Tool A | Tool B | Tool C |
|---|---|---|---|
| Best for company size | 50-500 | 200-2,000 | 1,000+ |
| Best for vertical | SaaS, fintech | Manufacturing, retail | Enterprise generally |
| Setup time | 1-2 weeks | 4-8 weeks | 8-16 weeks |
| Tech stack alignment | Modern (Snowflake, Looker, dbt) | Legacy (SQL Server, SAP) | Hybrid |
| Support tier | Slack channel + email | Account manager + email | Dedicated CSM |
| Customer profile | Mid-market growth | Mid-market established | Enterprise |

## Inputs

Required:
- **Tool list** — names + URLs of tools to compare. Typically 3-5 (your product + 2-4 competitors). Larger comparisons get unreadable.
- **Feature dimensions** — explicit list of features to compare. (Don't let the LLM make up features; only compare on explicit dimensions you care about.)

Optional but improves quality:
- **Existing customer references** for fit-profile validation
- **Pricing intelligence** from sales calls (real quoted prices, not just public pricing)
- **Sources to consult** — preferred pricing pages, docs URLs, review sites
- **Last-updated timestamp** for staleness checking

## Workflow

### Step 1 — Per-tool research

For each tool:

#### Pricing
- Fetch pricing page
- Parse tiers: name, monthly/annual cost per unit (seat/usage/flat), what's included
- Detect "contact sales" tiers and estimate floor from review sites / aggregator data
- Note hidden costs: implementation, overages, integration fees, data egress

#### Features
- For each feature dimension in the input list, search:
  - Tool's public documentation
  - Tool's changelog / release notes
  - G2 / TrustRadius feature lists
  - Tool's product page
- Score each cell:
  - **Yes** — feature is fully present (cite source)
  - **Limited** — feature exists but with constraints (cite which constraint)
  - **No** — feature is absent (verify by searching for "X support" in docs / changelog)
  - **Unknown** — couldn't verify; flag for manual review
- Always include the source URL + timestamp per cell

#### Fit profile
- Best-fit company size: from review-site customer-size distribution + tool's stated target audience
- Best-fit vertical: from customer logos + case studies on the tool's site
- Setup time: from review-mining ("time to value" mentions) + tool's onboarding docs
- Tech stack: from integration docs + customer mentions in reviews

### Step 2 — Build the matrix

Compose the three sections with all cells sourced. Each table is generated fresh from the per-tool data. No hand-edits at this stage; the data is what the data is.

### Step 3 — Highlight differentiators

After the raw matrix, the skill produces a "Differentiation summary" — but only with grounded evidence:

```markdown
## Differentiation summary

### {Tool A} wins on:
- {Feature X}: only tool with {specific capability}, sourced from {URL}
- Pricing transparency: published list price; competitors require sales contact
- Setup time: 1-2 weeks vs. 4-16 weeks for alternatives

### {Tool B} wins on:
- {Feature Y}: deeper coverage on {specific dimension}
- Enterprise support: dedicated CSM included from $X tier; competitors charge separately

### Tied / table-stakes:
- {Feature Z}: all three offer
- Integrations: roughly comparable footprint

### Honest gaps in {Tool A}:
- {Feature W}: missing; competitors have it
- Vertical fit: not yet positioned for manufacturing
```

The honesty section is mandatory. Matrices that pretend your tool wins everywhere damage credibility downstream.

### Step 4 — Output formats

The matrix is generated in three formats simultaneously:

#### Markdown
- `output/matrix-{category}-{date}.md` — for direct embedding in docs, README, vs-pages

#### HTML (with schema)
- `output/matrix-{category}-{date}.html` — `Product` + `Offer` + `ItemList` schema for SEO use
- Use this when feeding into `competitor-vs-page-builder` or `alternatives-to-page-builder`

#### CSV
- `output/matrix-{category}-{date}.csv` — for sales enablement systems, spreadsheets, slide-rendering

#### Source-of-truth JSON
- `output/matrix-{category}-{date}.json` — full structured data with sources, timestamps, confidence per cell. The downstream artifacts read this; it's the canonical version.

```json
{
  "category": "ABM platforms",
  "generated_at": "...",
  "tools": [
    {
      "name": "Tool A",
      "url": "...",
      "pricing": {
        "tiers": [
          {"name": "Free", "price_per_seat_mo": 0, "included": [...], "limits": [...], "source": "..."},
          ...
        ],
        "hidden_costs": [...]
      },
      "features": {
        "{feature_id}": {
          "status": "yes | limited | no | unknown",
          "detail": "...",
          "source": "...",
          "verified_at": "..."
        }
      },
      "fit": {...}
    }
  ]
}
```

### Step 5 — Quality gate

The matrix passes if:

- Every feature cell has a source URL or is explicitly marked `unknown`
- Every pricing tier has a source
- Every fit-profile claim has a source or is explicitly inferred (with the inference cited)
- The honesty section is non-empty for the home tool — at least one real gap must be acknowledged
- No cell contradicts the source (e.g., the source says "limited support" but the cell claims "yes")

Pages failing the gate are flagged with the specific issues.

### Step 6 — Refresh strategy

The matrix decays. Pricing changes, features ship, tools get acquired. The skill produces a `refresh.json` indicating:
- Each cell's age
- Sources to re-fetch
- Specific signals that should trigger a partial refresh:
  - Tool A pricing page changed → refresh A's pricing rows
  - Tool B published a major changelog entry → refresh B's features
  - Tool C was acquired → refresh entirely + add an "acquisition note"

Wire `refresh.json` into `signal-scanner` (existing) for automation.

## Honesty Guardrails

- **No invented features.** If you don't know whether Tool B does X, the cell is `unknown`, not a guess.
- **No invented prices.** Public pricing or it's `contact sales` with a floor estimate (sourced).
- **Honest gaps in your own tool.** A matrix that claims you win everywhere is unreliable; reps and prospects spot it instantly.
- **Timestamp every cell.** A 6-month-old pricing claim is not a current claim.

## Edge Cases

- **Open-source tool with no formal pricing** — pricing section becomes "Open-source; commercial offering at {URL} starts at {tier}". The free tier is "self-host any scale."
- **Tool just acquired or merged** — note prominently. Roadmap and pricing are uncertain post-acquisition; mark cells with reduced confidence.
- **Tool is in a different category but listed for completeness** — flag explicitly. Comparing a horizontal tool to a vertical tool requires noting that they're not direct competitors.
- **Feature is genuinely complex** — single yes/no doesn't capture it. Use `limited` with a detailed `detail` field rather than collapsing.

## Cost

| Component | Cost |
|---|---|
| Per-tool research (LLM + web fetch + review mining) | ~$1-2 |
| Matrix synthesis (LLM) | ~$0.10 |
| Output generation across 4 formats | ~$0.05 |
| Quality validation | ~$0.05 |
| **Per matrix, 4-tool comparison** | **~$5-10** |

## Tools Required

- LLM for synthesis + cell verification
- Web fetch for pricing pages, docs, changelogs
- `review-site-scraper` (existing) for review-derived fit signals
- Optional: `competitor-research` (existing) for richer competitor data
- Optional: integration with downstream artifacts (`competitor-vs-page-builder`, `battlecard-generator`)

## Trigger Phrases

- "Build the comparison matrix for {Category}"
- "Generate feature comparison across {Tools}"
- "Refresh the {Competitor} pricing matrix"
- "Create comparison data for the battlecard"
