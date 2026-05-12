---
name: usage-drop-csm-trigger
description: >
  Monitor weekly active usage per customer account, detect significant
  drops (below 50% of baseline for 2+ consecutive weeks, or below 30%
  in a single week), and fire a CSM task with a pre-written
  re-engagement script. Catches churn signals 60-90 days before
  renewal; the highest-leverage retention play in a SaaS GTM motion.
tags: [research]
---

# Usage Drop CSM Trigger

The single best churn predictor for product-led SaaS is a sustained drop in product usage. By the time a customer says "we're not seeing value" on a renewal call, the usage data was screaming about it 60-90 days earlier. This skill catches the drop early and routes a CSM action — preventing churn through proactive outreach instead of reactive firefighting.

**Built for:** SaaS CS teams (PLG or sales-led) where product telemetry exists but isn't yet wired to a churn-prevention motion.

## When to Use

- "Run the usage-drop scan on our customer base"
- "Which accounts are showing churn signals?"
- "Surface customers with declining usage"
- "Weekly health-check for the CS queue"

## What "usage drop" actually means

Different products have different telemetry, but the core pattern is consistent:

| Product type | Primary usage signal |
|---|---|
| Collaboration / docs | Daily active users, sessions, edits |
| Analytics / BI | Queries run, dashboards viewed, reports generated |
| Developer tools | API calls, CLI commands, builds |
| Marketing automation | Campaigns sent, contacts touched, workflows run |
| CRM / sales tech | Records updated, sequences activated, calls logged |
| Communication | Messages sent, channels active |

The skill is metric-agnostic: it tracks whatever you tell it is your "primary engagement metric" per account.

## Inputs

Required:
- **Customer list** — accounts with: account_id, name, plan, ARR, contract_start_date, renewal_date, CSM/AE owner
- **Usage data source** — one of:
  - CSV export with `account_id`, `week_start`, `metric_value`
  - Database query (Postgres, BigQuery, Snowflake)
  - API endpoint that returns weekly usage per account
  - Mixpanel / Amplitude / Heap export
- **Primary engagement metric** — which value defines "usage" (e.g., `weekly_active_users`, `api_calls`, `sessions`)

Optional but improves accuracy:
- **Onboarding completion date** — to exclude accounts still in ramp from the drop check
- **Plan-tier benchmarks** — what's "normal" usage for each plan
- **Previously-flagged accounts** — to avoid re-firing on the same drop multiple weeks

## Workflow

### Step 1 — Compute per-account baseline

For each account:

1. Pull the last 12 weeks of weekly usage
2. Exclude the most recent 4 weeks (those are what we'll evaluate against)
3. Compute baseline = trimmed mean of weeks 5-12 (drop top + bottom 1 to handle outliers)
4. Compute standard deviation of weeks 5-12

If account has < 8 weeks of history, mark as `insufficient_history` and skip the drop check; route to "still onboarding" if within 90 days of contract start.

### Step 2 — Evaluate recent usage

For each account with sufficient history:

- **Last week's usage** = `current_week`
- **Two-week trailing average** = `(current_week + last_week) / 2`
- **Drop signals:**
  - **Hard drop:** `current_week < 0.30 × baseline` — fired even if just 1 week
  - **Sustained drop:** `two_week_trailing < 0.50 × baseline` — fired if both weeks are below
  - **Slow decline:** baseline trending down for 4 consecutive weeks vs. prior period — fires "watch" status
- **Healthy:** `current_week ≥ 0.80 × baseline` — no flag

### Step 3 — Score severity

| Signal | Severity | Action |
|---|---|---|
| Hard drop (this week < 30% baseline) | Critical | CSM call within 48h |
| Sustained drop (2 weeks < 50% baseline) | High | CSM call within 7d |
| Slow decline (4 weeks trending down) | Medium | Add to CSM weekly review queue |
| Account approaching renewal (≤90 days) AND any drop | Critical | Override severity to critical |
| Account has open support tickets AND drop | Critical | Coordinate with support before reaching out |

### Step 4 — Diagnose the likely cause

For each fired account, look for context that informs the outreach:

- **Recent onboarding milestone missed?** Cross-reference activation events.
- **Champion departure?** Cross-reference with `champion-departure-trigger`.
- **Support tickets unresolved?** Cross-reference support data.
- **Feature usage shift?** What did they stop using? (Specific: did the dashboard usage drop while the API still works? That's a workflow-change signal, not a churn signal.)
- **Seasonality?** Some businesses have natural lulls (December for B2C, summer for K-12 vertical). Don't fire on seasonal patterns if they're known.

### Step 5 — Generate the CSM outreach script

Each fired account gets a tailored script. Generic "noticed your usage dropped, hop on a call?" reads like a sales email. The script must reference the specific drop and a probable hypothesis.

```markdown
## CSM Action — {Account name}

**Severity:** {tier}
**Trigger:** {hard_drop | sustained_drop | slow_decline}

**The data:**
- Baseline: {baseline_value} {metric} per week (over 8-week window)
- Recent: {current_value} {metric} (last week), {prior_value} (week before)
- Change: {-X%} from baseline

**Likely cause:** {LLM-inferred from context — e.g., "Champion {name} departed 3 weeks ago; usage drop coincides."}

**Renewal status:** {N days until renewal date}
**Account ARR:** ${X}
**Owner:** {CSM name}

---

### Recommended outreach

**Subject:** Quick check-in on {Account}'s {metric}

Hi {primary contact},

Wanted to check in directly — I've been watching your team's {metric} this past
month and noticed it's pulled back from where you'd been the prior quarter.

A few things that could be in play, in my experience:
- Workflow change on your end (different team, different process, different tool)
- A specific feature isn't doing what you need
- Just a busy month

I'd love 20 minutes this week or next to hear what's actually going on. Worst
case it's nothing, and I'll stop watching the chart so closely. Best case
there's something we can fix.

What's open in your calendar?

{CSM signature}
```

### Step 6 — Output + delivery

Default delivery options:

- **Markdown report** of all fired accounts
- **CSV** for CRM import (creates CSM tasks)
- **Slack DM** to each CSM with their fired accounts
- **Calendar block** on the CSM calendar for the recommended outreach time

### Step 7 — De-duplicate against prior weeks

Track which accounts fired in the prior 4 weeks. If an account is still in drop status:
- Don't re-fire critical/high every week. Re-fire only if severity changes (e.g., went from sustained to hard drop) or 4+ weeks have passed.
- Still surface in the weekly summary, but don't generate fresh outreach scripts every week — they age into "creepy" quickly.

## Anti-patterns

- **Firing on seasonal lulls without checking the prior year's pattern** — easy false positive
- **Outreach scripts that feel like surveillance** — the rule of thumb: every script must include "if it's nothing, I'll stop watching" type framing
- **Outreach to the wrong contact** — if the champion is gone, emailing them is dead air. Cross-check active contacts.
- **Daily monitoring** — usage data is noisy at the daily level; weekly cadence is the right granularity
- **Ignoring product launches** — a usage drop right after a major UI change is a UX regression signal, not a churn signal

## Edge Cases

- **Account is on a "scheduled reduction"** — e.g., they downgraded plans intentionally. The drop is expected; mark explicitly to suppress firing.
- **Account legitimately sunset a use case** — they've finished migrating off your product to a different one or moved a use case in-house. The drop is real but action is acceptance, not retention.
- **Massive single-week spike followed by drop** — was the spike anomalous (load test, demo prep, conference)? If so, the "drop" is just normalization. Flag for human review.
- **Brand-new account in first 30 days** — exclude from baseline math. Use plan benchmarks instead.
- **Multi-product customer where one product drops while another grows** — the right outreach is "switching products, not leaving us." Don't fire as churn; flag as product-mix-change.

## Cost

| Component | Cost |
|---|---|
| Usage data pull | Free (your data) |
| Per-account baseline + drop check | Free (local math) |
| Cause-diagnosis LLM | ~$0.005 per fired account |
| Script generation LLM | ~$0.01 per fired account |
| **Per weekly run, 500-customer base** | **~$1-3 (only fired accounts cost)** |

## Tools Required

- Read access to usage data (DB / API / CSV)
- LLM for cause-diagnosis + script generation
- Optional: CRM write access for task creation
- Optional: Slack webhooks for CSM notifications
- Optional: cross-reference with `champion-departure-trigger` (existing/Wave 1)

## Trigger Phrases

- "Run the usage-drop scan"
- "Which accounts are showing churn signals?"
- "Surface customers with declining usage"
- "Weekly health check for CS"
