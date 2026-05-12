---
name: dynamic-roi-calculator
description: >
  Generate a personalized ROI brief for a specific prospect using discovery-call
  notes, public company data, and a stored ROI model. Produces a one-page
  markdown or PDF brief with their numbers — not generic — covering
  addressable opportunity, projected savings or revenue lift, payback
  period, and three sensitivity scenarios. Designed to land with the
  economic buyer.
tags: [outreach]
---

# Dynamic ROI Calculator

Generic ROI calculators say "save 30% on Y." This skill writes one for *this* prospect: their headcount, their ARR, their current spend on whatever you're displacing, and your model's assumptions — combined into a brief the AE can attach to a follow-up email or hand to the champion to forward upward.

**Built for:** AEs who need a credible ROI artifact for the economic buyer but don't want to write a custom one for every deal. The skill takes 5 minutes of inputs and produces a defensible brief in under 60 seconds.

## When to Use

- "Build the ROI brief for {Prospect}"
- "Generate a payback case for this deal"
- "Run the ROI calculator for {Account}"
- "Make me a one-pager I can send to their CFO"

## Inputs

### Required (deal-specific)
- **Prospect company** — name + domain
- **Prospect role** — who's getting this brief? (champion vs. economic buyer changes tone)
- **Discovery notes** — paste or path to the rep's discovery call notes / Gong transcript / written summary

### Required (model-specific, set once per product)
- **ROI model** — saved as `roi-model.json`. See "Model Format" below.

### Optional but useful
- **Industry / vertical** — tunes the assumptions
- **Current solution they're using** — anchors the displacement story
- **Pricing tier you'd quote** — keeps the brief honest about your real cost
- **Customer references** — 1-3 case studies with similar profiles (the brief will pick the closest)

## Model Format

`roi-model.json` is the canonical model the skill uses. It defines what value drivers your product has, how to calculate each, and what assumptions are reasonable defaults.

```json
{
  "product_name": "Acme Insights",
  "default_currency": "USD",
  "value_drivers": [
    {
      "id": "time_saved",
      "label": "Analyst time saved",
      "formula": "analysts_count * hours_saved_per_week_per_analyst * 52 * fully_loaded_hourly_rate",
      "inputs": {
        "analysts_count": {"description": "Number of analysts using the tool", "default_source": "discovery_or_estimate"},
        "hours_saved_per_week_per_analyst": {"description": "Hours saved per analyst per week", "default": 4, "range": [2, 8]},
        "fully_loaded_hourly_rate": {"description": "Fully loaded hourly cost (salary × 1.4 / 2080)", "default_by_geo": {"us": 75, "uk": 60, "eu": 55, "in": 25}}
      },
      "evidence": "Customer X went from 12 hrs/week of manual reporting to 2 hrs (case study link)"
    },
    {
      "id": "tool_displacement",
      "label": "Replaced tool spend",
      "formula": "current_tool_annual_spend",
      "inputs": {
        "current_tool_annual_spend": {"description": "Annual spend on current tool being replaced", "default_source": "discovery"}
      },
      "evidence": "We typically replace Tool Y, Tool Z; published competitor pricing X-Y per seat"
    },
    {
      "id": "decision_speed",
      "label": "Faster decisions (revenue lift)",
      "formula": "annual_revenue * decisions_affected_pct * decision_speed_improvement_pct * lift_per_speed_unit",
      "inputs": {
        "annual_revenue": {"description": "Prospect's annual revenue", "default_source": "discovery_or_pubic_data"},
        "decisions_affected_pct": {"description": "% of revenue decisions touched by the tool", "default": 0.10, "range": [0.05, 0.25]},
        "decision_speed_improvement_pct": {"description": "Speed-up factor (e.g., 0.30 = 30% faster)", "default": 0.30, "range": [0.15, 0.50]},
        "lift_per_speed_unit": {"description": "Revenue lift attributable to faster decisions per unit improvement", "default": 0.02, "range": [0.01, 0.04]}
      },
      "evidence": "Forrester study; internal benchmark; specific customer attribution"
    }
  ],
  "investment": {
    "annual_subscription": {"description": "Quoted annual subscription price for this prospect", "default_source": "deal_data"},
    "implementation": {"description": "One-time implementation/onboarding cost", "default": 0},
    "internal_change_management": {"description": "Estimated internal cost of change management", "default_source": "rule_of_thumb_5pct_of_subscription"}
  },
  "sensitivity_scenarios": ["conservative", "expected", "ambitious"]
}
```

## Workflow

### Step 1 — Pull deal-specific inputs

From the discovery notes, extract every value-driver input the model needs. For each missing input:

1. Try public data (LinkedIn for headcount, Crunchbase for revenue, news for tool stack)
2. Use the model's `default` or geo-based default
3. Note in the brief which inputs are estimated vs. confirmed

Output a populated input table:

```
| Input | Value | Source | Confidence |
|---|---|---|---|
| analysts_count | 14 | Discovery call | Confirmed |
| hours_saved_per_week_per_analyst | 4 | Default (range 2-8) | Estimated |
| fully_loaded_hourly_rate | 75 | Geo default (US) | Estimated |
| annual_revenue | $42M | Crunchbase | Estimated |
| current_tool_annual_spend | $48,000 | Discovery call | Confirmed |
```

### Step 2 — Compute three scenarios

Run the model under three settings:

- **Conservative** — every variable input at the bottom of its range
- **Expected** — every variable input at default
- **Ambitious** — every variable input at top of range

Compute per scenario:
- Total annual value (sum of all value drivers)
- Total cost (subscription + implementation + change management)
- Net benefit (value − cost)
- Payback period in months
- 3-year ROI (cumulative)

Render as a single comparison table — never hide the conservative case.

### Step 3 — Pick the closest customer reference

From the provided references, score each by:
- Same vertical/industry: +3
- Similar headcount band: +2
- Same use case: +3
- Public outcome metric available: +2

Pick the highest-scoring reference. If no reference scores ≥ 5, omit the reference section rather than stretching.

### Step 4 — Generate the brief

Use this exact structure. The brief is one page printed.

```markdown
# {Prospect Company} — ROI Brief
**Prepared for:** {Recipient name + title}
**Prepared by:** {Sender name + title}
**Date:** {date}
**Solution evaluated:** {Product name}

---

## The bottom line

| Scenario | Annual value | Annual cost | Net benefit | Payback |
|---|---|---|---|---|
| Conservative | ${value_low} | ${cost} | ${net_low} | {payback_low} months |
| **Expected** | **${value_mid}** | **${cost}** | **${net_mid}** | **{payback_mid} months** |
| Ambitious | ${value_high} | ${cost} | ${net_high} | {payback_high} months |

3-year ROI (expected case): **{roi_3y}%**

---

## Where the value comes from

### {Driver 1 label} — ${value_driver_1}/yr (expected)
{One-paragraph explanation, in the prospect's terms, citing the input values used}

> *Reference:* {Customer X} reported {specific outcome}, source {link}.

### {Driver 2 label} — ${value_driver_2}/yr (expected)
{Same pattern}

### {Driver 3 label} — ${value_driver_3}/yr (expected)
{Same pattern}

---

## Inputs used

| Input | Value | Source |
|---|---|---|
| {input} | {value} | {Confirmed | Estimated | Industry default} |
| ... | ... | ... |

We've flagged each input as confirmed (from your team) or estimated. Estimated inputs are shown at default values — your numbers will likely sharpen these.

---

## Closest reference customer

**{Customer name}** — {industry, size}
> "{One-line outcome quote, with public source if available}"

{2-3 sentences explaining the structural similarity to {Prospect}.}

---

## What's not included

- {Risk 1, e.g., "We have not modeled the cost of change management beyond a 5% rule of thumb."}
- {Risk 2, e.g., "Revenue-lift driver assumes a stable conversion rate; aggressive new-pipeline scenarios are not included."}
- {Risk 3, e.g., "Implementation timeline assumes 60 days; longer rollouts will defer payback."}

---

## Next step

{Specific, low-friction action — e.g., "If the conservative case alone is enough to justify a pilot, the next step is a 30-day proof of value. Happy to scope it on a 20-minute call."}
```

### Step 5 — Save / export

Default: save to `clients/<client-name>/deals/<account-slug>/roi-brief-{YYYY-MM-DD}.md`.

If a PDF is requested, render the markdown via the team's preferred tool (Pandoc, mdpdf, etc.) and save alongside.

## Honesty Guardrails

- Never use the ambitious case as the headline number. The bold row is always the expected case.
- Never invent customer references. If `references.json` is empty, omit the section.
- Always show the conservative case. The economic buyer respects the floor more than the ceiling.
- Show every input used. A buyer who sees the math will trust the conclusion.
- Flag every estimated input. The brief should never read as if every number is confirmed.

## Edge Cases

- **Prospect refuses to share numbers in discovery** — fall back to public-data + geo defaults, but lead the brief with a "preliminary, refinable on a 20-min call to plug in your specific numbers" caveat.
- **Negative ROI under conservative case** — generate the brief anyway, and use the cover note to recommend a smaller starter scope (smaller team, single use case) where the math works.
- **Prospect is in a vertical your model wasn't built for** — flag this clearly. Generate the brief with caveats. Do not silently substitute defaults from a different vertical.
- **Multi-product sale** — render one brief per product line, then a combined summary. Never collapse into one "total" without showing the line items.

## Cost

| Component | Cost |
|---|---|
| Discovery-note parsing (LLM) | ~$0.005 |
| Public-data lookup (LinkedIn / Crunchbase via existing skills) | ~$0.05-0.20 |
| Reference matching | Free |
| Brief generation | ~$0.02 |
| **Total per brief** | **~$0.10-0.30** |

## Tools Required

- LLM for discovery parsing + brief drafting
- A populated `roi-model.json` per product (one-time setup, then reusable)
- Optional: existing skills for public-data lookup (`company-intel`, `company-funding-search`, `crunchbase-pull`)
- Optional: a markdown-to-PDF renderer

## Trigger Phrases

- "Build the ROI brief for {Prospect}"
- "Generate a payback case for {Deal}"
- "Run the ROI calculator"
- "Make me a one-pager for the CFO"
