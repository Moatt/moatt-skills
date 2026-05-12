---
name: geo-audit
description: >
  Generative Engine Optimization (GEO) audit — review a website's
  content for AI-search citation readiness. Audits structure (Q&A,
  entity coverage, schema), tone (declarative vs. fluff), citations
  (sources, dates), llm.txt presence, and prompt-fit (does the page
  answer the queries AI engines actually receive). Outputs a
  prioritized fix list ranked by AI citation impact.
tags: [seo]
---

# GEO Audit

Traditional SEO optimizes for search engines that crawl + rank. GEO (Generative Engine Optimization) optimizes for AI search engines (ChatGPT, Perplexity, Claude, Gemini) that retrieve + cite. The structures that win are different — Q&A patterns, entity-rich definitions, declarative claims with sources, and `/llm.txt`. This skill audits a site against the GEO patterns that drive citation rates.

**Built for:** SEO teams that have already won traditional search and want to audit their citation footprint in AI search, or earlier-stage teams that want to skip the SEO-only path and build a GEO-native content strategy.

## When to Use

- "Audit our site for AI search citation readiness"
- "Run the GEO audit on {domain}"
- "Why isn't ChatGPT citing us? Audit the content."
- "Compare our GEO posture to {competitor}"

## What GEO actually measures

A page that gets cited by AI engines does these things:

| GEO factor | What it means |
|---|---|
| **Direct-answer-first** | The first sentence or paragraph answers the literal query, not introduces the topic. |
| **Q&A structure** | Headers are questions; content under each header is an answer. |
| **Entity coverage** | Names specific tools, companies, frameworks, methods, people. AI engines retrieve based on entity matches. |
| **Declarative tone** | "X does Y" not "X may help with Y." Hedged content gets cited less. |
| **Citations + dates** | "{Source}, {date}" makes claims auditable. Auditable content ranks higher in retrieval. |
| **Schema markup** | FAQPage, DefinedTerm, Article, HowTo — structured data is heavy retrieval signal. |
| **llm.txt + llms-full.txt** | Direct AI crawler manifest at site root. |
| **Internal linking** | Hub-and-spoke topical authority across pages. |
| **Freshness** | Recent dates in content + last-modified headers. |
| **Prompt-fit** | Does the content actually answer the queries users type into ChatGPT/Perplexity? |

The skill scores each factor 0-100 and produces a prioritized fix list.

## Inputs

Required:
- **Domain or specific URLs** — the site or pages to audit. If a domain is given, the skill auto-selects 20-50 high-traffic / high-priority pages.

Optional but improves accuracy:
- **Target query list** — the specific AI-search queries you want to be cited for (e.g., "best ABM platform for under-200-ARR teams"). The audit scores prompt-fit per query.
- **Competitor list** — for comparative scoring (your GEO posture vs. theirs)
- **Existing llm.txt path** — if one already exists, the audit verifies completeness rather than recommending creation
- **Sitemap URL**

## Workflow

### Step 1 — Crawl the page set

For the domain or URL list:

1. Fetch each page (HTML)
2. Extract: title, meta description, canonical, h1-h6, body text, schema, last-modified header, internal links
3. Convert body to markdown for clean text analysis
4. Cache per page

If a sitemap is provided, prioritize pages by URL pattern hints (`/docs/`, `/blog/`, `/customers/`, `/{vertical}/`) and recency.

### Step 2 — Score each page on the GEO factors

#### Factor 1: Direct-answer-first
- Does the first paragraph answer "what is this page about" in 1-2 sentences? Or does it open with a marketing intro ("In today's fast-paced world...")?
- Score: 100 if the first sentence is a direct answer; 50 if there's an intro paragraph then an answer; 0 if there's no clear answer at all.

#### Factor 2: Q&A structure
- How many h2/h3 headings are phrased as questions vs. statements?
- Score: % of headings that are questions × 100. (Not all headings need to be questions; 30-50% is healthy.)

#### Factor 3: Entity coverage
- Run a named-entity check. Count specific entities (companies, tools, products, people, frameworks, methods).
- Score: 100 if ≥20 named entities per 1k words; 50 if 10-19; 0 if <10.
- Note: entity count is *not* keyword stuffing — entities are real-world referents that AIs use to anchor retrieval.

#### Factor 4: Declarative tone
- Count hedge phrases vs. declarative claims. Hedges: "may", "might", "could", "tends to", "often", "sometimes", "in some cases", "potentially". Declarative: definite verbs, named numbers, named subjects.
- Score: 100 if hedge ratio < 5% of sentences; 50 if 5-15%; 0 if >15%.

#### Factor 5: Citations + dates
- Count external citations (links, sourced quotes, cited statistics). Are dates present?
- Score: 100 if every claim that needs a source has one; 50 if some sourced; 0 if no citations.

#### Factor 6: Schema markup
- Detect JSON-LD blocks. Score on schema type appropriateness:
  - Glossary/definition page → DefinedTerm + Article: full
  - Product page → Product + Offer: full
  - Article → Article + Author: full
  - FAQ section → FAQPage: full
- Score: % of expected schema types present × 100.

#### Factor 7: llm.txt presence (site-level, not per-page)
- Check `https://{domain}/llm.txt`. Does it exist? Is it well-formed (per llmstxt.org spec)?
- Score: 100 if present + well-formed; 50 if present but partial; 0 if missing.

#### Factor 8: Internal linking
- Count internal links per page. How many link to other pages with related topical content?
- Score: 100 if 5-15 contextual internal links per long-form page; 50 if 1-4; 0 if 0.

#### Factor 9: Freshness
- Last-modified header date + any in-content "updated" / "last reviewed" mention
- Score: 100 if updated in last 6 months; 50 if 6-18 months; 0 if older or undated.

#### Factor 10: Prompt-fit
- For each target query (if provided), simulate retrieval: which page chunks would actually be retrieved?
- Score: 100 if the page contains a chunk that directly answers the query; 50 if it has related content that would partially answer; 0 if no match.
- This is the highest-leverage check — prompt-fit is a stronger signal than the structural ones.

### Step 3 — Aggregate page scores

Each page gets a composite GEO score:

```
GEO score = (direct_answer × 0.15) + (qa_structure × 0.10) + 
            (entity_coverage × 0.15) + (declarative_tone × 0.10) +
            (citations × 0.10) + (schema × 0.10) + 
            (internal_linking × 0.10) + (freshness × 0.05) +
            (prompt_fit × 0.15)
```

(Note: `llm.txt` is site-level, contributes once across all pages, not per-page.)

Tier:
- 75-100: Strong GEO posture
- 50-74: Moderate; specific gaps
- 0-49: Weak; needs systematic rewrite

### Step 4 — Generate the prioritized fix list

For each page, surface the top 3 fixes ranked by impact × ease:

| Fix type | Impact | Ease | Composite |
|---|---|---|---|
| Rewrite first paragraph as direct answer | High | High | Top priority |
| Add FAQPage schema | High | High | Top priority |
| Add 5-10 named entities to body | High | Medium | High priority |
| Add 3-5 internal links | Medium | High | High priority |
| Soften hedges → declarative | Medium | Medium | Medium |
| Add `/llm.txt` (site-level) | Very high | Medium | Very high (one-time) |
| Add citations + dates | High | Medium | High |
| Update last-modified | Low | Very high | Quick win |
| Restructure h2s as questions | Medium | Low | Medium |

### Step 5 — Output

```markdown
## GEO Audit — {domain} — {date}

**Pages audited:** {N}
**Average GEO score:** {avg}/100
**Pages with strong posture (≥75):** {K}
**Pages needing systematic work (<50):** {M}
**llm.txt:** {present-and-well-formed | present-but-partial | missing}

---

### Top fixes (site-wide — fix once, benefit everywhere)

1. **{Fix}** — {impact reasoning}
2. **{Fix}** — {impact}
3. **{Fix}** — {impact}

---

### Per-page audit

#### {URL 1}
- **GEO score:** {score}/100 — {tier}
- **Strongest factors:** {top 2 with scores}
- **Weakest factors:** {bottom 2 with scores}
- **Top 3 fixes:**
  1. {specific fix with rationale}
  2. {specific fix}
  3. {specific fix}
- **Prompt-fit notes:** {if target queries provided, which queries this page does/doesn't fit}

#### {URL 2}
{same structure}

---

### Pages by tier

| Tier | URLs |
|---|---|
| Strong (75-100) | {list} |
| Moderate (50-74) | {list} |
| Weak (<50) | {list} |

---

### Comparative scoring (if competitor list provided)

| Site | Average GEO score | Top factor | Weak factor |
|---|---|---|---|
| {your domain} | {avg} | {factor} | {factor} |
| {competitor 1} | {avg} | {factor} | {factor} |
| ... | ... | ... | ... |

---

### Recommended next step

{1-3 paragraphs of practical guidance — usually a sequence:
1. Site-wide quick wins (llm.txt, schema, last-modified updates)
2. Page-level rewrites prioritized by traffic + prompt-fit
3. New content gaps where target queries have no matching page}

### Output files
- `geo-audit-{domain}-{date}.md` — this report
- `geo-audit-{domain}-{date}.csv` — per-page scores
- `geo-audit-{domain}-{date}-fixes.csv` — actionable fix list
- `geo-audit-{domain}-{date}-prompt-fit.json` — query-to-page matches
```

### Step 6 — Hand-off to fix skills

The audit pairs with execution skills:

- For weak `direct_answer` and `declarative_tone`: pair with content rewriting workflows
- For missing schema: trigger schema generation
- For missing `llm.txt`: trigger `llm-txt-generator` (existing)
- For internal linking gaps: pair with `internal-link-optimizer` (when shipped)
- For prompt-fit gaps: trigger content gap analysis + new page creation

The skill outputs explicit hand-off recommendations rather than trying to do the rewrites itself.

## Edge Cases

- **JavaScript-rendered sites** — fetch may miss the body content. Use a headless browser (Playwright) or the rendered HTML from a service. Document this if the audit can't reach a page.
- **No target queries provided** — skip the prompt-fit factor; note in the report that this is the highest-leverage missing input.
- **Site is mostly product pages, not content** — the audit's content-focused factors apply less. Adjust by emphasizing schema, entity coverage on product specs, and llm.txt; de-emphasize Q&A structure expectations.
- **Multilingual site** — audit per locale separately. Mixed-language analysis fails the entity check.

## Cost

| Component | Cost per page |
|---|---|
| Page fetch + parse | Free |
| GEO factor scoring (LLM) | ~$0.005 |
| Prompt-fit retrieval simulation | ~$0.01 per (page, query) pair |
| Report generation | ~$0.02 (one-time per audit) |
| **Per page** | **~$0.02-0.05** |
| **Per 50-page audit** | **~$1-3** |

## Tools Required

- HTTP fetch + HTML parser
- LLM for scoring + report generation
- Optional: headless browser for JS-rendered sites
- Optional: keyword research data for prompt-fit

## Trigger Phrases

- "Run the GEO audit on {domain}"
- "Audit our AI search readiness"
- "Why isn't ChatGPT citing us?"
- "Score our GEO posture"
