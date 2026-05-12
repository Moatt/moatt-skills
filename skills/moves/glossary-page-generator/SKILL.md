---
name: glossary-page-generator
description: >
  Generate ranking-ready glossary / definition pages programmatically
  for a list of category terms. Each page covers definition, "what is X
  vs Y" disambiguation, common confusion points, real-world examples,
  and an FAQ block with schema markup. Designed to capture top-of-funnel
  "what is X" search intent and feed search engines a clean entity-rich
  source for AI Overviews and citations. Uses DataForSEO for term volume,
  related keywords, and SERP intelligence.
tags: [seo, content]
---

# Glossary Page Generator

## Setup

Read your credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json does not exist, tell the user to run: `npx moatt login`

All endpoints use Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`

"What is {term}" pages have outsized SEO leverage: they capture the highest top-of-funnel search volume in a category, get cited heavily by AI search engines, and (when done well) become the most-linked-to internal asset on a marketing site. This skill builds them properly — not lorem-ipsum templates, but real entity-rich definitions with disambiguation, examples, and FAQ schema.

**Built for:** SEO + content teams that want a programmatic glossary section without the usual programmatic-SEO penalty (thin content, doorway pages).

## Prerequisites

**Recommended (production):** DataForSEO credentials
- Sign up at [dataforseo.com](https://dataforseo.com) → API → copy login + password
- Set `MOATT_API_KEY` — routes DFS through Moatt's proxy and meters usage on your platform credits

DFS gives exact monthly volume + CPC per term, the related-keyword tree (where "X vs Y" disambiguations live), and the live top-10 SERP per primary keyword (for competitor structure analysis). All three are load-bearing for the quality gate.

**Free fallback (no DFS):** WebSearch
- Uses `web_search` for term-research and manual analysis of top SERP results
- Volumes are estimated, related-keyword discovery is shallow, competitor-structure analysis is manual — output quality is meaningfully lower

## When to Use

- "Generate glossary pages for these terms"
- "Build the {Category} glossary"
- "Create 'what is X' pages for our top keywords"
- "Run the glossary generator"

## Inputs

Required:
- **Term list** — the glossary terms to generate. CSV / JSON / typed list. Each entry needs: term name. Optional fields per term: priority, target keyword variants, related terms, parent category.

Optional but improves quality:
- **Category context** — the parent domain (e.g., "RevOps glossary", "Data engineering glossary"). Calibrates voice and depth.
- **Existing site sitemap** — for internal-link suggestions
- **Brand voice guide** — neutral / authoritative / casual
- **Seed examples** — 1-2 reference glossary pages from competitors that rank well, so the skill can match length / depth norms
- **Schema markup preferences** — DefinedTerm / Article / FAQPage default; can opt out

## What a glossary page actually needs

To rank — and especially to be cited by AI Overviews — the page must include:

1. **A clear, single-sentence definition** — answers the literal "what is X" query
2. **A 1-paragraph elaboration** — context, who uses it, why it matters
3. **Disambiguation** — what X is *not*, what's commonly confused with X
4. **Real examples** — concrete, named, where possible
5. **Adjacent terms** — `X vs Y`, `X vs Z` (the long-tail keyword harvest)
6. **FAQ block** — 3-5 questions taken from real long-tail variants, with concise answers
7. **Schema markup** — DefinedTerm + FAQPage JSON-LD
8. **Internal links** — to related glossary pages and product pages

Pages without disambiguation and concrete examples are typically the ones that fail to rank. The skill enforces these as required sections.

## Workflow

### Step 1 — Term research per term

For each term, run three DFS calls in parallel (DFS path is primary; WebSearch fallback only if `MOATT_API_KEY` is unset).

**1. Search volume + CPC for the term and its primary variants**

```
POST /v3/keywords_data/google_ads/search_volume/live
{
  "keywords": [
    "customer success",
    "what is customer success",
    "customer success vs customer support",
    "customer success definition",
    "customer success meaning"
  ],
  "location_code": 2840,
  "language_code": "en"
}
```

Returns per keyword: `search_volume`, `cpc`, `competition`, `low_top_of_page_bid`, `high_top_of_page_bid`. Use this to populate `monthly_volume_estimate` for the primary keyword and rank the secondary keywords by volume. Drop the term entirely if the primary keyword volume is below the floor set by the user (default: 50/mo).

**2. Related-keyword tree (the disambiguation + long-tail harvest)**

```
POST /v3/dataforseo_labs/google/related_keywords/live
{
  "keyword": "customer success",
  "location_code": 2840,
  "language_code": "en",
  "limit": 30,
  "depth": 2
}
```

Returns the related-keyword tree with volumes per node. From this:
- Filter for `vs`, `versus`, `or`, `compared to` patterns → `disambiguation_candidates` (the long-tail "X vs Y" harvest)
- Filter for question patterns (`what is`, `how does`, `why`, `when to use`) → seed for the `people_also_ask` field and the FAQ block
- Pick the top 3-5 highest-volume related terms → `secondary_keywords`

Optionally, if the related-keywords tree is thin, run `dataforseo_labs/google/keyword_suggestions/live` with the same term to find additional surface variants.

**3. Top-10 SERP for structure analysis**

```
POST /v3/serp/google/organic/live/advanced
{
  "keyword": "what is customer success",
  "location_code": 2840,
  "language_code": "en",
  "depth": 10
}
```

Returns the top 10 ranking pages (URL, title, description) plus SERP features (PAA, featured snippet, AI overview presence). Pull the top 3 URLs and fetch their HTML — analyze their structure, length, and specific subsections so the generated page has parity. Capture any `people_also_ask` block from the SERP features into the dossier directly (these are the highest-quality FAQ candidates).

**4. Identify real-world examples**

Search for the term + "example" / "real world" / specific named tools or companies that exemplify it. WebSearch is fine here — examples don't need volume data.

**Fallback (no DFS):** Use `web_search` for "{term}", "{term} vs", "what is {term}", and "{term} examples". Manually inspect autocomplete + PAA boxes for disambiguation candidates. Volume estimates will be directional only.

Output a per-term research dossier:

```json
{
  "term": "",
  "primary_keyword": "what is {term}",
  "secondary_keywords": ["{term} definition", "{term} meaning", "{term} explained"],
  "monthly_volume_estimate": 0,
  "difficulty_estimate": 0,
  "people_also_ask": [],
  "disambiguation_candidates": [{"vs_term": "", "reason_for_confusion": ""}],
  "real_examples": [{"name": "", "context": ""}],
  "competitor_pages": [{"url": "", "word_count": 0, "structure": []}]
}
```

### Step 2 — Generate the page

Use this exact structure. Length target: 800-1,500 words (longer = thinner; shorter = often insufficient for entity coverage).

```markdown
# {Term}

> {One-sentence definition. ≤25 words. The exact answer to "what is {term}".}

## Definition

{1-2 paragraph elaboration. Who uses it. Why it matters. The non-obvious dimension.}

## How it works

{2-3 paragraphs explaining the mechanism, process, or structure. Concrete, not abstract. Use bullets where structure helps.}

## What it's not

{1-2 paragraphs on common misconceptions. Distinguishes {term} from related concepts.}

### {Term} vs {disambiguation candidate 1}
{2-4 sentences with a specific differentiator.}

### {Term} vs {disambiguation candidate 2}
{Same.}

## Real examples

{Concrete examples — named where possible. 2-3 examples with context.}

- **{Example 1}:** {What it is, how it relates to {term}}
- **{Example 2}:** {Same}
- **{Example 3}:** {Same}

## When you'll encounter {term}

{1-2 paragraphs on use cases / situations / personas. Helps the reader self-identify why they care.}

## FAQ

### {Long-tail question 1, taken from "people also ask"}
{Concise answer, 1-2 sentences.}

### {Long-tail question 2}
{Concise answer.}

### {Long-tail question 3}
{Concise answer.}

### {Long-tail question 4 — optional}
{Concise answer.}

## Related terms

- [{Related term 1}]({internal link}) — {one-line definition}
- [{Related term 2}]({internal link}) — {one-line definition}
- [{Related term 3}]({internal link}) — {one-line definition}

## Sources

{1-3 authoritative sources, real, cited. Industry standards, RFCs, named books / authors. Improves trust + citation likelihood.}

---
*Last updated: {date}*
```

### Step 3 — Add schema markup

Append JSON-LD blocks for:

#### DefinedTerm
```json
{
  "@context": "https://schema.org",
  "@type": "DefinedTerm",
  "name": "{term}",
  "description": "{one-sentence definition}",
  "inDefinedTermSet": {
    "@type": "DefinedTermSet",
    "name": "{Category} Glossary",
    "url": "{glossary-index-url}"
  },
  "url": "{this-page-url}"
}
```

#### FAQPage
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "{long-tail question 1}",
      "acceptedAnswer": {"@type": "Answer", "text": "{answer 1}"}
    },
    ...
  ]
}
```

### Step 4 — Quality gate

Each generated page passes:

- **Length:** 800-1,500 words (warn if outside)
- **Structure completeness:** definition ✓, how it works ✓, disambiguation ✓ (≥1), real examples ✓ (≥2), FAQ ✓ (≥3)
- **Concrete examples:** named entities (companies, tools, products), not generic. Reject "for example, a marketing automation system" without specifying which one.
- **Citation:** at least 1 external authoritative source
- **No fluff:** banned phrases — "in today's fast-paced", "leveraging", "synergize", "in a world where", "more than ever"
- **Disambiguation specificity:** the "X vs Y" sections must have a concrete differentiator, not a tautology

Pages failing the gate are flagged for human review with the specific issues, not auto-shipped.

### Step 5 — Output bundle

Per-term:
- `output/glossary/{term-slug}.md` — markdown page
- `output/glossary/{term-slug}.html` — rendered HTML with schema
- `output/glossary/{term-slug}.meta.json` — title, meta description, canonical URL, OG image suggestion
- `output/glossary/{term-slug}.research.json` — the term research dossier (for refresh runs)

Plus an index:
- `output/glossary/_index.md` — list of all generated pages with their primary keyword + monthly volume estimate
- `output/glossary/_audit.csv` — quality gate results per page

### Step 6 — Internal linking pass

After all pages are generated, run a second pass to wire up internal links:

1. For each page, identify mentions of other glossary terms in the same set
2. Replace the first occurrence on each page with an internal link
3. Add a "Related terms" section at the bottom listing 3-5 most-related pages
4. Generate an `_index.md` glossary landing page that lists every term

This compounds SEO value — one internal link per page is fine; 3-5 in body content + a related-terms block is better.

## Anti-patterns

- **Definition that just rephrases the question** ("X is the practice of doing X") — rejected
- **Examples that are not named** — rejected
- **Pages with identical structure across all terms** — looks programmatic. The skill varies subsection emphasis based on the term's actual nature (process-y terms get a "how it works" focus; concept terms get more disambiguation; tool terms get more "real examples").
- **Stuffing the term in every paragraph** — natural use only. Schema + h1 + meta description carry the keyword signal; body content shouldn't repeat the term mechanically.
- **Padding to hit a word count** — if the term genuinely fits in 600 words, leave it at 600. Quality > word count.

## Refresh strategy

Glossary pages decay slowly — definitions are stable, but examples and tooling change. Mark each page for refresh annually. The skill produces a `refresh.json` per term so a quarterly cron can find pages where:

- The "real examples" tool / company section references a now-defunct entity
- A new related term has emerged that should be added to disambiguation
- Search intent has shifted (the people-also-ask block has changed significantly)

## Cost (DFS path)

| Component | Endpoint | Est. Cost |
|---|---|---|
| Term volume + CPC (per term) | `keywords_data/google_ads/search_volume/live` | ~$0.001 |
| Related keywords tree (per term) | `dataforseo_labs/google/related_keywords/live` | ~$0.01 |
| Top SERP analysis (per term) | `serp/google/organic/live/advanced` | ~$0.002 |
| **Typical 50-term run** | | **~$0.65** |

LLM generation, schema generation, and quality-gate validation are on top of the DFS data cost:

| Component | Cost per page |
|---|---|
| DFS term research (volume + related + SERP) | ~$0.013 |
| Page generation | ~$0.05 |
| Schema generation | ~$0.005 |
| Quality gate validation | ~$0.01 |
| **Per page** | **~$0.08** |
| **Per 50-term glossary (DFS path)** | **~$4-5** |

## Tools Required

- LLM for content generation
- DataForSEO (preferred) — `MOATT_API_KEY` env var (routes through Moatt's DataForSEO proxy)
- Web search for real-world examples and (fallback) term research
- Read/Write for output files

## Trigger Phrases

- "Generate glossary pages for {terms}"
- "Build the {Category} glossary"
- "Create 'what is X' pages"
- "Run the glossary generator"
