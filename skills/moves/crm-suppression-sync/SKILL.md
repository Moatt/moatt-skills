---
name: crm-suppression-sync
description: >
  Sync CRM-level suppression rules to every active outbound sequencing
  tool (Smartlead, Instantly, Outreach, Salesloft, HeyReach) so deals
  in active pipeline, customers, recently churned accounts, competitor
  employees, and unsubscribed contacts are automatically removed from
  cold sequences in real time. The single most important hygiene
  control for a multi-tool outbound stack.
tags: [outreach]
---

# CRM Suppression Sync

The most expensive bug in modern outbound is the rep who emails an existing customer because the suppression list lives in the CRM but the sequencing tool doesn't know. By the time the CSM finds out, the customer is annoyed and the brand has paid trust. This skill keeps every sequencing tool in lockstep with the CRM-level suppression rules, automatically.

**Built for:** Sales/RevOps teams running 2+ outbound tools (typical: Smartlead for email + HeyReach for LinkedIn) plus a CRM, where suppression rules need to be the same everywhere all the time.

## When to Use

- "Sync CRM suppressions to outbound tools"
- "Run the suppression sync"
- "Audit which contacts are in active sequences but should be suppressed"
- "Set up the suppression mirror"

## What gets suppressed

### Tier 1 — Hard suppression (always remove from all sequences immediately)
- **Unsubscribed** — explicit opt-out
- **Existing customer** — domain matches active customer base
- **Active opportunity (any rep)** — currently in pipeline
- **Closed-won < 12 months** — recent customer
- **Competitor employee** — domain on competitor list
- **Sanctioned entity** — OFAC/EU/UK lists
- **Disposable / fake email** — guerrillamail, etc.

### Tier 2 — Conditional suppression
- **Closed-lost in last 90 days** — too soon for re-engage; suppress unless explicitly placed in `boomerang-90day-reengage` workflow
- **Customer at-risk** — suppress aggressively to avoid worsening churn
- **Personal-email B2B prospect** — soft suppress; flag for manual review

### Tier 3 — Audit-only (don't auto-remove, flag for review)
- **Multiple sequences enrolled simultaneously** — sequence overlap, signals coordination problem

## Inputs

Required:
- **CRM access (read)** — HubSpot, Salesforce, or equivalent
- **Outbound tool access (read + write)** — Smartlead, Instantly, Outreach, Salesloft, HeyReach. Each tool needs its own API key + the sync target's account/campaign IDs.

Configuration:
- **Suppression rules** — the categories above, with which tier each gets
- **Sync cadence** — `realtime` (webhook-driven) / `hourly` / `daily`. Realtime is best for high-volume outbound.
- **Notification webhook** — Slack channel for sync alerts

## Workflow

### Step 1 — Build the master suppression list (in CRM)

The CRM is the source of truth. The skill expects (or sets up):

- A "Suppression" custom property per contact, with values: `none | unsubscribed | customer | active_opp | recently_won | competitor | sanctioned | disposable | other`
- Webhooks (or scheduled triggers) firing when suppression status changes

### Step 2 — Mirror to each outbound tool

For each connected outbound tool, the skill maintains a per-tool mirror of the suppression list:

| Tool | API mechanism |
|---|---|
| Smartlead | `/api/v1/leads/blocklist/add` (per-account or per-campaign) |
| Instantly | `/api/v2/blocklists` |
| Outreach | `/api/v2/sequenceStates` to pause + remove + add to `optOuts` |
| Salesloft | `/v2/people` PATCH to `do_not_contact: true` |
| HeyReach | per-campaign blocklist API |

For each contact in the master suppression list:
- If the contact's email/identifier exists in the tool: ensure it's suppressed there
- If the contact's email/identifier is in an active sequence: pause + remove the contact from the sequence
- If the contact's email/identifier doesn't yet exist: add to the tool's blocklist preemptively (so future imports auto-suppress)

### Step 3 — Bidirectional unsubscribes

Unsubscribes happen in the outbound tool — a recipient clicks "unsubscribe" in an email. The skill propagates the unsubscribe back to:
- The CRM (mark contact as `unsubscribed`)
- All other outbound tools (so the contact is suppressed everywhere, not just the tool they unsubscribed from)
- Any future tools added to the stack

This bidirectional flow is what most teams miss; one-way suppression breaks the moment unsubscribes arrive in the tool but never reach the CRM.

### Step 4 — Audit unauthorized enrollments

Each cycle, the skill checks for "should be suppressed but isn't":
- Pull every contact currently in any active sequence across all tools
- Cross-reference each against the CRM suppression list
- Flag any contact in an active sequence who should be suppressed
- Auto-remove (with audit log) and notify the responsible rep + RevOps

### Step 5 — Conflict resolution

When the same contact appears in multiple tools with different states:

- **Tool A says active, Tool B says blocked**: trust the more conservative state (blocked wins)
- **CRM says suppressed, tool says active**: CRM wins; remove from sequence
- **Tool says unsubscribed, CRM says active**: tool wins; mark CRM as unsubscribed too

The general rule: suppression always wins. Better to fail safe.

### Step 6 — Output

Each sync run produces:

```markdown
## CRM Suppression Sync — {date} {time}

**Source CRM:** {tool name}
**Synced tools:** {list}

### Activity since last sync
- Suppression list size in CRM: {N} (was {N_prior})
- New suppressions detected: {N}
- New unsubscribes propagated: {N}
- Removals from active sequences: {N}
- Conflicts resolved: {N}
- Tier-3 audit-only flags: {N}

### Removals from active sequences (must-fix)

| Tool | Contact | Reason for suppression | Sequence/campaign | Stage in sequence |
|---|---|---|---|---|
| Smartlead | jane@acme.com | Acme is active customer | "Q1 Outbound v3" | Step 4 of 7 |
| HeyReach | john@beta.io | Beta has open opp owned by {AE} | "Tier 1 Sept" | Connection requested |

### Critical alerts
{alerts about systemic issues — e.g., "150 contacts at active customers were in sequences this week — RevOps + CSM need to review the import process"}

### Sync run state
- Duration: {ms}
- API quota used: {tool: pct}
- Next sync at: {time}

### Output files
- `sync-log-{timestamp}.json` — full transaction log
- `removals-{timestamp}.csv` — for audit
- `unsubscribe-propagations-{timestamp}.csv`
```

### Step 7 — Alerts

Critical conditions that fire immediate Slack alerts (not waiting for the next report):

- **>50 active-customer contacts found in cold sequences** — systemic import issue
- **Same contact in 3+ tools with conflicting status** — coordination breakdown
- **Sync failure** (tool API down, auth expired, rate limit) — handoff to RevOps
- **Unsubscribe propagation failed** for any contact — compliance risk

## Setup Checklist

First-time setup is 80% of the value:

```markdown
## Setup checklist

### CRM side
- [ ] Add "Suppression" custom property to contacts (single-select, with the 8 values listed above)
- [ ] Create workflow rules to auto-set suppression based on:
  - Account status changes to "Customer" → suppress all contacts at the account
  - Closed-Won deal → suppress all contacts at the account
  - Closed-Lost < 90 days → suppress all contacts (unless boomerang flag set)
  - Contact unsubscribes via marketing → suppress contact
- [ ] Set up webhook on contact suppression-property changes (real-time path)

### Outbound tool side (per tool)
- [ ] Generate API key with read+write access to leads + sequences
- [ ] Identify which sequences/campaigns this skill should manage (don't manage exec-led 1:1 sequences)
- [ ] Configure tool's existing blocklist to merge with the CRM-driven list (don't drop existing manual entries)

### Sync engine
- [ ] Choose cadence (realtime / hourly / daily)
- [ ] Wire Slack webhook for alerts
- [ ] Run first sync in audit-only mode to surface existing violations
- [ ] After audit-only review, switch to enforce mode
- [ ] Set up rotation review of audit logs (weekly)
```

## Edge Cases

- **Contact at multiple companies** — common (consultants, advisors). Suppression is by email, not by company. Don't extrapolate suppression across email addresses unless explicit.
- **Email alias / catch-all** — `info@`, `sales@`, `team@`. These aren't typically suppressed at the contact level; they're suppressed at the domain level. Maintain a separate domain-level suppression.
- **Recent customer churned** — they go from `customer` to `recently_won` (within 12 months) suppression, eventually back to suppression-cleared after 12 months. The skill maintains the time-decay logic.
- **Subsidiaries / domain aliases** — if `acme.com` is a customer, `acme-uk.com` and `acme-data.com` may also need suppression. Maintain a domain-alias list.
- **Tool reset / account migration** — when migrating from one outbound tool to another, the suppression list must transfer. Build the export of the master suppression list as a first step.

## Cost

| Component | Cost |
|---|---|
| CRM API calls | API-dependent (HubSpot ~free, Salesforce $$ at high volume) |
| Per-tool sync API calls | API-dependent (most outbound tools include in plan) |
| Diff logic per cycle | Free (local) |
| Alerting (Slack/CRM annotations) | Free |
| **Operational overhead, 10K-contact CRM, hourly sync** | **~$0 — bound by API quotas, not LLM** |

The skill is essentially free to operate. The cost it saves (one bad-customer-email that could have been a churn signal) far exceeds any operational cost.

## Tools Required

- CRM read access
- Each outbound tool's API access (read + write to leads + sequences + blocklist)
- Optional: webhook infrastructure for realtime sync
- Optional: Slack webhook for alerts

## Trigger Phrases

- "Sync CRM suppressions to outbound tools"
- "Run the suppression sync"
- "Audit who's in cold sequences but should be suppressed"
- "Set up the suppression mirror"
