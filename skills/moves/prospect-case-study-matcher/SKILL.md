---
name: prospect-case-study-matcher
description: >
  For a given prospect, retrieve the closest customer story from the win
  library — matching on industry, company size, use case, and pain pattern
  — and surface the specific outcome that's most relevant to the
  prospect's situation. Outputs a 3-line "you remind us of {customer}"
  block ready to drop into an email or one-pager.
tags: [outreach]
---

# Prospect Case Study Matcher

Generic case studies are forgettable; the closest analogue from a real customer is convincing. This skill takes a prospect and the team's win library, finds the customer story that maps best, and produces the exact 2-3 sentences a rep should drop into the next email.

**Built for:** Reps who know they should "send a relevant case study" but don't have time to scan the case-study folder for the closest match.

## When to Use

- "Find the closest case study for {Prospect}"
- "Match {Account} to a customer reference"
- "Generate the 'you remind us of' line for this email"
- "Which of our customers should I cite for {Prospect}?"

## Inputs

Required:
- **Prospect** — name, company, industry, size band, role
- **Win library** — directory or CSV of customer stories. Each entry should have:
  - Customer name
  - Industry / vertical
  - Size at time of customer success (employees, ARR if known)
  - Their original pain (1-2 sentences)
  - The use case they bought for
  - The measurable outcome (with metric + timeframe)
  - Public-quotability flag (can we name them publicly?)
  - URL to the published case study or doc

Optional but improves matching:
- **Prospect's stated pain** — from discovery notes
- **Prospect's tech stack** — from `tech-stack-teardown` or similar
- **Prospect's competitor (if displacing)** — for matching to customers who switched from the same competitor

## Matching Algorithm

Score each customer story against the prospect on six dimensions:

| Dimension | Weight | Match strength |
|---|---|---|
| Industry / vertical match | 25 | Exact = 25, adjacent = 15, generic = 5 |
| Company size band match | 15 | Same band = 15, ±1 band = 10, more = 0 |
| Same use case | 25 | Exact = 25, adjacent = 15, generic = 5 |
| Same pain pattern | 20 | Exact = 20, adjacent = 12, generic = 5 |
| Same competitor displaced | 10 | Same = 10, similar = 6, none = 0 |
| Same tech stack signal | 5 | Same key tool = 5, adjacent = 3 |

**Total possible: 100. Threshold for "use this story": ≥40.**

### Tier interpretation

| Score | Match quality | Treatment |
|---|---|---|
| ≥80 | Near-perfect — uses prospect-specific language | Lead with the customer name in subject line |
| 60-79 | Strong — clearly relevant | Use as primary reference in email body |
| 40-59 | Acceptable — generic relevance | Use as secondary, paired with broader proof |
| <40 | Don't force a match | Recommend manual research or skip the reference |

### When no customer scores ≥40

Don't fabricate or overstate. Output:

```
{
  "match_quality": "no_strong_match",
  "recommendation": "Skip the customer reference; lean on category-level proof or a third-party data point.",
  "alternates_considered": [<top 3 with their scores and gap reasons>]
}
```

## Workflow

### Step 1 — Index the win library

On first run (or when the library changes), index every customer story:

```json
{
  "customer_id": "",
  "name": "",
  "industry_tags": ["b2b_saas", "fintech"],
  "size_band": "growth", 
  "use_case_tags": ["data_quality", "api_observability"],
  "pain_pattern": "",
  "outcome_metric": "",
  "outcome_value": "",
  "outcome_timeframe": "",
  "competitor_displaced": "",
  "tech_stack_signals": ["snowflake", "dbt"],
  "public_quotable": true,
  "case_study_url": ""
}
```

Cache the index in Redis or local storage; refresh weekly or on-demand.

### Step 2 — Score against the prospect

For each indexed customer, compute the score by the matrix above. Keep top 5 candidates with their scores.

### Step 3 — Select the lead candidate

If top score ≥40:
- Pick the highest-scoring story
- If two are tied within 5 points: prefer the one with a higher-impact outcome metric (revenue > efficiency > cost-savings, all else equal)
- If both are weak on outcome but one is publicly quotable: prefer the public one (so the rep can cite by name)

### Step 4 — Generate the drop-in block

Three formats — the rep picks based on the email length they're writing:

#### Short (1 sentence) — for follow-ups
```
"{Customer name} ({customer industry}, {size band}) hit the same {pain pattern} and saw {outcome_metric} {outcome_value} in {outcome_timeframe} after switching."
```

#### Medium (3 sentences) — for first-touch outreach
```
{Prospect_first_name}, you remind us of {Customer name} — {customer's situation in one sentence, focused on the pain match with prospect}.

After {timeframe}, they were seeing {outcome with metric}.

The closest analogue I could find in our base; happy to walk through the specifics if useful.
```

#### Long (one-page) — for ROI brief or champion-coaching artifact
A more developed version that includes: customer overview, pain summary, what they tried before, why they switched to us, the outcome with timeline, and the specific 2-3 things that translated to their business case. Generated as a markdown one-pager the rep can attach.

### Step 5 — Output

```json
{
  "prospect": {"name": "", "company": "", "industry": "", "size": ""},
  "match": {
    "customer_name": "",
    "score": 0,
    "tier": "near_perfect | strong | acceptable | none",
    "reasons": ["Same industry: SaaS data tools", "Same size band: 200-500 employees", ...]
  },
  "alternates": [<2-3 next-best options>],
  "drop_in_short": "",
  "drop_in_medium": "",
  "drop_in_long_path": "<saved markdown path if generated>",
  "manual_review": false,
  "review_reason": null
}
```

## Honesty Guardrails

- **Never use a customer who didn't agree to be named publicly** in any externally-shared content. If the customer is internal-only, the drop-in block uses "a similar customer in {industry, size} space" instead of the name.
- **Never inflate metrics** — quote the outcome exactly as it appears in the win library. If the library has "saved 30% on tooling spend," the drop-in says "saved 30% on tooling spend," not "saved up to 50%."
- **Never invent the structural similarity** — every match reason must come from a real shared dimension. The prospect doesn't need to be told *why* they remind us of someone, but the rep needs to be able to defend it on a call.

## Maintenance

The skill quality compounds with the win library quality. Maintenance practices:

- **Add new wins quarterly** — every closed-won deal that's interesting should be entered with the structured fields above
- **Tag with use case + pain explicitly** — vague tags like "improved efficiency" make matching weak
- **Refresh outcomes annually** — a 3-year-old metric isn't as compelling as a 1-year-old one
- **Mark unquotable customers** — some customers are fine to reference internally but won't agree to public mentions; track this so the skill knows when to anonymize

## Edge Cases

- **Prospect is in a vertical you've never sold into** — the skill returns `no_strong_match` and recommends a category-level proof point. Don't force a match.
- **Multiple customers in the same vertical with different outcomes** — the skill prefers the customer whose outcome metric matches what the prospect is most likely to care about (CFO → cost savings; Head of Eng → reliability; CMO → revenue).
- **Customer has been acquired / shut down / changed name** — flag in the win library; don't reference defunct entities. The skill skips these automatically.
- **Library has fewer than 10 stories** — every match scores too generic. Flag in the output: "win library is too small for high-confidence matching; consider adding more entries."

## Cost

| Component | Cost |
|---|---|
| Library indexing (one-time per refresh) | ~$0.05 per story |
| Per-prospect matching | ~$0.005 |
| Drop-in block generation | ~$0.005 |
| **Per match** | **~$0.01** |

## Tools Required

- LLM for indexing (when stories are unstructured) and drop-in generation
- Read access to the win library directory or CSV
- Optional: Redis or local cache for the indexed library

## Trigger Phrases

- "Find the closest case study for {Prospect}"
- "Match {Account} to a customer reference"
- "Generate 'you remind us of' line"
- "Which customer should I cite for this prospect?"
