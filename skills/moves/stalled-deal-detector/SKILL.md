---
name: stalled-deal-detector
description: >
  Identify open opportunities with no buyer-side activity in 14+ days,
  no advancement in stage in 30+ days, or stage inconsistencies (deals
  that should have multi-stakeholder engagement at this stage but
  don't). Outputs a prioritized list with the specific stall pattern,
  diagnosed cause, and a tailored re-engagement recommendation per
  deal. Different from single-thread-risk-flag — this finds deals
  that have already gone quiet, regardless of multithreading status.
tags: [outreach]
---

# Stalled Deal Detector

The deal that's stalled in Stage 4 for 60 days is the deal that's most likely to slip out of the quarter. Reps see them in pipeline reviews and tell themselves "I'll follow up next week" — every week. This skill finds them, names the stall pattern, diagnoses the most likely cause from CRM and call data, and prescribes the specific re-engagement move.

**Built for:** Sales managers and AEs running enterprise pipeline who want a weekly objective view of which deals have actually gone quiet.

## When to Use

- "Find stalled deals in this quarter's pipeline"
- "Run the stall detector"
- "Which deals haven't moved in 30+ days?"
- "Which deals need re-engagement this week?"

## Stall Patterns

The skill detects multiple distinct stall patterns:

### Pattern 1 — Activity stall
- No buyer-side activity (email reply, meeting, demo attendance) in 14+ days
- Severity: warm at 14 days, hot at 30 days, critical at 45 days

### Pattern 2 — Stage stall
- Deal hasn't advanced stages in 30+ days vs. typical for that stage
- Each stage has a "typical days" benchmark; stall fires when 1.5× the benchmark elapses

### Pattern 3 — Champion stall
- Champion was active; suddenly went quiet
- 21+ days no activity from named champion specifically (vs. any contact)

### Pattern 4 — Single-event stall
- One specific event was the last meaningful touch (a demo, a contract sent, a security review submitted) and there's been no follow-up since

### Pattern 5 — Quiet-quitting stall
- Buyer is responsive but only to procedural questions, never to substantive product or ROI questions
- Detected from email/call sentiment + topic analysis

### Pattern 6 — Fictional progress
- Deal has moved through stages on the rep's calendar but the buyer hasn't engaged proportionally
- "Closed Won, dependent on legal review" but the buyer-side legal hasn't even seen the contract — fake progress

## Inputs

Required:
- **CRM access** — open opportunities with: deal_id, stage, ACV, expected close, primary contact, all engaged contacts, last_activity_date per contact, named champion (if populated), full activity log

Optional but improves diagnosis:
- **Call recordings** — to detect quiet-quitting and sentiment-based stall
- **Email engagement data** — opens, clicks, replies separately
- **Stage-typical-days benchmarks** — your team's data on how long deals typically spend in each stage

## Workflow

### Step 1 — Pull qualifying deals

Open opportunities with:
- Stage past initial discovery (don't fire on stage-1 deals where stall is normal)
- Expected close within current or next quarter (older / out-of-pipeline deals fire less frequently)
- ACV above a configurable floor (typically $25K+)

### Step 2 — Compute stall signals per deal

For each deal, evaluate each pattern:

```json
{
  "deal_id": "",
  "patterns_fired": [
    {"pattern": "activity_stall", "severity": "warm | hot | critical", "details": "Last buyer-side activity 28 days ago"},
    {"pattern": "stage_stall", "severity": "hot", "details": "In Stage 4 for 47 days; benchmark 22 days"},
    ...
  ],
  "patterns_count": 0,
  "composite_severity": "warm | hot | critical"
}
```

A deal firing 2+ patterns is a higher confidence stall than a single-pattern stall.

### Step 3 — Diagnose likely cause

For each stalled deal, run a diagnostic LLM pass over:
- Recent emails / Gong transcripts (last 60 days)
- CRM notes
- Activity timeline

Output a likely cause:

| Likely cause | Diagnostic signal |
|---|---|
| Champion blocked by EB / committee | Champion responsive but never lands the meeting; emails punt to "after I get alignment" |
| Champion left / role change | LinkedIn shows departure; cross-reference with `champion-departure-trigger` |
| Competitor evaluation in progress | Buyer mentions "evaluating other options"; specific mentions of named competitor |
| Budget freeze / fiscal cycle pause | Mentions of "Q+1" / "after we close books" / "FY planning" |
| Deprioritized due to other initiative | Buyer mentions other named initiative consuming attention |
| Real disinterest (silent fade) | No reply on substantive content for 30+ days; previously was responsive |
| Procurement / legal wait state | Deal genuinely waiting on buyer-side review; not a stall |
| Unknown | None of the above signals fired |

The diagnostic isn't always confident; flag low-confidence diagnoses for human review.

### Step 4 — Prescribe re-engagement move

Per likely cause, the prescribed move differs:

| Cause | Recommended move |
|---|---|
| Champion blocked by EB | Offer to brief the EB directly; provide an exec brief the champion can forward |
| Champion departed | Pivot to retention play (`champion-departure-trigger`) |
| Competitor evaluation | Offer a side-by-side; pull `battlecard-generator` |
| Budget freeze | Acknowledge the timing; lock in re-engage date with a specific trigger |
| Deprioritized | Acknowledge the priority shift; offer low-cost interim resource |
| Real disinterest | Run `breakup-permission-close` (Wave 2) |
| Procurement wait | Confirm the actual blocker; manage expectations on timeline |
| Unknown | Diagnostic call — gentle outreach asking the champion directly what's happening |

For each, the skill drafts the specific outreach message.

### Step 5 — Output

```markdown
## Stalled Deal Scan — {date}

**Open opportunities scanned:** {N}
**Stalled (any pattern):** {M}
**Critical severity:** {K}
**Total ACV at stall risk:** ${X}

---

### Critical-severity stalls ({K} deals)

#### {Account name} — ${ACV} — {AE} — Stage {stage}
- **Patterns fired:** {2 patterns: stage_stall (47d in S4 vs. 22d benchmark) + activity_stall (28d no buyer activity)}
- **Most recent meaningful touch:** {28d ago — demo on {date}}
- **Likely cause:** Champion blocked by EB ({confidence: medium})
- **Diagnostic signals:**
  - Champion's last 3 replies all punted to "after I get alignment"
  - No EB engagement detected; EB never on a call
  - Demo deck shared but no opens by EB-tier contact
- **Recommended move:** Offer to brief the EB directly. Draft an exec brief the champion can forward.
- **Outreach draft:** {markdown of the specific email}
- **Block-advance flag:** Yes — block this deal from moving to Closed Won forecast until champion shows EB-side activity.

#### Next critical deal...

---

### Hot-severity stalls
{condensed table with similar structure}

### Warm-severity stalls
{table}

---

### By likely cause

| Cause | Count | Total ACV | Recommended team action |
|---|---|---|---|
| Champion blocked by EB | {N} | ${X} | Group review with sales leadership |
| Champion departed | {N} | ${X} | Run champion-departure-trigger plays |
| Competitor evaluation | {N} | ${X} | Pull updated battlecards |
| Budget freeze | {N} | ${X} | Lock in Q+1 re-engage dates |
| Deprioritized | {N} | ${X} | Interim-resource plays |
| Real disinterest | {N} | ${X} | Run breakups; preserve future option |
| Procurement wait | {N} | ${X} | Verify blocker; legitimate, not stalled |
| Unknown | {N} | ${X} | Diagnostic call needed |

---

### Pipeline forecast adjustment recommendation
Based on detected stalls, the {current quarter} forecast should be adjusted:
- Highly-likely-to-slip ($X — critical stalls without diagnosed recoverable cause)
- Watch ($X — hot stalls with recoverable causes)
- Stable ($X — non-stalled deals)

### Output files
- `stall-scan-{date}.md` — this report
- `stall-scan-{date}.csv` — per-deal data
- `outreach-drafts-{date}/` — per-deal re-engagement drafts
- `pipeline-forecast-adjustment-{date}.csv` — for sales ops
```

## Cadence

Designed for weekly run alongside the manager's pipeline review. Outputs go to:
- Manager's pipeline review deck
- AEs' Slack DMs with their specific deals
- Sales ops dashboard for forecast adjustment

## Anti-patterns

- **Re-engaging every stalled deal with the same generic "checking in" email** — the diagnostic-driven move is the value here; using the report just to fire generic emails wastes the analysis
- **Treating procurement-wait state as stall** — not all deals on hold are problematic. The skill distinguishes; reps shouldn't override.
- **Not breaking up with stalled-real-disinterest deals** — they consume forecast confidence with no payoff. Run `breakup-permission-close` and clear the pipeline.

## Edge Cases

- **Deal moved stages within last 7 days** — exclude from stage-stall (recent advancement). May still qualify for activity-stall if last buyer-side activity was pre-stage-change.
- **Deal is in customer-driven hold** (buyer explicitly paused) — flag separately; not a stall, but a known-pause state. Different action queue.
- **Rep just rotated onto deal** — first 14 days under new owner are forgiven. Track rep change.
- **Deal is a renewal opportunity** — different stall semantics (renewal stalls are about engagement timing relative to renewal date, not deal-stage progression). Use a separate renewal-aware pattern.

## Cost

| Component | Cost |
|---|---|
| CRM pull | API-dependent |
| Pattern detection per deal | Free |
| Diagnostic LLM per stalled deal | ~$0.02 |
| Outreach draft per deal | ~$0.02 |
| Report generation | ~$0.05 |
| **Per weekly run, 200-deal pipeline** | **~$5-10** |

## Tools Required

- CRM read access
- LLM for diagnostic + outreach drafting
- Optional: call recording transcript access for richer diagnosis
- Optional: cross-skill triggers (`champion-departure-trigger`, `breakup-permission-close`, `battlecard-generator`)

## Trigger Phrases

- "Find stalled deals"
- "Run the stall detector"
- "Which deals haven't moved in 30+ days?"
- "Which deals need re-engagement?"
