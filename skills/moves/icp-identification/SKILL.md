---
name: icp-identification
description: >
  Research a company or product, lock the Ideal Customer Profile, then route to
  the next move — TAM mapping or going straight to lead discovery. The front door
  for any "find me leads", "map my market", or "who should I sell to" request.
  Loads automatically when a user hands over a company URL or idea and asks for
  leads or market mapping.
tags: [research]
---

# ICP Identification

Research a company or idea, define the Ideal Customer Profile, and route to the next move. This is the **entry point** for any "find me leads" or "map my market" request — it sits upstream of every lead-finding and TAM-building skill and ensures the business, target, and approach are locked in before anyone starts executing.

## When to Auto-Load

- User says "find me leads", "help me find prospects", "who should I sell to", or similar
- User hands over a company URL and asks for leads/prospects
- User describes an idea/product and wants customers
- User asks "who is my ICP?" or "help me define my target market"
- User asks to "map my TAM", "size my market", or "build a target account list"

## Phase 0: Gather Context

When triggered, collect these inputs:

1. **Company URL** or describe your idea/product
2. **What does the product/service do?** (skip if a URL was provided — we'll research)
3. **Who are your current customers?** (if any — ask for specific company names, titles of buyers/champions, and how they found the product. These examples calibrate search filters far better than abstract descriptions.)
4. **What's your price point / deal size?** (drives buyer seniority)
5. **Who is NOT a fit?** — Probe for industries, company types, sizes, or roles that are explicitly wrong. Prompt with examples: *"Are there industries that definitely don't work? Company sizes too small or too large? Titles that look right but never buy?"* Even rough exclusions cut noise downstream.

If a company URL was provided, do the web research first before circling back with follow-ups. Don't ask things you can answer from the site yourself.

**Intake principle:** Every answer should feed a search filter (title, industry, headcount range, region) or an exclusion filter (titles to skip, industries to ignore, company types to avoid). If an answer is too vague to convert into a filter value, probe further. Don't ask generic strategy questions — ask questions that sharpen the search.

## Phase 1: Research

Using web search and the company URL, dig into:

1. **Company research** — What do they sell? Who do they sell to? Value prop. Pricing model.
2. **Market analysis** — What category/space? Market size signals. Growth stage.
3. **Competitor identification** — Top 3-5 competitors? How are they positioned?
4. **Buyer signals** — Who buys this kind of product? Which titles? What triggers the purchase?

**Output:** Boil findings down into a brief (5-10 bullet points) and present it for validation. Example:

> **Research Summary:**
> - Company sells X to Y
> - Main competitors: A, B, C
> - Typical buyer: VP/Director level at mid-market companies
> - Purchase triggers: scaling team, switching from legacy tool, new budget cycle
> - Pricing suggests mid-market / enterprise buyer

Then ask: *"Does this match your understanding? Anything to correct or add?"*

## Phase 2: Define the ICP

Combine the research and the user's input into a structured ICP proposal:

| Dimension | Recommendation | Reasoning |
|-----------|---------------|-----------|
| **Job Titles** | e.g., VP Sales, Head of Revenue Ops | Direct buyers of sales tools |
| **Seniority** | e.g., VP, Director | Budget authority at this deal size |
| **Company Size** | e.g., 51-200 employees | Sweet spot for this product |
| **Industry** | e.g., SaaS, FinTech | Highest product-market fit |
| **Region** | e.g., US, SF Bay Area | Current market focus |
| **Signals** | e.g., recently hired, posted about pain | Timing indicators |

Present it as a table. Ask the user to **confirm, adjust, or refine**. Iterate until they sign off.

### Exclusion Criteria (Equally Important)

Define what to filter OUT. These map directly to "not in" / exclusion parameters in search tools:

| Dimension | Exclude | Reasoning |
|-----------|---------|-----------|
| **Titles to exclude** | e.g., Intern, Coordinator, Assistant, Student | No budget authority or decision power |
| **Industries to exclude** | e.g., Government, Education, Non-profit | Product doesn't serve these verticals |
| **Company types to exclude** | e.g., Agencies, consultancies, sole proprietors | Wrong fit for the product model |
| **Company size to exclude** | e.g., 1-10 employees, 10,000+ | Too small to need it / too large to buy it |
| **Specific companies to exclude** | e.g., existing customers, competitors, partners | Already in pipeline or otherwise wrong |

Present exclusions next to the inclusion table. Confirm both.

**Important:** The ICP definition becomes the input context for every downstream skill. Get specific — vague ICPs produce vague leads.

**Search precision warning:** Downstream tools (Apollo and similar databases) match on the exact title strings, industry tags, and keywords you pass them. Overly broad or stuffed filters (e.g., 15 keyword tags) return noise. Each filter value should be specific and intentional. When in doubt, use fewer, sharper values and let exclusions do the narrowing.

## Phase 3: Choose Path — TAM or Leads?

Once the ICP is locked, ask the user:

> *"Now that we have the ICP defined, would you like to:*
> 1. **Map your TAM** — Build a scored Total Addressable Market: discover every company matching your ICP, score and tier them, and build a persona watchlist for the best-fit accounts. The strategic, market-first path.
> 2. **Find leads/prospects now** — Skip straight to surfacing individual people to contact. The tactical, results-now path.
>
> *TAM mapping is best when you want a full picture of your market, ongoing signal monitoring, and a systematic account-based approach. Lead finding is best when you need contacts to reach out to immediately."*

### Path A: Map the TAM

When the user picks TAM mapping, hand off to the TAM builder skill with the ICP definition. The TAM builder will:
1. Search for companies matching the ICP filters
2. Score and tier them by fit
3. Build a persona watchlist for best-fit accounts

**When to recommend the TAM path:**
- User wants a systematic, account-based approach
- The market is well-defined but the user doesn't know which companies are in it
- User plans to run ongoing outbound (not a one-shot campaign)
- User wants to prioritize accounts by fit before reaching out
- User asks about "market sizing", "target account list", or "account-based"

### Path B: Find Leads/Prospects → Lead-Finding Skills

When the user picks lead finding, present ranked strategies based on what's wired into the skill graph:

| # | Strategy | Skill Used | Best For | Effort |
|---|----------|-----------|----------|--------|
| 1 | **Database search** — Search people DB by title, industry, region, company size | `apollo-lead-finder` | High volume, broad ICP | Low |
| 2 | **Pain language** — Find people posting about problems your product solves | `pain-language-engagers` | Warm leads with expressed need | Medium |
| 3 | **Competitor audiences** — Find people engaging with competitor content | `competitor-post-engagers` | Leads already in-market | Medium |
| 4 | **KOL audiences** — Find leads from industry influencer audiences | `kol-discovery` → `kol-engager-icp` | Niche, high-quality leads | Medium |
| 5 | **Hiring signals** — Find companies hiring roles your product replaces/supports | `job-posting-intent` | Companies with budget & urgency | Medium |
| 6 | **Event attendees** — Find leads from industry events | `get-qualified-leads-from-luma` | Engaged, in-market leads | Low |
| 7 | **Apollo database search** — Search Apollo's 210M+ contact database (free search, paid enrichment) | `apollo-lead-finder` | Broadest coverage, cost-controlled enrichment | Low |

**Recommendation logic:**
- Early-stage / broad ICP → Start with **database search** (volume) + **pain language** (warmth)
- Established with known competitors → **Competitor audiences** + **database search**
- Niche market → **KOL audiences** + **event attendees**
- High urgency / budget signals matter → **Hiring signals** + **database search**

Recommend 1-2 strategies based on the ICP and company stage. Ask the user to pick which to execute.

## Phase 4: Hand Off

Once a path and strategy are picked:

1. **Load the corresponding skill's `SKILL.md`**
2. **Pass the ICP definition as context** — titles, industries, regions, company size, signals
3. **Begin that skill's Phase 0 (intake)** with the ICP already populated — don't re-ask anything the ICP already answers
4. **If multiple strategies are selected**, execute sequentially — finish one before starting the next

### Handoff format

When transitioning to a downstream skill, carry forward:

```
ICP Context (from icp-identification):

Include:
- Titles: [list]
- Seniority: [list]
- Company size: [range]
- Industries: [list]
- Region: [list]
- Signals: [list]
- Product: [what the user sells]
- Competitors: [identified competitors]

Exclude:
- Titles to exclude: [list]
- Industries to exclude: [list]
- Company types to exclude: [list]
- Company size to exclude: [ranges]
- Companies to exclude: [specific names, if any]
```

That way downstream skills skip redundant intake and start executing immediately. Both inclusion and exclusion criteria must be passed — exclusions are what prevent noisy search results.
