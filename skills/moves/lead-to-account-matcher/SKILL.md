---
name: lead-to-account-matcher
description: >
  Match incoming leads to existing CRM accounts using email domain,
  company name fuzzy match, and IP-resolution data. Prevents the
  "duplicate lead routed to a new SDR while an AE owns the parent
  account" problem and surfaces lead-to-existing-customer matches
  for CSM routing. Outputs each lead with a match verdict, the
  matched account ID (if any), and a recommended routing action.
tags: [lead-generation]
---

# Lead-to-Account Matcher

The most common, most expensive lead-routing bug is treating a new lead as a fresh prospect when their company is already in your CRM as an active opportunity, current customer, or churned account. This skill checks every incoming lead against your account database and routes accordingly — preventing collisions, surfacing expansion plays, and avoiding the embarrassment of an SDR cold-emailing the brother of someone the AE is closing on.

**Built for:** RevOps teams that have outgrown the "spreadsheet of accounts" routing model and need automated lead-to-account match before SDR assignment.

## When to Use

- "Run lead-to-account match on the inbound batch"
- "Check this lead list against our CRM"
- "Route these leads with deduplication"
- "Match new MQLs to existing accounts"

## What this prevents

| Scenario | Cost without matching |
|---|---|
| New lead from Acme — Acme is already a customer | SDR cold-emails a customer; CSM finds out months later |
| New lead from Acme — AE has an open opportunity at Acme (different rep) | Two reps reach out; buyer experience splits |
| New lead from Acme — Acme is in active churn discussions | Rep makes pitch while CSM is firefighting |
| New lead from Acme — Acme closed-lost 3 months ago | Rep treats as fresh prospect; ignores prior context + loss reason |
| New lead from Acme — Acme is a competitor | Rep emails a competitor employee |

## Inputs

Required:
- **Lead list** — CSV with at minimum: `email`, plus any of `first_name`, `last_name`, `company`, `title`
- **Account database access** — CRM (HubSpot, Salesforce) or CSV export with: `account_id`, `company_name`, `domain`, `status` (`prospect | active_opp | customer | churned | competitor | suppressed`), `owning_rep`, `last_activity_date`

Optional but improves match accuracy:
- **Domain → account map** — the most accurate match path
- **Company-name aliases** — known variations, parent-subsidiary mappings
- **IP-to-company resolution data** — Clearbit Reveal, Warmly, or similar
- **Outreach suppression list** — for matching the "suppressed" status

## Match Algorithm

The matcher runs three passes per lead, in order. First match wins.

### Pass 1: Domain match (highest precision)

1. Extract the domain from `email` (e.g., `jane@acme.com` → `acme.com`)
2. Skip if the domain is a personal-email provider (gmail.com, yahoo.com, outlook.com, hotmail.com, icloud.com, etc.) — these don't reliably indicate company affiliation
3. Look up the domain in the account database
4. If found: match. Confidence: high.

### Pass 2: Company name fuzzy match

When the email domain is personal or when no domain match was found:

1. Use the `company` field from the lead
2. Normalize: lowercase, strip suffixes (Inc., LLC, Ltd., Corp., GmbH, etc.), strip "the"
3. Fuzzy-match against normalized account names (Levenshtein distance, token-set ratio)
4. Threshold: 90+ similarity score
5. If multiple matches above threshold, select the highest; flag for human review if scores are within 5 points of each other

### Pass 3: IP-resolution match (when available)

If IP-to-company resolution data is provided per lead:

1. Get the resolved company name from the IP signal
2. Run the company name fuzzy match logic against accounts

This is especially valuable for high-quality form-fill leads where the visitor used a personal email.

## Outputs per Lead

For each lead, the match produces:

```json
{
  "lead_id": "",
  "email": "",
  "match_verdict": "matched | unmatched | ambiguous | personal_email_skip",
  "matched_account_id": "",
  "matched_account_name": "",
  "match_confidence": "high | medium | low",
  "match_pass": "domain | company_name | ip_resolution",
  "account_status": "prospect | active_opp | customer | churned | competitor | suppressed",
  "owning_rep": "",
  "last_activity_date": "",
  "recommended_routing": "<see routing logic below>"
}
```

## Routing logic by match status

The recommended routing depends on the matched account's status:

| Account status | Routing recommendation | Why |
|---|---|---|
| **No match (unmatched)** | Route to standard SDR rotation | Net-new logo |
| **personal_email_skip** | Manual review — likely freelancer/consultant | Not a corporate signal |
| **prospect** (no current activity) | Route to owning rep if assigned, else SDR | Continue prior motion |
| **active_opp** | DO NOT route to SDR. Notify the existing AE. | Prevent collision |
| **customer (active)** | Route to CSM. Suppress from cold sequences. | Expansion path |
| **customer (at-risk / pending churn)** | Route to CSM with flag. Suppress aggressively. | Don't trigger churn |
| **churned (recent <12 months)** | Route to win-back queue, not new sequence | Use loss-reason context |
| **churned (>12 months)** | Treat as prospect; route to AE or SDR | Genuinely re-engageable |
| **competitor** | Suppress entirely | Don't email competitors |
| **suppressed** | Honor the suppression | Compliance |

## Workflow

### Step 1 — Build the account index

On first run (and on a refresh schedule):

1. Pull all accounts from CRM
2. Build the domain → account_id map (one domain can map to one account; flag duplicates for human review)
3. Build the normalized-name → account_id map
4. Cache in Redis or local store; refresh nightly

### Step 2 — Process each lead

Run the three-pass match per lead. Output the full record above.

### Step 3 — Generate summary + action queues

```markdown
## Lead-to-Account Match — {date}

**Leads processed:** {N}
**Matched:** {M} ({pct}%)
**Unmatched (net-new):** {N - M}
**Personal email (manual review):** {K}

### By account status

| Status | Count | Action |
|---|---|---|
| Net-new | {N} | Route to SDR |
| Active opp (other rep) | {N} | Notify AE — DO NOT route |
| Existing customer | {N} | Route to CSM |
| Customer at-risk | {N} | CSM-flag, suppress |
| Recently churned | {N} | Win-back queue |
| Competitor | {N} | Suppress |
| Suppressed | {N} | Honor suppression |

### Critical alerts ({N} items)

#### {Account name} — Lead: {lead name}, {lead email}
- **Status:** Active opp (Stage 4) owned by {AE name}
- **Action:** Notify {AE} immediately. Do not enroll in SDR sequence.
- **CRM link:** {opportunity URL}

#### {Account name} — Lead: {lead name}
- **Status:** Customer (active, $80K ARR)
- **Action:** Route to {CSM name}. Suppress from outbound sequences.
- **CRM link:** {account URL}

(repeats per critical case)

### Output files
- `match-{date}.csv` — all leads with verdicts
- `routing-{date}.csv` — by-route lists, ready for CRM task import
- `alerts-{date}.json` — critical cases for AE/CSM notification
```

### Step 4 — CRM annotation (optional)

If the CRM has write access, the skill can:

- Attach matched leads to the existing account record
- Create a task on the AE/CSM for critical alerts
- Suppress matched leads from any sequence they were enrolled in
- Add a note: "Matched via lead-to-account-matcher on {date}"

This is the highest-value automation; without it, the alerts have to be acted on manually.

## Edge Cases

- **Subsidiary domains** — "marketing.acme.com" or "acme-uk.com" may not match the parent "acme.com". Maintain a domain-alias list per account; the matcher checks aliases.
- **Company name mismatches due to rebrands** — Acme rebranded to Beta; the lead writes "Beta" but the CRM has "Acme". Maintain an aliases list; matcher checks both.
- **Multiple leads from the same company in the same batch** — match each individually but flag the cluster: "5 leads from Acme — likely a buying committee event, not 5 independent leads."
- **Personal-email lead at a company that has a domain account** — the matcher can't infer the connection from email alone. If `company` field is also empty, the lead is unmatched. With `company` populated, the company-name pass can rescue.
- **Disposable / fake emails** — `@guerrillamail.com`, `@10minutemail.com`, etc. Pre-filter and tag as `disposable_email_skip` rather than match.
- **Multinational with multiple CRM records** — Acme USA, Acme EMEA, Acme APAC are separate accounts. The matcher can't infer which one a lead belongs to from email alone. Use territory rules (geography on the lead) to disambiguate.

## Cost

| Component | Cost |
|---|---|
| Account index build (one-time per refresh) | Free (just CRM API calls) |
| Per-lead matching | Free (local fuzzy match) |
| LLM-assisted ambiguous-case resolution | ~$0.001 per ambiguous case |
| Report generation | ~$0.01 per run |
| **Per 1,000-lead batch** | **~$0.50-2** |

## Tools Required

- CRM read access (HubSpot, Salesforce, or CSV)
- Optional: CRM write access for automated suppression / annotation
- Fuzzy-match library (built-in)
- Redis or local cache for the account index
- LLM only for ambiguous-case resolution

## Trigger Phrases

- "Run lead-to-account match"
- "Check leads against the CRM"
- "Route leads with deduplication"
- "Match MQLs to existing accounts"
