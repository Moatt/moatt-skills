---
name: mutual-action-plan-builder
description: >
  Generate a buyer-seller mutual action plan from discovery notes — a shared
  timeline of milestones, owners, and dates between the seller and buyer to
  drive enterprise deals to close. Includes legal/security review checkpoints,
  pilot setup steps, signature/launch dates, and a champion-coachable summary.
  Outputs both a markdown plan and a Notion/Google-Docs-friendly format.
tags: [outreach]
---

# Mutual Action Plan Builder

A mutual action plan (MAP) is the artifact that separates enterprise AEs who close on time from those who slip every quarter. It's a shared document between buyer and seller listing every step from current state to live customer, with owners and dates. This skill builds one from discovery notes, calibrates the timeline against typical deal cycle data, and produces a champion-shareable artifact.

**Built for:** AEs running deals over $50K ACV that touch 2+ stakeholders, especially when legal review, security review, procurement, or implementation are involved. Skip this for transactional self-serve.

## When to Use

- "Build a MAP for the {Account} deal"
- "Generate the mutual action plan from these discovery notes"
- "Make me a close plan for {Prospect}"
- "Draft the project plan for {Champion} to review"

## Phase 0: Intake

Required:
1. **Account name + champion name + economic buyer** (if known)
2. **Discovery notes** — paste, file path, or Gong/Chorus transcript
3. **Target close date** — buyer's stated trigger / event / fiscal date / our quarter end
4. **Deal size band** — affects which review steps are mandatory

Optional but improves accuracy:
5. **Standard implementation timeline for your product** — typical days from contract to live
6. **Legal/security review SLA** — at the buyer's company, if known
7. **Existing MAP template** — if your team has a base template, the skill will fill it in instead of generating from scratch

## Phase 1: Extract milestones from discovery

Parse the discovery notes for stated buyer requirements. Build the milestone backbone — every deal has these unless explicitly waived:

### Core milestones (always include)
1. **Discovery completed** — past tense, today
2. **Demo / technical walkthrough** — if not yet done
3. **Stakeholder alignment** — every named decision-maker has agreed in principle
4. **Reference call** — buyer talks to a similar customer (skip if buyer waived)
5. **Pricing proposal** — formal pricing sent
6. **Pilot / proof of value** — small-scope live test (if buyer requires)
7. **Security review** — depends on buyer policy + deal size
8. **Legal review** — MSA / DPA / order form
9. **Procurement / vendor onboarding** — buyer's purchasing process
10. **Contract signature** — both parties
11. **Kickoff / implementation start**
12. **First production use**
13. **Success criteria validation**
14. **Renewal / expansion checkpoint** (set 90 days post-launch)

### Conditional milestones (extract from discovery)
- **InfoSec / SOC2 questionnaire** — if buyer is regulated (financial, healthcare, government)
- **Privacy review (DPIA / DPA)** — if EU buyer or PII handling
- **Integration build** — if technical lift required
- **Migration from existing tool** — if displacement deal
- **Internal training rollout** — if user count > 50
- **Executive sponsor sign-off** — if deal size > $200K or 1-year commit + auto-renew

For each milestone, capture from discovery:
- Stated owner (buyer side, seller side, or shared)
- Stated dependency (what must be done before this can start)
- Stated SLA (if mentioned by the buyer)
- Stated risk (anything they flagged as a potential blocker)

## Phase 2: Calibrate the timeline

Working backward from the target close date, sequence each milestone with realistic durations.

### Default durations (tune by deal profile)

| Milestone | Typical duration | Notes |
|---|---|---|
| Stakeholder alignment | 5-10 business days | Faster if champion is the EB |
| Reference call | 5-7 business days | Coordination is the bottleneck |
| Pricing proposal | 1-2 business days | After alignment |
| Pilot / POV | 14-30 calendar days | Negotiable scope |
| Security review | 10-30 business days | Depends on buyer |
| Legal review | 5-20 business days | Depends on buyer + redlines |
| Procurement | 5-15 business days | Often parallel with legal |
| Signature | 1-3 business days | After all reviews |
| Implementation | Product-dependent | From your stored typical timeline |

### Sanity checks
- **No milestone before "today + 1 business day"** — past dates aren't a plan
- **No two milestones on the same calendar day for the same owner** — split them
- **Dependencies are explicit** — every milestone after milestone 1 has a "starts after X" pointer
- **Total elapsed days vs. target close date** — if the math doesn't work, the skill flags it explicitly rather than silently shortening durations

### Risk flags
After sequencing, surface any of these:
- Total path > target close date → flag, propose where to compress
- Critical path through buyer-owned steps with no buffer → flag
- Buyer holiday / company-wide freeze inside the timeline (use known calendars when available)
- Multiple buyer reviews stacked sequentially when they could parallelize → recommendation

## Phase 3: Generate the MAP

### Format A: Internal markdown (for the AE + CRM attachment)

```markdown
# Mutual Action Plan: {Buyer Co} ⇄ {Seller Co}
**Target close date:** {date}
**Target go-live date:** {date}
**Champion:** {name + title}
**Economic buyer:** {name + title}
**AE:** {name}

---

## Success criteria (what "done" looks like)
*Stated by {champion name} on {date}:*
- {Criterion 1, in their words}
- {Criterion 2}
- {Criterion 3}

These are the agreed measures of success. The plan below is the path to them.

---

## Plan

| # | Milestone | Owner | Start | Due | Status |
|---|---|---|---|---|---|
| 1 | Discovery completed | Both | — | {date past} | ✅ Done |
| 2 | Stakeholder alignment ({list of stakeholders}) | Buyer | {date} | {date} | ⏳ |
| 3 | Reference call with {Reference Co} | Seller (coord), Buyer (attend) | {date} | {date} | ⏳ |
| 4 | Pricing proposal | Seller | {date} | {date} | ⏳ |
| 5 | Pilot scope agreed | Both | {date} | {date} | ⏳ |
| 6 | Security review (questionnaire) | Buyer InfoSec | {date} | {date} | ⏳ |
| 7 | Legal review (MSA + DPA) | Both legal | {date} | {date} | ⏳ |
| 8 | Procurement onboarding | Buyer Procurement | {date} | {date} | ⏳ |
| 9 | Contract signature | Both | {date} | {date} | ⏳ |
| 10 | Kickoff call | Both | {date} | {date} | ⏳ |
| 11 | Implementation phase 1 | Both | {date} | {date} | ⏳ |
| 12 | First production use | Buyer | {date} | {date} | ⏳ |
| 13 | Success criteria checkpoint | Both | {date} | {date} | ⏳ |

---

## Risks the plan acknowledges
- {Risk 1 — e.g., "InfoSec review is on critical path; their stated SLA is 15 business days"}
- {Risk 2 — e.g., "buyer-side legal reviewer is OOO {dates}"}
- {Risk 3}

## Dependencies on the buyer
- {Specific thing the champion needs to drive}
- {Specific thing the EB needs to confirm}

## Dependencies on us
- {What we owe and when}
- {What we owe and when}

## Standing communication
- {Cadence — e.g., weekly 15-min sync at {time}}
- {Escalation path — who calls whom if a milestone slips}
```

### Format B: Champion-shareable (Notion / Google Doc / shared view)

Same plan, reformatted as something the champion can comfortably forward to their VP. Differences:

- Drop seller-internal language
- Lead with buyer's success criteria, not the plan
- Use neutral language ("Both," not "Seller does")
- Add a footer with the seller's contact info
- Include a "what we agreed" section at top to make the plan feel co-authored

The champion sharing it up the chain is the goal. Most VPs will look at the dates and the success criteria, then either approve or escalate.

### Format C: One-line summary (for Slack / Salesforce notes)

```
MAP for {Account}: signature {date}, go-live {date}. Critical path: InfoSec ({duration}) → Legal ({duration}) → Procurement ({duration}). Buyer dependencies: {champion task}, {EB task}. Risks: {top risk}.
```

## Phase 4: Champion coaching note

Generate a separate note for the AE: how to introduce the MAP to the champion. The champion shouldn't feel ambushed — the plan should feel collaborative.

```markdown
## How to share this with {Champion name}

**Subject for the email:** "Quick draft — does this path to launch look right?"

**Opening line:**
"Based on what you shared on Tuesday, I tried to lay out the steps to {go-live target}. Wanted to send the draft so we can adjust where I got it wrong. The two places I flagged risk are {X} and {Y} — does that feel about right, or do you see them differently?"

**Why this framing works:**
- "draft" — implies they have edit power
- "does this path look right" — invites their corrections, doesn't dictate
- Naming risks — shows you're realistic, not running a happy-path forecast
- Asking for their view on risks — they'll tell you the *real* blockers

**Watch for these reactions:**
- "Looks good, let's go" → champion is bought in. Get the EB CC'd.
- "Let me run it by {name}" → they want internal alignment first. Good — gives you a stakeholder you didn't have.
- "Some of these dates are aggressive" → they're flagging where they don't have control. Ask which one specifically.
- Silence for 5+ days → champion isn't actually championing. Re-evaluate.
```

## Phase 5: CRM + tracking integration

For each milestone, generate a structured `milestones.json` that can sync to the CRM (HubSpot, Salesforce) as deal-stage gates:

```json
{
  "deal_id": "<crm id>",
  "milestones": [
    {
      "id": "stakeholder-alignment",
      "label": "Stakeholder alignment",
      "owner": "buyer",
      "due_date": "2026-05-22",
      "blocks": ["pricing-proposal"],
      "status": "in_progress"
    }
  ]
}
```

This lets sales ops build a dashboard of every active MAP and surface ones with slipping critical paths.

## Edge Cases

- **Buyer hasn't named an economic buyer** — flag this prominently. The MAP can still be useful, but `unknown EB` is a critical-path risk in itself.
- **Buyer wants to skip security review** — note explicitly in the plan; flag if your standard practice requires it. Don't silently drop it.
- **Compressed timeline (target < typical critical path)** — lay out two parallel plans: a "happy path" and a "fully sequential" path, with deltas.
- **No discovery notes provided** — refuse to generate. Ask for notes. A MAP without grounded success criteria is a fictional plan.

## Cost

| Component | Cost |
|---|---|
| Discovery parsing (LLM) | ~$0.02 |
| Plan synthesis (LLM) | ~$0.05 |
| Champion-coaching note (LLM) | ~$0.01 |
| **Total per MAP** | **~$0.10** |

## Tools Required

- LLM for parsing + synthesis
- Read/Write for output files
- Optional: CRM access for milestone sync
- Optional: calendar API for buyer-side holiday checks

## Trigger Phrases

- "Build a MAP for {Account}"
- "Generate the mutual action plan"
- "Make me a close plan for {Prospect}"
- "Draft the project plan for {Champion}"
