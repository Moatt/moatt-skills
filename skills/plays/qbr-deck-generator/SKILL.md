---
name: qbr-deck-generator
description: >
  Generate a complete Quarterly Business Review (QBR) deck for an
  enterprise customer — pre-populated from product usage data, support
  ticket history, business outcomes vs. original success criteria,
  and the team's roadmap. Outputs a ~10-12 slide deck with the
  customer-relevant narrative, a results-vs-MAP comparison, an
  expansion roadmap, and an executive summary. Designed to land on
  the CSM's calendar 72 hours before the QBR.
tags: [research]
---

# QBR Deck Generator

Quarterly Business Reviews are where customers decide whether to renew, expand, or churn — and they happen four times a year per enterprise account. A great QBR aligns the customer's measured outcomes against their original goals, surfaces gaps honestly, and proposes the next 90 days. A bad one is a generic activity dump. This skill builds the great version automatically from your existing data.

**Built for:** Enterprise CS teams running 10+ QBRs per quarter who want to stop wasting 4-6 hours per QBR on deck building.

## When to Use

- "Generate the QBR deck for {Account}"
- "Run the QBR builder for next week's reviews"
- "Pre-fill the {Account} QBR from usage data"
- "Build QBR decks for the {CSM}'s queue this quarter"

## Phase 0: Intake

Required:
- **Account** — name, plan, ARR, contract start, renewal date, CSM/AE
- **Original success criteria** — what the customer said they wanted at signing. Pulled from CRM notes, the original MAP (mutual action plan), or stated explicitly during sales.
- **Quarter being reviewed** — Q{n} {year}, with date range
- **Usage data** — same telemetry source as `usage-drop-csm-trigger`

Optional but improves quality:
- **Support ticket history** — count, types, time-to-resolution, customer sentiment
- **Roadmap items** — features shipped this quarter, features coming next quarter
- **Comparable customers** — similar accounts with measurable outcomes for benchmarking
- **Champion + EB at the customer** — who's attending the QBR, what each cares about
- **Industry trends** — context to frame the customer's progress

## The QBR Deck Anatomy

A QBR deck has 10-12 slides covering this exact arc — anything outside the arc is filler:

| # | Slide | What's on it |
|---|---|---|
| 1 | Cover | Account name + quarter + agenda |
| 2 | What we said we'd do | Original success criteria from MAP/discovery |
| 3 | What got done (the headline) | 3-5 measurable outcomes vs. those criteria |
| 4 | Usage trends | One key chart — typically the primary engagement metric over the quarter |
| 5 | Adoption depth | Which features / use cases got real adoption |
| 6 | Wins | Specific user stories, named, with quotes when possible |
| 7 | Gaps + risks | Honest list of what didn't happen and why |
| 8 | Support / health | Tickets opened, resolved, NPS or CSAT if available |
| 9 | What's coming next quarter | Roadmap items relevant to this customer's stack |
| 10 | Recommended next steps | Specific actions for the next 90 days, with owners |
| 11 | Expansion or renewal pathway | How to grow the relationship (or de-risk renewal) |
| 12 | Executive summary | One-page recap for the EB to forward up |

The skill produces all of these from the inputs above.

## Workflow

### Step 1 — Pull the data

Run in parallel:

1. **Original success criteria:** parse the CRM notes / MAP / discovery transcript. Extract 3-5 measurable goals stated at signing.
2. **Usage data for the quarter:** weekly metric values for the past 13 weeks
3. **Adoption depth:** which features/modules saw activity, by user count or session count
4. **Support tickets:** opened/resolved/sentiment for the quarter
5. **Roadmap context:** what shipped that's relevant + what's coming

### Step 2 — Compute the outcomes-vs-criteria slide

For each original success criterion, score progress:

| Status | Definition | Slide treatment |
|---|---|---|
| `achieved` | Quantitative target met | Green check; show the number |
| `on_track` | Trending toward target by renewal | Yellow; show trajectory |
| `gap` | Missed or stalled | Honest red flag with reason |
| `redefined` | Customer changed the goal mid-quarter | Note the change with date + reason |

Don't fudge. A QBR that papers over gaps gets one renewal. A QBR that surfaces gaps with a credible plan to close them gets multi-year retention.

### Step 3 — Identify the headline metric

For each customer, there's usually one number that tells the story. The skill picks based on:

- The original success criteria's primary metric (if measurable)
- Else: the metric most aligned to the plan tier they bought
- Else: the metric with the most dramatic positive change

Generate a single chart with this metric using `data-charts-tako` (existing) or `create-dashboard` patterns.

### Step 4 — Surface specific user wins

Pull from product data + support data + call notes:

- Power users: top 3 by engagement this quarter (named)
- Specific outcomes: when did the customer ship, launch, save, win because of your product?
- Quotes: any positive feedback in support tickets, NPS, calls

This slide is the most-cited part of a QBR. Customer success isn't a feeling; it's specific people doing specific things differently.

### Step 5 — Honestly list gaps

For each unmet criterion or active risk:

- **What:** the gap in plain language
- **Why:** root cause where known (vs. speculation)
- **What we propose:** concrete action for next quarter

Examples (good vs. bad):

| Bad gap framing | Good gap framing |
|---|---|
| "Adoption was slower than hoped" | "Only 12 of the 30 seats are active weekly. Expected 22+ by end of Q1. Root cause: the L&D rollout slipped to month 3 from month 1. Recommendation: Q2 enablement workshops in Berlin and Austin." |
| "Customer faced challenges with integrations" | "Salesforce sync had 3 outages over Feb-Mar (cumulative 4 hours). Root cause: a deprecated API still in use on customer side; we shipped the fix in April. Status: stable for 6 weeks." |

### Step 6 — Frame the next-quarter pathway

Two paths to compose:

**A. Expansion pathway** — for accounts with strong adoption + healthy outcomes
- Specific seat / feature / module to add, with the business case for adding it
- The internal champion who would drive the expansion conversation
- Pricing range (rough)
- Suggested decision date

**B. Renewal de-risk pathway** — for accounts with gaps + risks
- The 2-3 specific milestones that will determine renewal readiness
- The dates by which each must clear
- Whose action is required (customer side, our side, mutual)
- The recommended exec engagement (does this need a senior conversation?)

Both paths produce a slide. The skill picks based on the gap analysis.

### Step 7 — Generate the executive summary slide

The EB likely won't sit through 12 slides. The exec summary is one slide they take away — and the most likely artifact to be forwarded up.

Format:

```markdown
# {Account name} — Q{n} {year} Executive Summary

**Original goals:** {3 bullet criteria}
**Outcomes:** {3 bullet results, marked achieved / partial / gap}
**Headline metric:** {metric name}: {Q1 value} → {Q4 value} (Δ +{X}%)
**What's next:** {1-2 bullet recommended actions for Q+1}
**Renewal status:** {confidence rating} | Renewal date: {date}
```

### Step 8 — Render the deck

Use `create-html-slides` (existing, Wave 0) to render each slide as 1920×1080 HTML, then export to PNG. Output:

- `qbr/{account}/Q{n}-{year}/slides/01-cover.png` ... `12-exec-summary.png`
- `qbr/{account}/Q{n}-{year}/deck.pdf` (compiled)
- `qbr/{account}/Q{n}-{year}/exec-summary.pdf` (one-page)
- `qbr/{account}/Q{n}-{year}/source.md` (markdown source for editing)
- `qbr/{account}/Q{n}-{year}/_data.json` (the data that drove the deck — for refresh runs)

### Step 9 — Pre-call CSM brief

In addition to the deck, generate a private CSM brief: stuff that informs the meeting but isn't on the slides:

- Likely sticky points or sensitive areas
- Questions the EB is likely to ask
- The 2-3 things to *not* say (active deals on their side, internal escalations they may not know about)
- Recommended seat at the table — who from our side should join

This is the rep's prep, separate from the customer-facing deck.

## Honesty Guardrails

- **Never invert a gap into a win.** If the customer didn't hit a goal, the slide says so. The credibility cost of being caught is much higher than the discomfort of the slide.
- **Never quote things that weren't said.** All customer quotes are real and sourced.
- **Never inflate metrics.** Numbers come from the source data. If the data is ambiguous, the slide says "preliminary" rather than "confirmed."
- **Never propose expansion when health is poor.** Adoption is the prerequisite to expansion; pretending otherwise is how trust dies.

## Edge Cases

- **Customer is in active churn discussion** — don't run the QBR generator. Switch motion to the win-back / save-the-account workflow. The QBR format is for healthy and at-risk-but-recoverable accounts.
- **Customer has been on for less than a quarter** — generate a "first-90-day review" instead. Different arc: focus on activation, not outcomes.
- **No clear original success criteria** — flag this hard. Generate a deck that surfaces the gap explicitly and proposes establishing criteria *for next quarter*. Don't fabricate criteria from scratch.
- **Multi-business-unit customer** — generate per-BU QBRs if usage segregates cleanly; otherwise produce a parent deck with BU appendices.

## Cost

| Component | Cost per QBR |
|---|---|
| Data pull | Free (your data) |
| Outcome scoring (LLM) | ~$0.05 |
| Chart generation | ~$0.05 |
| Slide content generation (LLM) | ~$0.20 |
| HTML/PDF rendering | ~$0.10 |
| **Per QBR** | **~$0.40** |

Versus 4-6 hours of CSM time at fully-loaded cost (~$300-500), this is roughly 1,000× cheaper for comparable quality.

## Tools Required

- `create-html-slides` (existing) for rendering
- `data-charts-tako` (existing) for the headline chart
- LLM for narrative generation
- Read access to product usage data + support data
- CRM read access for original criteria
- Optional: `usage-drop-csm-trigger` (Wave 2) for risk context

## Trigger Phrases

- "Generate the QBR deck for {Account}"
- "Run QBR builder for next week"
- "Pre-fill {Account} QBR from data"
- "Build QBRs for {CSM}'s queue"
