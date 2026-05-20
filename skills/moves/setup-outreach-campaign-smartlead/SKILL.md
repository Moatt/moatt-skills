---
name: setup-outreach-campaign-smartlead
description: >
  Spin up a complete outbound email campaign inside Smartlead. Walks the user
  through campaign goal, audience, messaging, schedule, and mailbox allocation.
  Creates the campaign, adds the leads, saves the email sequence, sets the
  schedule, and assigns available mailboxes. Use when a user wants to launch
  email outreach via Smartlead.
tags: [outreach]

graph:
  provides:
    - smartlead-campaign
    - email-sequence
  requires:
    - lead-list
  connects_to:
    - skill: company-contact-finder
      when: "User doesn't have a lead list and needs to find contacts first"
      passes: nothing (upstream source)
    - skill: contact-cache
      when: "Before adding leads, deduplicate against already-contacted leads"
      passes: lead-list (emails)
    - skill: luma-event-attendees
      when: "User wants event attendees as the lead source"
      passes: person-list
    - skill: conference-speaker-scraper
      when: "User wants conference speakers as the lead source"
      passes: person-list
  capabilities: [smartlead-api]
---

# setup-outreach-campaign-smartlead

Stand up a complete outbound email campaign in Smartlead: create the campaign, add the leads, write a 2-3 email sequence, set the schedule, and allocate the mailboxes.

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| campaign_name | Yes | -- | Name for the campaign (e.g., "Truewind - Accounting Firms - Feb 2026") |
| campaign_goal | Yes | -- | The outcome the campaign drives (book demos, drive signups, etc.) |
| lead_list | Yes | -- | CSV file path OR person-list JSON from an upstream skill |
| value_proposition | Yes | -- | The pain point or benefit the emails address |
| cta | Yes | -- | Call to action (e.g., "Book a 15-min demo", "Reply to learn more") |
| tone | No | semi-formal | Email tone: casual, semi-formal, formal |
| personalization_angle | No | -- | Personalization hook (event attendance, job posting, news mention) |
| timezone | No | America/New_York | Timezone for the send schedule |
| send_days | No | [1,2,3,4,5] | Days of the week to send (0=Sun, 6=Sat) |
| start_hour | No | 08:00 | Start of the send window |
| end_hour | No | 18:00 | End of the send window |
| max_leads_per_day | No | 20 | Max new leads contacted per day |
| min_time_btw_emails | No | 10 | Minutes between emails from the same mailbox |
| num_mailboxes | No | 5 | Number of mailboxes to allocate |
| mailbox_selection | No | auto | "auto" (pick free ones) or "manual" (show list to user) |

## Setup

**No setup, no env vars.** Outbound runs through the Moatt proxy. The user's
connected Gmail/Outlook (attached via chat in the existing connect flow) is
already wired as the sending mailbox — the agent must call
`ensureOutboundReady` before invoking this skill and surface the
`defaultEmail` if needed.

Every API call shape:
```
<METHOD> $MOATT_API_BASE/v1/proxy/smartlead/<path>
Authorization: Bearer $MOATT_API_KEY
Content-Type: application/json
```

Both env vars are auto-injected into every agent Box. The proxy handles
authentication, sub-account scoping, and credit metering server-side — the
skill never sees the underlying credentials. If the user has not connected a
mailbox yet, `ensureOutboundReady` returns empty and the agent should say
"connect your gmail" rather than running this skill.

Rate limit (enforced upstream): 10 requests per 2 seconds.

**User-facing language:** Never mention "Smartlead", "sub-account", "client
id", "SMTP", "IMAP", or "App Password" to the user. Their connected Gmail is
the sending mailbox, that's all they need to know.

## Procedure

### Step 1: Gather Campaign Info

Walk the user through the prompts below. Cluster them conversationally — don't dump every question at once.

**Campaign identity:**
- "What is the name for this campaign?" (e.g., "Truewind - Accounting Firms - Feb 2026")
- "What is the goal?" (e.g., book demos, drive trial signups, conference follow-up)

**Audience & leads:**
- "Who is the target audience?" (ICP: title, company type, size, industry)
- "How are you providing the lead list?" — options: CSV file, output from a prior skill (company-contact-finder, luma-event-attendees), or "I need to find leads first" (chain to company-contact-finder)

**Messaging:**
- "What is the core value proposition or pain point?"
- "What is the call to action?" (e.g., "Book a 15-min demo")
- "What tone — casual, semi-formal, or formal?"
- "Any personalization angle?" (e.g., reference a job posting, event, industry news)

**Schedule:**
- "What days should emails be sent?" (default: Mon-Fri)
- "What hours and timezone?" (default: 8am-6pm ET)
- "Max new leads per day?" (default: 20)
- "When should the campaign start?" (default: tomorrow)

**Mailboxes:**
- "How many mailboxes to allocate?" (default: 5)
- "Auto-select free mailboxes, or show me a list to choose from?"

After gathering answers, recap the plan and confirm before proceeding.

### Step 2: Create the Campaign

```
POST $MOATT_API_BASE/v1/proxy/smartlead/campaigns/create

Body:
{
  "name": "<campaign_name>",
  "client_id": null
}
```

**Response:**
```json
{
  "ok": true,
  "id": 3023,
  "name": "Test email campaign",
  "created_at": "2022-11-07T16:23:24.025929+00:00"
}
```

Capture `campaign_id` from `id`. Every subsequent call uses it.

### Step 3: Assign the User's Connected Mailbox

The user's connected Gmail/Outlook is already wired by `ensureOutboundReady`.
By default, use the `defaultEmail` from that call's `available[]` list — that
mailbox is healthy and ready to send.

**Sourcing the mailbox id:**
- Call `listOutboundMailboxes` (the chat tool, NOT a Smartlead endpoint) to get
  the available mailboxes for this project — each row contains
  `smartleadMailboxId` and `email`.
- Pick the one flagged `isDefault: true` unless the user has explicitly named
  a different one in the conversation.

If `listOutboundMailboxes` returns zero rows: stop and tell the user "I don't
see a connected sending email — connect your gmail and we'll resume." Do not
proceed.

**Assign the mailbox to the campaign:**

```
POST $MOATT_API_BASE/v1/proxy/smartlead/campaigns/{campaign_id}/email-accounts
Authorization: Bearer $MOATT_API_KEY

Body:
{
  "email_account_ids": [<smartleadMailboxId from the default row>]
}
```

For most users with one connected mailbox, this is a single-element array.
Multi-mailbox sending is opt-in (user asks "use both my gmails"); in that
case pass every `smartleadMailboxId` they confirm.

### Step 4: Ingest Leads

#### 4a: Parse the lead list

**From CSV:** read the file, map columns to Smartlead fields. Flexible column matching:
- `email` (required) — also matches `Email`, `email_address`
- `first_name` — also matches `firstname`, `first`, `First Name`
- `last_name` — also matches `lastname`, `last`, `Last Name`
- `company_name` — also matches `company`, `organization`, `Company`
- Any extra columns become `custom_fields`

**From an upstream skill (person-list JSON):** map fields:
```
first_name  <- name.split()[0]
last_name   <- name.split()[1:]
email       <- email
company_name <- company
custom_fields <- { "title": title, "linkedin_url": linkedin_url }
```

#### 4b: Validate and deduplicate

- Drop rows without a valid email
- Deduplicate by email (keep the first occurrence)
- Report: total rows, valid, invalid, duplicates removed

#### 4c: Upload in batches

Smartlead accepts a maximum of 100 leads per call. Chunk the list and call once per batch:

```
POST $MOATT_API_BASE/v1/proxy/smartlead/campaigns/{campaign_id}/leads

Body:
{
  "lead_list": [
    {
      "first_name": "Jane",
      "last_name": "Smith",
      "email": "jane@example.com",
      "company_name": "Acme Corp",
      "custom_fields": {"title": "CFO"}
    }
  ],
  "settings": {
    "ignore_global_block_list": false,
    "ignore_unsubscribe_list": false,
    "ignore_duplicate_leads_in_other_campaign": false
  }
}
```

**Response:**
```json
{
  "ok": true,
  "upload_count": 95,
  "total_leads": 100,
  "already_added_to_campaign": 2,
  "duplicate_count": 1,
  "invalid_email_count": 2,
  "unsubscribed_leads": 0
}
```

Sum the totals across every batch and report them.

### Step 5: Craft the Email Sequence

Compose a 2-3 email sequence built from the user's Step 1 inputs. Default structure:

**Email 1 — Cold intro (Day 0)**
- Subject: short, curiosity-driven or pain-relevant
- Body: 3-5 sentences. Acknowledge their world, surface the problem, introduce the solution briefly, clear CTA
- Personalize with `{{first_name}}` and any custom fields

**Email 2 — Follow-up (Day 3)**
- Subject: a different angle (metric, case study, specific outcome)
- Body: 2-4 sentences. Add value, restate the CTA
- Leave the subject blank to send as a same-thread reply

**Email 3 — Breakup (Day 8)**
- Subject: brief, direct ("Still relevant?", "Closing the loop")
- Body: 2-3 sentences. Acknowledge they're busy, keep the door open, soft CTA

Show the full sequence to the user as a formatted table. Wait for approval or edits.

After the user approves, save:

```
POST $MOATT_API_BASE/v1/proxy/smartlead/campaigns/{campaign_id}/sequences

Body:
{
  "sequences": [
    {
      "seq_number": 1,
      "seq_delay_details": { "delay_in_days": 0 },
      "seq_variants": [
        {
          "subject": "Subject line here",
          "email_body": "<p>Email body as HTML</p>",
          "variant_label": "A"
        }
      ]
    },
    {
      "seq_number": 2,
      "seq_delay_details": { "delay_in_days": 3 },
      "seq_variants": [
        {
          "subject": "",
          "email_body": "<p>Follow-up body</p>",
          "variant_label": "A"
        }
      ]
    },
    {
      "seq_number": 3,
      "seq_delay_details": { "delay_in_days": 5 },
      "seq_variants": [
        {
          "subject": "",
          "email_body": "<p>Breakup body</p>",
          "variant_label": "A"
        }
      ]
    }
  ]
}
```

Note: an empty `subject` on emails 2+ causes them to send as replies inside the same thread.

### Step 6: Set the Schedule

```
POST $MOATT_API_BASE/v1/proxy/smartlead/campaigns/{campaign_id}/schedule

Body:
{
  "timezone": "America/New_York",
  "days_of_the_week": [1, 2, 3, 4, 5],
  "start_hour": "08:00",
  "end_hour": "18:00",
  "min_time_btw_emails": 10,
  "max_new_leads_per_day": 20,
  "schedule_start_time": "2026-02-25T00:00:00.000Z"
}
```

`days_of_the_week`: 0=Sunday, 1=Monday, ..., 6=Saturday.

### Step 7: Confirm and Optionally Start

Present a full summary:

```
Campaign: "Truewind - Accounting Firms - Feb 2026"
Campaign ID: 12345
Leads added: 87 (3 rejected as duplicates)
Email sequence: 3 emails (Day 0, Day 3, Day 8)
Schedule: Mon-Fri, 8am-6pm ET, starting Feb 25
Mailboxes: jane@truewind.ai, alex@truewind.ai (+3 more)
Status: DRAFTED
```

Ask: "Do you want to START the campaign now, or leave it as a draft?"

If start:
```
POST $MOATT_API_BASE/v1/proxy/smartlead/campaigns/{campaign_id}/status

Body:
{ "status": "START" }
```

If draft: skip. The user can launch it from the Smartlead UI later.

## Optional: Update Campaign Settings

If the user wants to configure tracking or stop conditions, use:

```
POST $MOATT_API_BASE/v1/proxy/smartlead/campaigns/{campaign_id}/settings

Body:
{
  "track_settings": ["DONT_TRACK_EMAIL_OPEN"],
  "stop_lead_settings": "REPLY_TO_AN_EMAIL",
  "send_as_plain_text": false,
  "follow_up_percentage": 100,
  "enable_ai_esp_matching": true
}
```

Allowed `track_settings`: `DONT_TRACK_EMAIL_OPEN`, `DONT_TRACK_LINK_CLICK`, `DONT_TRACK_REPLY_TO_AN_EMAIL`
Allowed `stop_lead_settings`: `REPLY_TO_AN_EMAIL`, `CLICK_ON_A_LINK`, `OPEN_AN_EMAIL`

## Proxy API Reference

Every endpoint uses the Moatt proxy: base URL `$MOATT_API_BASE/v1/proxy/smartlead` with `Authorization: Bearer $MOATT_API_KEY`. Sub-account scoping, upstream auth, and credit metering are handled server-side — the skill never sees the underlying credentials.

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

## Example Prompts

- "Set up a Smartlead campaign for Truewind targeting accounting firms"
- "Create an outreach campaign — I have a CSV of leads"
- "Launch a cold email campaign to CFOs at mid-market companies"
- "Set up a 3-email sequence in Smartlead and allocate 5 free mailboxes"

## Metadata

```yaml
metadata:
  requires:
    chat_tool: ["ensureOutboundReady", "listOutboundMailboxes"]
  cost: "Per-action credits via the Moatt proxy. User pays nothing extra to the upstream provider."
```
