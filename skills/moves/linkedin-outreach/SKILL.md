---
name: linkedin-outreach
description: >
  End-to-end LinkedIn outreach campaign builder. Pulls leads from Supabase, an
  upstream skill, or CSV. Aligns on goal and tone, writes personalized LinkedIn
  sequences (connection note + follow-ups + optional InMail), presents for review,
  and exports for the user's outreach tool (Dripify, Botdog, Expandi, or a generic
  CSV). Logs everything back to the Supabase outreach_log.
tags: [outreach]
---

# LinkedIn Outreach

The LinkedIn counterpart to `cold-email-outreach`. Pulls qualified leads from Supabase, builds personalized LinkedIn sequences, exports for the user's LinkedIn tool, and logs the campaign in Supabase.

**Tool-agnostic:** Asks the user which LinkedIn tool they use, then adapts. Every tool here is CSV-import — no API/MCP automation exists for LinkedIn outreach tools (they're browser-based). Per-tool adapters handle column mapping and format quirks.

## When to Auto-Load

Load this skill when:
- User says "LinkedIn outreach", "connect with these leads on LinkedIn", "send LinkedIn messages", "set up a LinkedIn campaign"
- An upstream skill chains via "create LinkedIn campaign" or "passes: supabase-eligible-leads" and the user picked LinkedIn
- User finishes `lead-qualification` and wants to reach out on LinkedIn

## Supported Outreach Tools

The skill never assumes a tool. It asks, then adapts.

| Tool | Integration | How It Works |
|------|------------|--------------|
| **Dripify** | CSV import | Emits a CSV that matches Dripify's import format; user uploads manually |
| **Botdog** | CSV import | Emits a CSV with Botdog-compatible columns |
| **Expandi** | CSV import | Emits a CSV that matches Expandi's import format |
| **PhantomBuster** | CSV import | Emits a CSV for PhantomBuster's LinkedIn sequences |
| **Manual / Other** | CSV + instructions | Generic CSV plus tool-agnostic setup notes |

**Tool selection logic:**
1. Phase 0 asks: "Which LinkedIn outreach tool do you use?"
2. Emit the tool-specific import CSV based on the answer
3. If **Other or unknown** → emit the generic CSV (`linkedin_url`, `first_name`, `last_name`, `company`, `title`, `connection_request`, `followup_1`, `followup_2`, `followup_3`, `inmail_subject`, `inmail_body`) and ask the user for their tool's import requirements

## Prerequisites

### Supabase

People must live in Supabase with the schema from `tools/supabase/schema.sql`. The `people` and `outreach_log` tables must exist. Run `python3 tools/supabase/setup_database.py` if you're standing up a fresh database.

Environment variables in `.env`:
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### LinkedIn Tool

CSV export is all you need — no API keys. The user imports the CSV into their tool manually.

## Character Limits

LinkedIn enforces strict character limits. **Every generated message must respect them.**

| Message Type | Limit | Notes |
|-------------|-------|-------|
| Connection request note | 300 characters | Hard limit. Every character counts. |
| Regular message | 8,000 characters | Sent after the connection is accepted |
| InMail subject | 200 characters | InMail only (premium feature) |
| InMail body | 1,900 characters | InMail only |

**Enforcement:** After generating any message, count characters. If you blow the limit, rewrite — don't truncate. Truncated messages look broken.

## Phase 0: Intake

Ask everything at once. Group by category. Skip anything already answered upstream.

### Campaign Goal
1. What's the objective? (book meetings, drive demo requests, get replies, build relationships, nurture)
2. What's the outreach angle or hook? (hiring signal, competitor displacement, event-based, pain-based, cold database, KOL engagement, mutual connection)
3. What should we name this campaign?

### Outreach Tool
4. Which LinkedIn outreach tool do you use? (Dripify / Botdog / Expandi / PhantomBuster / Other / Just give me a CSV)

### Lead Selection
5. Which leads should we target? Options:
   - All leads for a specific `client_name`
   - Specific `icp_segment`
   - Title patterns (e.g., "VP Operations", "Director of Sales")
   - Industry or location filters
   - `qualification_score` above a threshold
   - Specific `source` (crustdata, apollo, linkedin, etc.)
   - Custom filter (describe what you want)
6. Any exclusions? (specific companies, recently contacted leads, certain titles)
7. Max campaign size? (default: 100 — LinkedIn tools have lower daily caps than email)

### Tone & Style
8. Which tone preset? Options:
   - **Casual Professional** — Friendly, human, slightly informal. Like messaging a peer. (default)
   - **Thought Leader** — Lead with an insight or a contrarian take. Position the sender as an expert.
   - **Provocative** — Challenge assumptions, pattern-interrupt. Higher risk, higher reward.
   - **Enterprise Formal** — Polished, structured. For regulated industries or C-suite targets.
   - **Custom** — Paste messages that worked before, or describe the vibe.
9. Any reference messages that have worked well? (paste examples — these override the tone preset)

### Sequence Structure
10. How many follow-ups after the connection? (default: 3)
11. Timing between messages? (default: Day 0 connection / Day 3 FU1 / Day 7 FU2 / Day 14 FU3)
12. Include an InMail as a separate step for leads who don't accept the connection? (default: yes)

### Personalization
13. What signal data is available for these leads? (comment text, post they engaged with, mutual connections, hiring signals, event attendance)
14. Any proof points or case studies to lean on? (customer names, metrics, testimonials)

## Phase 1: Lead Selection from Supabase

### Connect

Use the shared Supabase client:

```python
import sys, os
sys.path.insert(0, os.path.join("tools", "supabase"))
from supabase_client import SupabaseClient

client = SupabaseClient(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
```

### Build Filters

Translate user criteria into PostgREST query parameters on the `people` table:

| User Says | PostgREST Filter |
|-----------|-----------------|
| "VP Operations" | `title=ilike.*VP Operations*` |
| Client "happy-robot" | `client_name=eq.happy-robot` |
| Score > 7 | `qualification_score=gte.7` |
| Has LinkedIn URL | `linkedin_url=neq.` (not empty) |
| Industry "logistics" | `industry=ilike.*logistics*` |
| Location "San Francisco" | `location=ilike.*San Francisco*` |
| Source "crustdata" | `source=eq.crustdata` |
| Not contacted in 84 days | `or=(last_contacted.is.null,last_contacted.lt.{84_days_ago})` |

**Critical:** For LinkedIn outreach, the person MUST have a `linkedin_url`. Drop anyone without one — they can't be reached on LinkedIn.

### Cooldown Filter (Mandatory)

**Always** exclude anyone contacted in the last 84 days (12 weeks) on ANY channel (email or LinkedIn). Not optional.

Use the shared client's `check_cooldown()`:
```python
in_cooldown = client.check_cooldown(client_name="happy-robot", cooldown_days=84)
# Returns the set of person_id strings still in cooldown
```

Or query directly:
1. Pull `outreach_log` rows with `sent_date` in the last 84 days:
   ```
   GET /rest/v1/outreach_log?select=person_id&sent_date=gte.{84_days_ago}&status=neq.bounced&client_name=eq.{client}
   ```
2. Collect those `person_id`s into an exclusion set
3. Add `id=not.in.({excluded_ids})` to the people query

**Note:** Cooldown is cross-channel. Someone emailed 30 days ago is still in cooldown for LinkedIn. Prevents multi-channel bombardment.

### Present & Confirm

Show a sample table (10-15 leads) with:
- Name, Title, Company, Industry, Score, LinkedIn URL, Last Contacted, Signal Type

Tell the user: total eligible leads, how many were excluded by cooldown, how many were excluded for missing LinkedIn URL.

Ask the user to confirm or adjust filters before continuing.

## Phase 2: Sequence Design

Lay out the sequence plan as a table before writing any copy:

| Step | Timing | Message Type | Approach | CTA |
|------|--------|-------------|----------|-----|
| 1 | Day 0 | Connection request (300 chars) | Signal-based personalized note | Soft — just connect |
| 2 | Day 3 | Follow-up 1 (after accepted) | Value-first: insight, resource, or observation | Question or offer |
| 3 | Day 7 | Follow-up 2 | Social proof or case study | Specific ask |
| 4 | Day 14 | Follow-up 3 | Breakup / last touch | Open door |
| 5 | Day 7* | InMail (if not accepted) | Standalone pitch with context | Meeting request |

*InMail goes to leads who haven't accepted the connection by Day 7.

**Key differences from email sequences:**
- The connection request is the gatekeeper — it must earn the accept. No selling in the connection note.
- Follow-ups are conversational, not broadcast. They should read like DMs, not emails.
- No subject lines except for InMail.
- Shorter almost always wins. A 2-sentence message outperforms a 5-sentence one on LinkedIn.

Get user approval on the structure before generating copy in Phase 3.

## Phase 3: Message Generation

Generate messages inline — no external sub-skill needed since LinkedIn messages are short enough to handle directly.

### Signal-Aware Template Selection

Pick the sequence template based on the lead's signal data:

| Signal Type | Template | Key Personalization Variable |
|-------------|----------|------------------------------|
| Pain-language engager (has comment text) | `templates/sequence-templates/pain-language.md` | `{comment_snippet}`, `{pain_topic}` |
| Competitor post engager | `templates/sequence-templates/competitor-engagement.md` | `{competitor_name}`, `{post_topic}` |
| KOL engager | `templates/sequence-templates/kol-engagement.md` | `{kol_name}`, `{post_topic}` |
| Database search (lean signal) | `templates/sequence-templates/database-search.md` | `{title}`, `{company}`, `{industry}` |
| Hiring signal | `templates/sequence-templates/hiring-signal.md` | `{role_hiring_for}`, `{job_posting_detail}` |
| Event attendee | `templates/sequence-templates/event-attendee.md` | `{event_name}`, `{event_topic}` |

### Tone Calibration

1. Load the selected tone preset from `templates/tone-presets.json`
2. If the user provided reference messages, those override the preset — analyze them for tone, length, structure, and vocabulary
3. Apply tone guidelines across every generated message

### Calibration Loop

1. Generate sample messages for 3-5 leads first (pick leads with different signal richness levels)
2. Present for review — show the full sequence for each sample lead
3. Iterate until approved (cap at 3 rounds)
4. Batch-generate the rest after approval

### Writing Guidelines

**Connection Request (300 chars max):**
- Open with the signal (what they did or said that caught your attention)
- One sentence of relevance (why you're connecting)
- No pitch, no CTA, no "I'd love to..." — just be interesting enough to accept
- MUST stay under 300 characters. Count every one.

**Follow-up 1 (value-first):**
- Thank them for connecting briefly — one clause, not a whole sentence
- Share something genuinely useful: an insight, a piece of content, an observation about their company/industry
- End with a question, not a pitch

**Follow-up 2 (social proof):**
- Reference a relevant customer or case study
- Connect it to their specific situation
- Make a specific, low-commitment ask (15-min call, async question)

**Follow-up 3 (breakup):**
- Acknowledge you've been reaching out
- One-line value recap
- Leave the door open without pressure
- The shortest message in the sequence

**InMail (standalone pitch):**
- Subject: 200 chars max — curiosity-driven, not salesy
- Body: 1,900 chars max — must hold up standalone since they haven't accepted your connection
- Include context for why you're reaching out (the signal)
- Must work even if they've never heard of you

### Merge Variables

Standard variables available for every lead:
- `{first_name}`, `{last_name}`, `{company}`, `{title}`, `{industry}`, `{location}`

Signal-specific variables (available depending on source):
- `{comment_snippet}` — the text of their LinkedIn comment
- `{pain_topic}` — the pain point they engaged with
- `{competitor_name}` — the competitor whose post they engaged with
- `{kol_name}` — the KOL whose post they engaged with
- `{post_topic}` — what the post was about
- `{event_name}` — the event they attended
- `{role_hiring_for}` — the role they're hiring for
- `{job_posting_detail}` — a detail from the job posting

## Phase 4: Campaign Export

### Step 1: Generate the Universal CSV

Core columns for every export:

```
linkedin_url, first_name, last_name, company, title, connection_request, followup_1, followup_2, followup_3, inmail_subject, inmail_body
```

### Step 2: Format for the Selected Tool

**Dripify:**
- Column mapping: `Profile URL` → linkedin_url, `Note` → connection_request, `Message 1` → followup_1, etc.
- Dripify expects one row per lead with all messages in separate columns
- Export: CSV with headers matching the Dripify import template

**Botdog:**
- Column mapping: `linkedin_profile_url` → linkedin_url, `connection_note` → connection_request, `message_1` → followup_1, etc.
- Export: CSV

**Expandi:**
- Column mapping: `LinkedIn URL` → linkedin_url, `Connection message` → connection_request, `Follow-up #1` → followup_1, etc.
- Supports InMail columns: `InMail subject`, `InMail message`
- Export: CSV

**PhantomBuster:**
- Column mapping: `profileUrl` → linkedin_url, `message` → connection_request
- PhantomBuster typically handles one action at a time — may require separate CSVs for connection + follow-ups
- Export: CSV

**Manual / Other:**
- Use the universal CSV format
- Provide column descriptions and tool-agnostic import instructions
- Ask the user what format their tool expects and adjust if needed

### Step 3: Save Files

```
skills/linkedin-outreach/output/{campaign-name}-{YYYY-MM-DD}.csv
```

Create the `output/` directory if it's missing.

### Step 4: Optional Google Sheet

If the user wants a review sheet, use the `google-sheets-write` capability to build a sheet with:
- Tab 1: Lead list with every message (one row per lead)
- Tab 2: Sequence templates (the master templates used)
- Tab 3: Campaign config summary

## Phase 5: Review & Approval

Present the campaign summary:

```
Campaign: {name}
Tool: {dripify/botdog/expandi/etc.}
Leads: {count}
Sequence: Connection + {followup_count} follow-ups + InMail
Timing: Day 0 → Day {last_day}
Tone: {preset_name}
Signal types: {breakdown by signal type}
Leads with rich signal: {count} ({percentage}%)
Leads with lean signal: {count} ({percentage}%)
Export file: {file_path}
```

### Hard Approval Gate

**Do NOT mark the campaign as ready without explicit user confirmation.** Show the summary, then ask: "Ready to finalize? Type 'yes' to mark as ready for import."

After approval:
- Tell the user the file is ready to import
- Provide the file path
- Give tool-specific import instructions (see Phase 4)
- Remind them to spot-check the first 5-10 messages after import

## Phase 6: Logging

### Database Write Policy

**Every database write in this phase requires the user's prior approval at the finalization gate in Phase 5.** LinkedIn campaigns are always exported (never auto-launched), so confirm with the user before logging to `outreach_log` — they may not have actually imported the campaign yet. Only log once the user confirms the export is final.

### Log to Supabase

After export and confirmation, insert into `outreach_log`:

```
POST /rest/v1/outreach_log
Prefer: return=minimal

[
  {
    "person_id": "{person_uuid}",
    "campaign_name": "{campaign_name}",
    "channel": "linkedin",
    "tool": "{dripify/botdog/expandi/phantombuster/manual}",
    "sent_date": "{ISO timestamp}",
    "status": "exported",
    "client_name": "{client_name}"
  },
  ...
]
```

Or use the shared client:
```python
client.log_outreach(entries)
```

**Status is `"exported"`, not `"sent"`.** LinkedIn tools are browser-based — delivery can't be confirmed. The status flips to `"sent"` once the user confirms the campaign actually launched.

### Update People Records

Update `last_contacted` on the people table for everyone in this campaign:

```
PATCH /rest/v1/people?id=in.({person_ids})
{ "last_contacted": "{ISO timestamp}" }
```

### Present Summary

```
Campaign: {name}
{count} people logged to outreach_log (channel: linkedin)
last_contacted updated for {count} people
Cooldown active until: {date + 84 days}
Next eligible re-contact: {date}
File ready: {file_path}
```

## Cooldown Enforcement Rules

Reference section for the cooldown logic used throughout this skill. Shared with `cold-email-outreach`.

| Rule | Detail |
|------|--------|
| **Default cooldown** | 84 days (12 weeks) from `sent_date` |
| **Cross-channel** | Cooldown is cross-channel. A lead emailed recently is in cooldown for LinkedIn too. |
| **Bounced leads** | Exempt from cooldown (email only — LinkedIn doesn't bounce). Filter: `status=neq.bounced` when checking cooldown |
| **Active campaign leads** | Always ineligible — if a lead is in an active campaign on any channel, they can't be added to another |
| **User override** | The user can explicitly override cooldown for specific leads — confirm before allowing |
| **Null last_contacted** | Leads never contacted are always eligible |

## Output Directory

Campaign exports are saved to:
```
skills/linkedin-outreach/output/
```

Create the directory if it's missing. Files are named `{campaign-name}-{YYYY-MM-DD}.csv`.
