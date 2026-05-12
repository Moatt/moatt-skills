---
name: single-thread-risk-flag
description: >
  Audit pipeline for "single-thread risk" — opportunities over a value
  threshold engaged with only one stakeholder, missing exec-level
  contact, or with no champion-side activity in 14+ days. Flags each
  at-risk deal with the specific gap and a recommended multithreading
  task. Designed to run weekly as part of pipeline review and
  block deals from advancing to commit without coverage.
tags: [outreach]
---

# Single-Thread Risk Flag

The single biggest predictor of an enterprise deal slipping is having only one engaged contact. Champions get pulled into other priorities. Champions leave. Champions never had the authority you assumed they did. This skill audits open pipeline against a multithreading checklist and flags every at-risk deal — explicitly, with the specific missing role.

**Built for:** Sales managers and RevOps teams running enterprise pipeline reviews who want to stop pretending single-thread deals are real.

## When to Use

- "Run the single-thread audit on this quarter's pipeline"
- "Which deals are at risk of slipping?"
- "Flag deals without exec coverage"
- "Pipeline review — surface multithread gaps"

## The Multithreading Checklist

For an opportunity above a configurable ACV threshold (default $50K), at minimum:

| Coverage requirement | Why it matters |
|---|---|
| ≥3 distinct contacts engaged | Reduces single-point-of-failure risk |
| ≥2 different roles represented | Buying decisions need user + buyer perspective |
| ≥1 economic-buyer-level contact engaged | The person who can sign |
| ≥1 technical-evaluator engaged | The person who can validate fit |
| Champion identified by name | Knowing who's selling internally |
| Champion-side activity in last 14 days | Stalled threads predict slippage |
| Stakeholder map populated | Forces the rep to know the buying committee |

A deal is **single-thread** if it fails 2+ of these checks. The skill audits each deal against the full list, not just the headline 3-contacts rule.

## Inputs

Required:
- **CRM access** — HubSpot, Salesforce, or CSV export with: deal/opportunity ID, stage, ACV, expected close date, primary contact, all engaged contacts (with role), last activity date, owning rep
- **ACV threshold** — minimum deal size to audit. Default $50K.

Optional:
- **Stage filter** — only audit deals past a certain stage (default: deals in stage 3+ of a 6-stage funnel)
- **Role taxonomy** — your team's standard role classification (economic buyer / champion / user / technical evaluator / influencer / blocker)
- **Champion field** — which CRM field stores the named champion
- **Activity sources** — email, calendar, call recording, CRM notes (more sources = more accurate engagement detection)

## Workflow

### Step 1 — Pull qualifying deals

From the CRM, query open opportunities matching:
- Stage filter
- ACV ≥ threshold
- Not closed-won, not closed-lost, not in active churn risk for an existing customer

For each deal, pull:
- Deal metadata (ID, stage, ACV, expected close)
- All contact records linked to the deal
- Activity records per contact (last 30 days)
- The named champion field, if populated

### Step 2 — Classify each contact's role

Auto-classify each contact's role using:

1. Role/title-based heuristics:
   - C-level / President / VP / SVP → `economic_buyer`
   - Director / Head of / Senior Manager → likely `champion` or `economic_buyer` depending on title weight at the company
   - Manager / Senior IC → likely `champion` or `user`
   - IC / Analyst / Engineer → `user` or `technical_evaluator` (depends on function)

2. Engagement-pattern heuristics:
   - Most recent + most active contact → likely `champion`
   - Highest-title contact who attended a demo → likely `economic_buyer`
   - Engaged on technical questions → likely `technical_evaluator`

If both heuristics conflict, flag for human review rather than auto-classifying.

### Step 3 — Audit each deal against the checklist

For each deal, score:

```
deal_audit:
  total_engaged_contacts: int
  distinct_roles: int
  has_economic_buyer_engaged: bool
  has_technical_evaluator_engaged: bool
  has_champion_named: bool
  champion_active_within_14d: bool
  stakeholder_map_populated: bool
  fails_count: int  // total checks failed
```

A deal fails a check if:
- `total_engaged_contacts < 3`
- `distinct_roles < 2`
- `has_economic_buyer_engaged == False`
- `has_technical_evaluator_engaged == False` (when relevant — for non-technical products, this is optional)
- `has_champion_named == False`
- `champion_active_within_14d == False`
- `stakeholder_map_populated == False`

### Step 4 — Tier and recommend action

| Fails | Risk tier | Recommended action |
|---|---|---|
| 0-1 | Healthy | Continue; standard cadence |
| 2-3 | Caution | Multithread task this week — specific role missing |
| 4+ | At risk | Block deal from advancing past current stage; manager review required |

For each at-risk deal, generate a specific recommendation:

```markdown
**Deal:** {Account name} — ${ACV} — Stage {stage} — Close {date}
**Owner:** {AE}
**Risk tier:** Caution / At risk
**Fails ({N}):**
  - {Failed check 1}
  - {Failed check 2}
  - {Failed check 3}

**Recommended multithread task:**
  - **Within 5 business days:** {specific action — e.g., "Identify and engage the {missing role} at {Account}. Suggested name from org chart: {name, title}."}
  - **Within 10 business days:** {follow-up}

**Block advance condition:** {condition that must clear before this deal can advance to next stage}
```

### Step 5 — Suggest specific stakeholder candidates

For deals missing a specific role, run a quick lookup to suggest who at the company most likely fills it:

- For missing `economic_buyer`: search LinkedIn for senior-most title in the relevant function at the account
- For missing `technical_evaluator`: search for directors/heads of engineering/architecture/data
- For missing `champion`: identify mid-senior contacts who've engaged with content but aren't yet on the deal

Output: 1-3 named candidates with their LinkedIn URL, current role, and a one-line "why this person."

This turns the audit from a complaint into an action.

### Step 6 — Output

```markdown
## Pipeline Single-Thread Audit — {date}

**Deals audited:** {N}
**Healthy:** {N1} ({pct}%)
**Caution:** {N2} ({pct}%)
**At-risk:** {N3} ({pct}%)

**Total ACV at risk:** ${X}
**Most common gap:** {gap type with count}

---

### At-risk deals ({N3})

#### {Account name} — ${ACV} — {AE name}
{full per-deal audit as above}

#### {next account}...

---

### Caution-tier deals ({N2})
{condensed table}

---

### Multithreading queue (sorted by ACV × close-date proximity)

| Priority | Deal | Action | Suggested contact | Owner |
|---|---|---|---|---|
| P0 | {Account} | {action} | {name + LinkedIn} | {AE} |
| P1 | {Account} | {action} | {name + LinkedIn} | {AE} |
| ... | ... | ... | ... | ... |

---

### Recommendations to manager
- **{Number}** deals at-risk represent ${total} in pipeline. Block their advance until coverage clears.
- **{Number}** deals without named champions — coaching conversation with {AE list}.
- **{Number}** deals with champions inactive >14 days — likely champion-departure or de-prioritization. Verify.

### Output files
- `single-thread-audit-{date}.md` — this report
- `single-thread-audit-{date}.csv` — per-deal data
- `multithreading-tasks-{date}.csv` — the action queue, ready for CRM task import
```

## Cadence

The skill is meant for weekly pipeline review:

- **Monday morning** — run before the manager's pipeline meeting
- **Output goes to:** the manager's pipeline review deck + AE Slack DMs with their specific deals

For larger orgs, also run pre-quarter-end on the entire forecast list. Single-threaded deals in the commit forecast are the single biggest cause of last-week slips.

## Edge Cases

- **Existing customer expansion deals** — different rules. The "champion" is often the existing CSM relationship, not a new buyer. Skip the strict multithread checks for renewal/expansion stages; flag separately.
- **Self-serve PLG-sourced deals** — early-stage may legitimately be single-threaded by design. Apply the audit only past a certain stage (PLG champion is real, not a single-thread risk).
- **Deals where the champion IS the economic buyer** — common in mid-market. Don't flag as missing economic-buyer when the champion's title qualifies. The skill checks title weight against company size.
- **Deals with very low ACV that snuck above threshold** — automation may have miscoded the ACV. Verify before flagging the AE.
- **Deals where only one stakeholder ever engaged because the rep just didn't multithread yet** — vs. deals where the buyer organization is genuinely small. The skill can't perfectly distinguish; the recommendation is to look at company size + buying-committee norms in the vertical.

## Cost

| Component | Cost |
|---|---|
| CRM pull | API-dependent |
| Per-deal audit (LLM-light) | ~$0.005 |
| Stakeholder candidate lookup (when needed) | ~$0.05 per missing role |
| Report generation | ~$0.02 |
| **Per audit, 100-deal pipeline** | **~$2-5** |

## Tools Required

- CRM read access
- LLM for role classification + recommendation generation
- Optional: LinkedIn lookup (`linkedin-profile-post-scraper`) for stakeholder candidate suggestions
- Optional: `champion-tracker` (existing) for champion-departure detection

## Trigger Phrases

- "Run the single-thread audit"
- "Which deals are at risk of slipping?"
- "Flag deals without exec coverage"
- "Pipeline review — multithread gaps"
