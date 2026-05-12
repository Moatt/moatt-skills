---
name: churn-risk-detector
description: >
  Sweep through support tickets, Slack threads, NPS scores, and usage signals to flag
  accounts trending toward churn. Produces a weekly risk scorecard split into severity
  tiers, with root-cause hypotheses and tailored save plays per account. Aimed at
  seed/Series A teams where one founder or a lone CSM still juggles every account by hand.
tags: [research]
---

# Churn Risk Detector

Spot accounts heading for cancellation while there's still time to act. Pulls signals from support, communication channels, and usage telemetry into a scored risk dossier with concrete save actions per account.

**Built for:** Early-stage teams without a customer success platform — no Gainsight, no ChurnZero. You're working off a customer spreadsheet, a Slack channel, and a support inbox. This skill converts those scattered signals into a churn risk list you can actually act on.

## When to Use

- "Which customers look like they're slipping away?"
- "Kick off this week's churn risk scan"
- "Flag the accounts I should be losing sleep over"
- "Which customers have we gone quiet with?"
- "Spin up a customer health snapshot"

## Phase 0: Intake

### Account Data
1. **Customer list** — CSV or sheet covering: company name, primary contact email, contract value (MRR/ARR), contract start date, renewal date (if known)
2. **Product/service type** — What's the customer actually paying for? (Used to calibrate engagement expectations)

### Signal Sources (share whatever you have)
3. **Support tickets** — Export from Intercom, Zendesk, or your inbox (CSV with: customer, date, subject, status, resolution time)
4. **Slack channel history** — A customer Slack channel or shared channel transcript
5. **NPS/CSAT scores** — Recent survey scores and comments
6. **Usage data** — Whatever metrics you track: logins, API calls, features touched, active users (CSV export)
7. **Email/communication log** — Last touchpoints per account (dates + context)
8. **Billing data** — Payment failures, downgrades, discount asks

### Calibration
9. **Define "healthy"** — Paint a picture of a healthy customer (e.g., "daily logins, 3+ active features, replies within 24h")
10. **Past churn reasons** — Why have previous customers walked? (used to weight signals correctly)

## Phase 1: Signal Extraction

### 1A: Support Signal Analysis

Working off the support ticket data, derive per-account values:

| Signal | Calculation | Risk Weight |
|--------|-------------|-------------|
| **Ticket volume spike** | More than double their average in the trailing 30 days | High |
| **Unresolved tickets** | Tickets still open beyond 7 days | High |
| **Escalation language** | Keyword matches: "cancel", "frustrated", "alternative", "not working", "disappointed" | Critical |
| **Response time degradation** | Your average response time to this account trending in the wrong direction | Medium |
| **Repeat issues** | The same problem logged on two or more occasions | High |

### 1B: Communication Signal Analysis

Pulled from Slack and email history:

| Signal | Calculation | Risk Weight |
|--------|-------------|-------------|
| **Gone silent** | Zero messages in the last 30+ days (after a period of active engagement) | High |
| **Decreasing frequency** | Message volume off more than 50% versus the prior 90-day window | Medium |
| **Negative sentiment shift** | Tone has slid from positive into neutral or negative territory | Medium |
| **Champion disengagement** | Your primary contact has stopped responding | Critical |
| **New stakeholder questions** | A fresh face asking foundational "what does this do?" questions | Medium (possible reorg) |

### 1C: Usage Signal Analysis (when data exists)

| Signal | Calculation | Risk Weight |
|--------|-------------|-------------|
| **Login drop** | Active user count down more than 30% month-over-month | High |
| **Feature abandonment** | A previously regular key-feature usage has dried up | High |
| **Shallow usage** | They're touching one feature despite paying for many | Medium |
| **No growth** | Seat/user count flat for the past 6+ months | Low |
| **Export spike** | A sudden jump in data exports | Critical (potential migration) |

### 1D: Commercial Signal Analysis

| Signal | Calculation | Risk Weight |
|--------|-------------|-------------|
| **Discount request** | Pricing reduction has been requested | High |
| **Downgrade inquiry** | They've asked about a lower tier | Critical |
| **Payment failure** | A failed payment that's now over 7 days old | High |
| **Contract approaching renewal** | Renewal is less than 60 days out and no renewal conversation has happened | Medium |
| **Competitor mention** | A competitor has been named in any channel | High |

## Phase 2: Risk Scoring

### Scoring Model

Every account picks up a composite risk score on a 0-100 scale:

```
Risk Score = Σ (signal_weight × signal_present)

Weights:
  Critical signal = 25 points each
  High signal     = 15 points each
  Medium signal   = 8 points each
  Low signal      = 3 points each

Score cap: 100
```

### Risk Tiers

| Tier | Score | Label | Action Urgency |
|------|-------|-------|---------------|
| **Red** | 70-100 | Critical risk — odds of churn are high | Act this week |
| **Orange** | 40-69 | Elevated risk — attention required | Within two weeks |
| **Yellow** | 20-39 | Early warning — keep eyes on it | Within a month |
| **Green** | 0-19 | Healthy — no intervention required | Routine check-in |

## Phase 3: Save Play Generation

For every Red and Orange account, produce a tailored save play:

### Save Play Template

```
ACCOUNT: [Company Name]
RISK TIER: [Red/Orange]
RISK SCORE: [X/100]
MRR/ARR: $[X]

SIGNALS DETECTED:
- [Signal 1] — [Evidence: specific data point]
- [Signal 2] — [Evidence]
- [Signal 3] — [Evidence]

ROOT CAUSE HYPOTHESIS:
[1-2 sentences: What do you think is actually going wrong?
 E.g., "Champion has left and the new stakeholder has not been onboarded"
 or "They've hit a technical limit on [feature] that blocks their primary use case"]

RECOMMENDED SAVE PLAY:
1. [Immediate action — e.g., "Book a call with [contact] this week"]
2. [Follow-up — e.g., "Send a personalised Loom showing how to solve [specific issue]"]
3. [Structural fix — e.g., "Schedule a dedicated onboarding session for the new stakeholder"]

TALK TRACK:
"[2-3 sentences the CSM/founder can lean on to open the conversation naturally,
 without literally saying 'we noticed you might be churning']"

ESCALATION TRIGGER:
If [specific condition] hasn't shifted by [date], escalate to a [founder/CEO call].
```

## Phase 4: Output Format

```markdown
# Churn Risk Report — Week of [DATE]
Total accounts scanned: [N]
Data sources: [list whatever was available]

---

## Risk Summary

| Tier | Count | Total MRR at Risk |
|------|-------|-------------------|
| 🔴 Red (Critical) | [N] | $[X] |
| 🟠 Orange (Elevated) | [N] | $[X] |
| 🟡 Yellow (Early Warning) | [N] | $[X] |
| 🟢 Green (Healthy) | [N] | $[X] |

**Total MRR at risk (Red + Orange):** $[X] ([Y]% of total MRR)

---

## 🔴 Critical Risk Accounts

### [Company Name 1] — Score: [X]/100 | MRR: $[X]
**Signals:** [bullet list]
**Root cause:** [hypothesis]
**Save play:** [specific actions]
**Owner:** [who should act]
**Deadline:** [date]

### [Company Name 2] — ...

---

## 🟠 Elevated Risk Accounts

### [Company Name] — Score: [X]/100 | MRR: $[X]
**Signals:** [bullet list]
**Recommended action:** [1-2 sentences]

---

## 🟡 Early Warning Accounts

| Account | Score | Key Signal | Suggested Action |
|---------|-------|------------|-----------------|
| [Name] | [X] | [Signal] | [Action] |
| [Name] | [X] | [Signal] | [Action] |

---

## Trends vs Last Week

- Accounts that moved Red → Green: [list — wins!]
- Accounts that moved Green → Yellow/Orange: [list — new risks]
- Accounts that churned since the last report: [list]

---

## Signal Distribution

| Signal Type | Accounts Affected |
|------------|-------------------|
| Support ticket spike | [N] |
| Gone silent | [N] |
| Usage decline | [N] |
| Competitor mention | [N] |
| Payment issue | [N] |
| Champion disengagement | [N] |

---

## Recommended Focus This Week

1. **[Account]** — [Why + what to do]
2. **[Account]** — [Why + what to do]
3. **[Account]** — [Why + what to do]
```

Save it to `risk-report-[YYYY-MM-DD].md` in the current working directory.

## Scheduling

Schedule it weekly:

```bash
0 8 * * 1 python3 run_skill.py churn-risk-detector --client <client-name>
```

## Cost

| Component | Cost |
|-----------|------|
| All signal analysis | Free (LLM reasoning) |
| Slack/email parsing | Free |
| **Total** | **Free** |

## Tools Required

- Input data from CSV/sheets (support tickets, usage, NPS)
- **Optional:** Slack channel read access for communication signals
- No external API costs — analysis only

## Trigger Phrases

- "Which customers are at risk?"
- "Run the churn risk scan"
- "Weekly customer health report"
- "Flag at-risk accounts"
