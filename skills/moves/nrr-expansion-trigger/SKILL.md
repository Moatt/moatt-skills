---
name: nrr-expansion-trigger
description: >
  Identify customer accounts ready for expansion based on usage,
  team-growth, and feature-coverage signals — accounts at 80%+ of
  licensed capacity, accounts that have hired in roles served by
  the product, accounts where adoption is deep on core features
  and ready for adjacent ones. Outputs a tiered expansion queue
  with a 3-option proposal per account ready for the AM/CSM
  expansion conversation.
tags: [outreach]
---

# NRR Expansion Trigger

Net Revenue Retention is mathematically the highest-leverage growth lever for most SaaS businesses — expanding existing customers is 5-7x cheaper than acquiring new ones. But most expansion conversations happen reactively at renewal. This skill detects the signals that say "this account is ready to expand right now," 60-90 days before renewal, when the account has data on the table to justify it.

**Built for:** AM and CSM teams running 50+ active customers, especially in seat-based or usage-based pricing models where expansion math is signal-driven.

## When to Use

- "Run the expansion scan on our customer base"
- "Which accounts are ready to expand?"
- "Find accounts at 80%+ capacity"
- "Build the expansion queue for {AM/CSM}"

## Expansion Signals

### Usage signals
- **Capacity threshold** — account using ≥80% of licensed seats / API calls / usage tier
- **Sustained capacity utilization** — 4+ consecutive weeks above 80%
- **Hard cap hits** — account hit a usage cap and was throttled (strongest signal)
- **Power-user growth** — number of high-engagement users grew 50%+ in last quarter

### Team-growth signals
- **Hiring in the role you serve** — account is hiring more {your-product-relevant role}
- **New department adopting** — account had usage in one department, now usage spreading

### Feature signals
- **Deep core adoption + adjacent feature inquiry** — fully adopted on Tier-2 features, recent activity around Tier-3 features
- **Integration adoption** — connected to additional systems, suggesting bigger workflow centrality

### Champion signals
- **Champion promoted** — relationship now has more authority
- **Multiple champions** — usage spread to multiple senior people

### External signals
- **Customer's company raised** — funding event = budget for expansion
- **Customer hired a senior leader in the function you serve** — natural budget conversation moment
- **Customer's industry is having a tailwind moment** — cyclical opportunity

## Expansion Tiers

| Tier | Signal threshold | Expansion conversation type |
|---|---|---|
| **A — Imminent** | Hard cap hit or 90%+ capacity sustained | Within 30 days; structured expansion proposal |
| **B — Strong** | 80-90% capacity OR multiple positive signals | Within 60 days; usage-data-led conversation |
| **C — Warming** | Single positive signal | Pre-renewal pre-positioning |
| **D — Stable** | No expansion signals | Standard renewal motion |

## Inputs

Required:
- **Customer base** — accounts with: account_id, plan, ARR, contract_start, renewal_date, AM/CSM owner
- **Usage data** — same source as `usage-drop-csm-trigger`. Weekly metric values per account, broken by user / feature / dimension where possible.
- **Feature catalog** — your product's features grouped by tier (core / adjacent / advanced)

Optional but improves quality:
- **Customer team data** — known stakeholders + roles, with cross-reference to LinkedIn for change signals
- **Funding intelligence** — `company-funding-search` for external triggers
- **Customer-stated expansion blockers** — known constraints (budget freeze, vendor consolidation push, etc.)

## Workflow

### Step 1 — Compute usage capacity per account

For each customer account:

- Pull weekly usage metrics
- Compare against licensed limit (seats, API calls, etc.)
- Compute: `utilization_pct = avg_weekly_usage / licensed_limit`
- Compute: `consecutive_high_weeks = count of weeks at ≥80% of limit, last 12 weeks`
- Compute: `hard_cap_hits = count of throttled events / hit-the-limit events, last 90 days`

### Step 2 — Detect team-growth signals

- Cross-reference customer's LinkedIn / public hiring data
- Detect: hiring in product-relevant roles in last 90 days
- Detect: usage growth in new departments

### Step 3 — Detect feature signals

- Adoption depth per feature tier
- Recent activity around features outside their current plan tier (if your product gates by tier)

### Step 4 — Score per account

Composite expansion score:

```
expansion_score = (utilization_score × 35) +
                  (team_growth_score × 20) +
                  (feature_signal_score × 15) +
                  (champion_signal_score × 15) +
                  (external_signal_score × 15)
```

Tier thresholds:
- A — Imminent: composite ≥ 75 OR hard cap hit
- B — Strong: 50-74
- C — Warming: 25-49
- D — Stable: <25

### Step 5 — Build the 3-option proposal per A/B-tier account

For each tier-A or tier-B account, generate a structured 3-option proposal:

```markdown
## Expansion proposal: {Account name}

**Current state:**
- Plan: {tier}
- ARR: ${X}
- Capacity utilization: {pct}
- Renewal date: {date}

**Why now (signals fired):**
- {Signal 1 with specifics}
- {Signal 2}
- {Signal 3}

**Three options:**

### Option 1 — Add seats
- Add {N} seats at current per-seat price
- Net new ARR: +${X}/year
- Time to value: immediate
- Best when: capacity is the binding constraint

### Option 2 — Upgrade tier
- Move from {current tier} to {next tier}
- Adds: {features unlocked}
- Net new ARR: +${X}/year
- Time to value: 1-2 weeks for new feature adoption
- Best when: customer is hitting feature ceiling, not just seat ceiling

### Option 3 — Add module / cross-sell
- Add {adjacent product / module}
- Net new ARR: +${X}/year
- Time to value: 4-8 weeks
- Best when: customer has expanded scope (new department, new use case)

**Recommended starting point:** {one of the three, with reasoning}

**Suggested champion to engage:** {name + title}
**Pre-call brief:** {pulls from ai-account-brief-generator}
```

### Step 6 — Output

```markdown
## Expansion Scan — {date}

**Customer accounts scanned:** {N}
**Tier A (imminent expansion):** {N_a}, total potential ARR: ${X}
**Tier B (strong):** {N_b}, total potential ARR: ${X}
**Tier C (warming):** {N_c}
**Tier D (stable):** {N_d}

---

### Tier A — Imminent ({N_a})

#### {Account 1} — Current ARR ${X} — Renewal {date}
**Composite score:** {N}
**Top signals:** {3 specific signals}
**Recommended ARR uplift:** ${X} (Option 2 — upgrade tier)
**Owner:** {AM/CSM}
**Action by:** {date — typically within 30 days}
**Proposal doc:** {path to per-account proposal markdown}

#### Next account...

### Tier B — Strong ({N_b})
{condensed format with same fields}

### Tier C — Warming ({N_c})
{table — for AM/CSM awareness during prep, not immediate action}

---

### By owner

| AM/CSM | Tier A | Tier B | Total potential ARR |
|---|---|---|---|
| {name} | 3 | 7 | $420K |
| ... | ... | ... | ... |

---

### Output files
- `expansion-scan-{date}.md`
- `expansion-scan-{date}.csv` — flat per-account data
- `proposals/{account-slug}.md` — per-account 3-option proposal docs
- `{owner}-queue-{date}.csv` — per-AM/CSM ready-to-action queue
```

## Cadence

Designed for monthly run, with refresh of A-tier accounts weekly (so the AM/CSM doesn't miss a hot signal between monthly runs).

## Anti-patterns

- **Pushing expansion when health is poor** — adoption is the prerequisite. Customers with declining usage shouldn't be pushed to upgrade; they need retention first. The skill cross-references with `usage-drop-csm-trigger` and explicitly excludes accounts with active drop signals.
- **Generic upgrade outreach** — "saw you've been busy! want to talk about more seats?" reads as transactional. The proposal must reference specific signals.
- **Proposing the wrong option** — capacity-limited accounts shouldn't be pushed to upgrade tier (they need seats); feature-limited accounts shouldn't be pushed to add seats.
- **Pursuing low-tier accounts** — D-tier in this scan are not at-risk; they're stable. Don't pre-emptively push expansion just to hit quota.

## Edge Cases

- **Custom contract pricing** — account has a custom deal that doesn't fit standard tiers. Flag for AM-only review; standard 3-option proposal doesn't apply.
- **Multi-year prepaid** — expansion mid-term has different mechanics. Frame as "true-up at renewal" or "add module mid-term," not seat additions.
- **Champion exited** (cross-reference with `champion-departure-trigger`) — pause expansion play; address the champion gap first.
- **Recent renewal turbulence** — account just signed after a difficult renewal; don't push expansion within 60 days. Wait for the relationship to stabilize.

## Cost

| Component | Cost |
|---|---|
| Usage data pull | Free (your data) |
| Per-account scoring | Free (local math) |
| External signal cross-reference | ~$0.05 per account (only on tier-A accounts) |
| 3-option proposal generation | ~$0.10 per A/B account |
| Report generation | ~$0.05 |
| **Per monthly scan, 200-customer base** | **~$5-15** |

## Tools Required

- Read access to usage data
- Customer base data
- Feature catalog config
- LLM for proposal generation
- Optional: `company-funding-search` (existing) for external signals
- Optional: cross-reference with `usage-drop-csm-trigger` (Wave 2) for retention-vs-expansion routing

## Trigger Phrases

- "Run the expansion scan"
- "Which accounts are ready to expand?"
- "Find accounts at 80%+ capacity"
- "Build the expansion queue for {AM}"
