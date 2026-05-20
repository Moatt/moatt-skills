---
name: cold-email-outreach
description: >
  Full-cycle cold email orchestration. Covers goal alignment, lead ingestion
  from any source (CSV, paste, CRM export, database), sequence design, email
  generation, campaign setup, and launch. Sends through the user's connected
  outbound mailbox by default (auto-wired when they connected Gmail/Outlook
  in chat); falls back to a plain CSV export when the user wants to run the
  campaign in a tool they own.
tags: [outreach]
---

# Cold Email Outreach

The last mile of the outbound pipeline. Takes leads wherever the user keeps
them, builds email sequences, and launches the campaign from the user's
connected sending mailbox.

## When to Use

- User says "launch a campaign", "send outreach", "email these leads", "set up cold email"
- User has a lead list and wants to run an outbound campaign

## Two delivery modes

| Mode | Trigger | How it works |
|------|---------|--------------|
| **Send through Moatt** (default) | `ensureOutboundReady` returns ≥ 1 available mailbox | Full automation through the Moatt proxy — create campaign, add sequence, import leads, attach the user's default mailbox, schedule, launch. The user never thinks about the underlying provider. |
| **CSV export** | User asks for a CSV, OR has no connected mailbox AND prefers not to connect one | Generate a generic CSV (`email, first_name, last_name, company, title, subject, body` per touch) the user can import into any external tool. |

## Prerequisites

Before invoking any sending step, the calling agent MUST have called
`ensureOutboundReady`. That chat tool wires the user's connected
Gmail/Outlook to outbound. Outcomes:

- `available[]` has ≥ 1 entry → use **Send through Moatt**.
- `available[]` empty AND `attached[]` empty → ask the user to "connect your
  gmail" (existing chat connect flow handles OAuth), or offer **CSV export**.

Every API call this skill makes goes through the Moatt proxy:

```
<METHOD> $MOATT_API_BASE/v1/proxy/smartlead/<path>
Authorization: Bearer $MOATT_API_KEY
```

Both env vars are auto-injected into every agent Box. The proxy handles auth,
sub-account scoping, and credit metering server-side — the skill never sees
upstream credentials. Rate limit: 10 req / 2s.

**User-facing language:** Never mention the underlying provider name
(Smartlead, Instantly, etc.), "sub-account", "client_id", "SMTP", "IMAP", or
"App Password". The connected Gmail/Outlook is the sending mailbox — that's
all the user needs to know.

## Phase 0: Intake

Send all questions at once. Group by category. Skip any already answered.

### Campaign Goal
1. What's the objective? (book meetings, drive demo requests, get replies, nurture)
2. What's the outreach angle or hook? (hiring signal, competitor displacement, event-based, pain-based, cold database)
3. What should this campaign be called?

### Delivery mode
4. By default, the campaign will send from your connected mailbox (`<defaultEmail>` from `ensureOutboundReady`). If you'd rather export to a CSV and run it in your own tool, say so. Otherwise, we proceed with the connected mailbox.

### Lead Source
5. Where are your leads? Accept any of:
   - **CSV file** — read the file, map columns to the required fields
   - **Pasted list** — names, emails, companies dropped directly into chat
   - **CRM export** — Salesforce, HubSpot, or any other CRM dump
   - **Database query** — if the user has a database, help them query it
   - **Upstream output** — data from a prior task in this conversation
6. Any exclusions? (specific companies, recently contacted leads, certain titles)
7. Max campaign size? (default: 200)

**Minimum required per lead:** email address. Nice-to-have: first_name, last_name, company, title.

### Sequence Design
8. How many touches? (default: 3)
9. Timing between touches? (default: Day 1 / Day 5 / Day 12)
10. Personalization tier? (Tier 1: merge fields only / Tier 2: segment-specific / Tier 3: unique per lead)

### Sending Config (skip if CSV export)
11. Which email accounts should send? (list accounts or "use all available")
12. Sending schedule? (default: Mon-Fri 8am-5pm in recipient's timezone)
13. Daily send limit per account? (default: 30/day)
14. Track opens and clicks? (default: opens yes, clicks no)

## Phase 1: Lead Ingestion

### Parse Leads

Accept leads from whichever source the user provides:

- **CSV file:** Read the file. Match columns flexibly:
  - `email` (required) — also matches `Email`, `email_address`
  - `first_name` — also matches `firstname`, `first`, `First Name`
  - `last_name` — also matches `lastname`, `last`, `Last Name`
  - `company_name` — also matches `company`, `organization`, `Company`
  - Any extra columns get rolled in as custom fields
- **Pasted data:** Parse whatever format the user provides. Pull out emails, names, companies.
- **CRM/Database:** Help the user query or export, then parse the result.

### Validate & Deduplicate

- Drop rows without a valid email
- Deduplicate by email (keep the first occurrence)
- Report: total rows, valid, invalid, duplicates removed

### Present & Confirm

Show a sample table (10-15 leads) with:
- Name, Title, Company, Email

Tell the user: total eligible leads, how many were invalid/removed.

Ask the user to confirm or adjust before proceeding.

## Phase 2: Sequence Design

Present the sequence plan as a table before writing any copy:

| Touch | Day | Email Type | Framework | CTA |
|-------|-----|-----------|-----------|-----|
| 1 | 1 | Cold intro | Signal-Proof-Ask | 15-min call |
| 2 | 5 | New angle / asset | PAS | Resource offer |
| 3 | 12 | Social proof | BAB | Open to chat? |

Get the user's sign-off on the structure before generating copy in Phase 3.

## Phase 3: Email Generation

Write the email copy directly using these guidelines.

### Email Structure Formula

Every cold email follows this skeleton:

```
Hook (1 sentence) → Evidence (1-2 sentences) → Offer (1 sentence)
```

**Word count targets:**
- Cold intro (Touch 1): 50-90 words
- Follow-up (Touch 2-3): 30-50 words
- Breakup (final touch): 20-40 words

### By Personalization Tier

**Tier 1 (Generic):** One template per touch with merge fields (`{first_name}`, `{company}`, `{title}`). Identical template for every lead.

**Tier 2 (Segment):** One template per segment per touch. Segments are defined by role, industry, or signal type. Swap pain points and proof points between segments.

**Tier 3 (Deep):** Unique email per lead per touch. Cap at 50 leads — recommend Tier 2 above that volume.

### Hard Rules

1. **No filler openers.** Never "I hope this finds you well"
2. **No "just checking in" follow-ups.** Every touch adds a new reason to reply
3. **Under 150 words per email.** Most should land at 80-120.
4. **One CTA per email.** Always low-friction.
5. **No selling in the first sentence.** Lead with them, not you.
6. **Subject lines under 50 chars.** No caps, no exclamation marks, no emoji.
7. **Sign off with name only.** No "Best regards."

### Review Loop

1. Generate sample emails for 3-5 leads first
2. Present to the user for review
3. Iterate until approved (max 3 rounds)
4. Generate the remaining emails after approval

## Phase 4: Campaign Setup

### If Smartlead (MCP Automation)

Full automation through MCP tools. Execute in this order:

**Step 1: Find and allocate mailboxes**

```
mcp__smartlead__get_email_accounts
```

Returns every email account with `id`, `from_email`, `from_name`, `daily_sent_count`, `is_smtp_success`, `is_imap_success`.

To find **free mailboxes** (not already assigned to active campaigns):

1. Fetch all campaigns: `mcp__smartlead__get_campaigns`
2. For each campaign with status `ACTIVE` or `STARTED`, fetch its email accounts: `mcp__smartlead__get_campaign_email_accounts`
3. Build a set of all `email_account_id` values currently assigned to active campaigns
4. A mailbox is "free" if its `id` is NOT in the active set AND `is_smtp_success` = true AND `is_imap_success` = true
5. Sort free mailboxes by `daily_sent_count` ascending (prefer the least-used)
6. Select the requested number of free mailboxes

If there are fewer free mailboxes than requested, tell the user and ask how to proceed.

Present available/selected accounts to the user for confirmation.

**Step 2: Create campaign**

```
mcp__smartlead__create_campaign
  name: {campaign_name}
```

Save the returned `campaign_id`.

**Step 3: Add sequence steps**

```
mcp__smartlead__save_campaign_sequences
  campaign_id: {campaign_id}
  sequences: [
    { seq_number: 1, subject: "...", email_body: "...", seq_delay_details: { delay_in_days: 0 } },
    { seq_number: 2, subject: "...", email_body: "...", seq_delay_details: { delay_in_days: 4 } },
    { seq_number: 3, subject: "...", email_body: "...", seq_delay_details: { delay_in_days: 7 } }
  ]
```

**Merge variable mapping:** Convert `{first_name}` → `{{first_name}}`, `{company}` → `{{company}}` (Smartlead uses double-brace syntax).

**Note:** Blank `subject` on emails 2+ causes them to send as replies in the same thread.

**Step 4: Import leads (batch 100)**

```
mcp__smartlead__add_leads_to_campaign
  campaign_id: {campaign_id}
  lead_list: [{ email: "...", first_name: "...", last_name: "...", company_name: "...", ... }]
```

Smartlead accepts a max of 100 leads per call. Chunk the list and call once per batch. Extra columns become `custom_fields`.

**Step 5: Assign sending accounts**

```
mcp__smartlead__add_email_accounts_to_campaign
  campaign_id: {campaign_id}
  email_account_ids: [...]
```

**Step 6: Set schedule**

```
mcp__smartlead__update_campaign_schedule
  campaign_id: {campaign_id}
  schedule: {
    timezone: "America/New_York",
    days_of_the_week: [1, 2, 3, 4, 5],
    start_hour: "08:00",
    end_hour: "18:00",
    min_time_btw_emails: 10,
    max_new_leads_per_day: 20
  }
```

`days_of_the_week`: 0=Sunday, 1=Monday, ..., 6=Saturday.

**Step 7: Configure settings**

```
mcp__smartlead__update_campaign_settings
  campaign_id: {campaign_id}
  settings: {
    track_settings: [],
    stop_lead_settings: "REPLY_TO_AN_EMAIL",
    send_as_plain_text: false,
    follow_up_percentage: 100
  }
```

Allowed `track_settings`: `DONT_TRACK_EMAIL_OPEN`, `DONT_TRACK_LINK_CLICK`, `DONT_TRACK_REPLY_TO_AN_EMAIL`
Allowed `stop_lead_settings`: `REPLY_TO_AN_EMAIL`, `CLICK_ON_A_LINK`, `OPEN_AN_EMAIL`

### If CSV-Based Tool (Instantly, Lemlist, Apollo, Other)

**Step 1: Generate CSV**

Columns depend on the personalization tier:

**Tier 1 (same template for all):**
- CSV columns: `email`, `first_name`, `last_name`, `company`, `title`, `custom_field_1` (signal/hook)
- Separate file with sequence templates (subjects + bodies with merge fields)

**Tier 2/3 (per-segment or per-lead emails):**
- CSV columns: `email`, `first_name`, `last_name`, `company`, `title`, `touch_1_subject`, `touch_1_body`, `touch_2_subject`, `touch_2_body`, `touch_3_subject`, `touch_3_body`

**Step 2: Save file**

Save to the current working directory:
```
{campaign-name}-{YYYY-MM-DD}.csv
```

**Step 3: Provide tool-specific import instructions**

**Instantly:**
- Upload CSV → Sequences → Create new sequence
- Map columns: Email → email, First Name → first_name, etc.
- Paste sequence templates into each step
- Set delays between steps

**Lemlist:**
- People → Import → Upload CSV
- Map custom variables to columns
- Create campaign → add email steps → insert variables

**Apollo:**
- Sequences → Create Sequence → add email steps
- Contacts → Import → Upload CSV
- Add imported contacts to the sequence

**Other / Manual:**
- Hand over the CSV path and walk through the column structure
- Ask the user what format their tool expects and adjust as needed

## Phase 5: Review & Launch

Present the campaign summary:

```
Campaign: {name}
Leads: {count}
Sequence: {touches} touches over {days} days
Sending: {accounts} accounts × {daily_limit}/day = {daily_volume} emails/day
Estimated completion: {date}
Tool: {smartlead/instantly/etc.}
```

### Hard Approval Gate

**Do NOT activate the campaign without explicit user confirmation.** Present the summary, then ask: "Ready to launch? Type 'yes' to activate."

- **Smartlead:** `mcp__smartlead__update_campaign_status` → set status to `START`
- **CSV tools:** Tell the user the file is ready for import and provide the file path

## Smartlead API Reference

Every endpoint sits at base URL `$MOATT_API_BASE/v1/proxy/smartlead` with `?api_key=` query param.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/campaigns/create` | POST | Create a new campaign |
| `/campaigns` | GET | List all campaigns |
| `/campaigns/{id}` | GET | Get a campaign by ID |
| `/campaigns/{id}/schedule` | POST | Set the campaign schedule |
| `/campaigns/{id}/settings` | POST | Update tracking/stop settings |
| `/campaigns/{id}/sequences` | POST | Save email sequences |
| `/campaigns/{id}/leads` | POST | Add leads (max 100 per call) |
| `/campaigns/{id}/email-accounts` | GET | List mailboxes on a campaign |
| `/campaigns/{id}/email-accounts` | POST | Assign mailboxes to a campaign |
| `/campaigns/{id}/status` | POST | Change campaign status (START/PAUSED/STOPPED) |
| `/campaigns/{id}/analytics` | GET | Top-level campaign analytics |
| `/email-accounts/` | GET | List all email accounts (offset/limit) |

## Cost

| Component | Cost |
|-----------|------|
| Smartlead campaign setup | Free (API is included with the Smartlead plan) |
| CSV export | Free |
| Email copy generation | Free (LLM reasoning) |

## Error Handling

| Error | Fix |
|-------|-----|
| Proxy returns `412 vendor_not_connected` or empty mailbox list | Tell the user "connect your gmail" and stop until they do |
| Smartlead rate limit (429) | Wait 2 seconds and retry |
| Lead upload fails | Check the email format, retry the batch |
| No free mailboxes | Show all accounts and ask the user which to use |
| Campaign creation fails | Check the API key is valid |
