---
name: setup-outreach-campaign
description: >
  Spin up a complete outbound email campaign for the user. Walks them through
  campaign goal, audience, messaging, schedule, and mailbox allocation.
  Creates the campaign, adds the leads, saves the email sequence, sets the
  schedule, and assigns the user's connected mailbox. Use when a user wants
  to launch email outreach.
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

# setup-outreach-campaign

Stand up a complete outbound email campaign: create the campaign, add the leads, write a 2-3 email sequence, set the schedule, and allocate the mailboxes.

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
| ab_test | No | no | "yes" or "no" — when yes, emit TWO variants per step with a 50/50 split. Moatt's dispatcher picks one per lead per touch by `variant_distribution` and persists the chosen `variant_label`; the user can later ask "which variant is winning on X?" to see the breakdown. |

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
- "Want to A/B test the messaging?" — only ask when the list is ≥200 leads (below that a 50/50 split won't accumulate enough data per variant to declare a winner). If yes, set `ab_test=yes` and follow the A/B section in Step 5.

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

### Step 3: Identify the User's Sending Mailbox (no Smartlead-side assign)

The actual sends do NOT go through Smartlead's mailer — moatt dispatches
through the user's connected Gmail/Outlook on a cron. So we do NOT call
Smartlead's `/campaigns/{id}/email-accounts` endpoint. Smartlead just holds
the leads + sequence + schedule.

**Sourcing the mailbox:**
- Call `listOutboundMailboxes` (chat tool) — each row has `email`, `provider`,
  `composioConnectionId`, `isDefault`.
- Pick the one flagged `isDefault: true` unless the user named a different
  email in the conversation. Remember this `email` for Step 6.5.

If `listOutboundMailboxes` returns zero rows: stop and tell the user "I don't
see a connected sending email — connect your gmail and we'll resume." Do not
proceed.

> **Why no `/email-accounts` POST?** Smartlead's mailbox-assign endpoint
> expects a Smartlead-side mailbox id. Moatt does not register the user's
> mailbox on the Smartlead side — sends are dispatched server-side via the
> Composio Gmail/Outlook tool. Calling `/email-accounts` here would either
> fail (no Smartlead-side mailbox row) or hand authority to a sender we
> don't control. Skip it.

### Step 4: Ingest Leads

#### 4a: Parse the lead list

**From CSV:** read the file, map columns to the campaign fields. Flexible column matching:
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

Each upload batch supports up to 100 leads. Chunk the list and call once per batch:

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

### A/B testing the messaging (optional)

When `ab_test=yes`, draft TWO distinct variants per step (different hook, different proof, or different CTA framing — not just word-swap) and emit them with a 50/50 split. Moatt's dispatcher picks one per lead per touch using `variant_distribution`, persists the chosen `variant_label` on the send log, and exposes a per-step winner in the campaign-progress card once each variant has ≥10 sends.

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
          "subject": "Hook A — outcome-driven",
          "email_body": "<p>… variant A body …</p>",
          "variant_label": "A",
          "variant_distribution": 50
        },
        {
          "subject": "Hook B — pain-driven",
          "email_body": "<p>… variant B body …</p>",
          "variant_label": "B",
          "variant_distribution": 50
        }
      ]
    }
  ]
}
```

Rules for good variants (apply per step, not just step 1):
- Pick a real strategic split — outcome vs. pain, short vs. specific, contrast vs. social proof. Don't variant on punctuation.
- Variants share the SAME `seq_delay_details`. The dispatcher won't honor different delays per variant inside the same step.
- Variant labels are case-sensitive analytics keys. Reuse "A" / "B" across steps for consistent reporting; use "Demo", "Breakup", etc. only when labeling a specific branch destination later.

When `ab_test=no` (default), emit a single variant per step with `variant_label: "A"` and no `variant_distribution` — the dispatcher treats single-variant steps as a no-op pick.

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

### Step 6.5: Register the Campaign on the Moatt Side

Smartlead now holds the full campaign — leads, sequence, schedule. Hand the
campaign off to moatt's dispatcher by calling the chat tool
`attachCampaignToMailbox` with the exact same schedule you posted in Step 6
(translate snake_case to camelCase):

```
attachCampaignToMailbox({
  smartleadCampaignId: "<campaign_id from Step 2>",
  name: "<campaign_name>",
  mailboxEmail: "<email from Step 3>",   // omit to use the project default
  schedule: {
    timezone: "America/New_York",
    daysOfWeek: [1, 2, 3, 4, 5],
    startHour: "08:00",
    endHour: "18:00",
    maxLeadsPerDay: 20,
    minTimeBtwEmails: 10,
    scheduleStartTime: "2026-02-25T00:00:00.000Z"
  }
})
```

This writes the `outbound_campaign` row in DRAFT status. The dispatcher does
not pick it up yet — Step 7 flips it on.

If `attachCampaignToMailbox` returns `ok: false`, the user has no connected
mailbox on this project. Stop and tell them to connect Gmail. Do not flip the
Smartlead campaign to START.

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

If start: call the moatt chat tool — do NOT POST to Smartlead's `/status`.

```
activateCampaign({ smartleadCampaignId: "<campaign_id>" })
```

This flips the `outbound_campaign` row from DRAFT → ACTIVE; the moatt
dispatcher starts firing emails through the user's connected mailbox on the
schedule from Step 6.

> **Do NOT call `POST /campaigns/{id}/status { status: "START" }` on
> Smartlead.** That asks Smartlead to send the campaign from a Smartlead-side
> mailbox we never registered — it will either error or send from a wrong
> sender. Moatt owns the sender; Smartlead is just the sequence/lead
> store.

If draft: skip — the user can flip it on from chat later by saying
"start the X campaign" (the model will call `activateCampaign`).

## Optional: Sub-sequence branch routing

After the campaign is live, the user can route specific touches conditionally — e.g. "if a lead replies to step 1 and the classifier marks them `interested`, skip ahead to the demo invite at step 4 instead of the standard follow-up at step 2".

This is configured via the `setBranchRules` chat tool, NOT through the Smartlead API. Rules are stored on the moatt `outbound_campaign` row and evaluated by the dispatcher after the next-touch computation. Suggest this only when the user describes conditional routing — don't apply rules unprompted.

```
setBranchRules({
  smartleadCampaignId: "<campaign_id>",
  rules: [
    {
      afterStep: 1,
      ifEvent: "replied",          // "replied" | "clicked" | "opened" | "bounced" | "auto_reply"
      ifCategory: "interested",    // optional — one of the canonical LEAD_CATEGORIES
      action: "skip_to",
      targetStep: 4
    }
  ]
})
```

Read the current rules with `listBranchRules({smartleadCampaignId})`. Pass `rules: []` to clear all routing.

Cap: 20 rules per campaign. Rules are evaluated in array order; the first match wins. Stop-condition settings (`stop_lead_settings`) ALWAYS run before branch evaluation — a "stop on reply" setting will suppress the touch even if a branch wanted to skip to a different step.

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
| `/campaigns/{id}/email-accounts` | GET | List mailboxes on a campaign (rarely used — moatt owns the sender) |
| ~~`/campaigns/{id}/email-accounts` POST~~ | — | **Do not call.** Moatt dispatches via Composio; Smartlead never holds the user's mailbox. |
| ~~`/campaigns/{id}/status` POST~~ | — | **Do not call.** Use the `activateCampaign` / `pauseCampaign` / `stopCampaign` chat tools instead. |
| `/campaigns/{id}/analytics` | GET | Top-level campaign analytics |
| `/email-accounts/` | GET | List all email accounts (offset/limit) |

## Example Prompts

- "Set up an outreach campaign for Truewind targeting accounting firms"
- "Create an outreach campaign — I have a CSV of leads"
- "Launch a cold email campaign to CFOs at mid-market companies"
- "Set up a 3-email sequence and allocate 5 free mailboxes"

## Metadata

```yaml
metadata:
  requires:
    chat_tool:
      - ensureOutboundReady          # confirm a connected Gmail/Outlook exists
      - listOutboundMailboxes        # pick the sending mailbox
      - attachCampaignToMailbox      # register the Smartlead campaign on the moatt side (Step 6.5)
      - activateCampaign             # flip campaign to ACTIVE so the dispatcher picks it up (Step 7)
      - listBranchRules              # read current branch routing on a campaign (optional, post-launch)
      - setBranchRules               # configure conditional touches (optional, post-launch)
      - getCampaignProgress          # report metrics + A/B winner + branch routing (post-launch read)
  cost: "Per-action credits via the Moatt proxy. User pays nothing extra to the upstream provider."
```
