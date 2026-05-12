---
name: linkedin-voicenote-pre-warm
description: >
  Generate a 30-45 second LinkedIn voice note script per prospect,
  designed to be sent before the first email touch as a warm-up.
  Personalizes around one specific verifiable fact. Reps record and
  send via LinkedIn mobile; the email sequence follows 24 hours
  later referencing the voice note. Reply rate on the subsequent
  email lifts 30-40% versus cold email alone.
tags: [outreach]
---

# LinkedIn Voicenote Pre-Warm

A 30-second LinkedIn voice note before the first email is one of the highest-leverage tactics in modern outbound. The voice note breaks pattern, signals real human effort, and creates a moment of mutual recognition before the cold email even arrives. This skill writes the scripts — natural-sounding, fact-grounded, and the right length to actually record.

**Built for:** SDR/AE teams targeting Tier-1 accounts (top 10-50 priority targets per rep) where a few minutes of voice-note recording per account is justified.

## When to Use

- "Write voice note scripts for the {Tier} list"
- "Generate LinkedIn voice notes for {Account list}"
- "Create pre-warm scripts before the email cadence"
- "Run the voice note generator"

## When NOT to Use

- High-volume outbound — voice notes don't scale past ~20-30 per rep per day
- Cold prospects you have no specific fact about — generic voice notes hurt more than they help
- Roles where LinkedIn isn't the primary channel (some operational/manufacturing/IT roles)

## Inputs

Required:
- **Prospect list** — top-tier accounts. Each entry: name, title, company, LinkedIn URL, plus at least one of:
  - Recent LinkedIn post URL
  - Recent funding/news event
  - Recent hire pattern at their company
  - Their podcast / conference appearance

- **Sender** — name + their offer one-liner

Optional but improves quality:
- **Sender voice profile** — natural speaking patterns from prior recordings (helps the script match how the rep actually sounds)
- **Tone** — `direct` / `warm` / `playful`. Default: `warm` (voice notes work best with warmth)

## What makes a voice note convert

A voice note that lands has 5 elements in this order:

1. **Greeting** (3-5 sec) — name + sender intro
2. **Acknowledgment** (5-8 sec) — references one specific fact from their LinkedIn / news / public activity
3. **Why I'm reaching out** (10-15 sec) — connects the fact to a problem the sender's offer solves
4. **The ask** (5-8 sec) — soft, low-friction. Not "let's hop on a call." Either "I'd love to send you a quick note about it" or "curious if it's on your radar."
5. **Close** (3-5 sec) — appreciation + signoff

Total: 30-45 seconds. Anything longer and recording quality drops; the rep stumbles, the prospect zones out.

## Workflow

### Step 1 — Pull facts per prospect

Same fact-priority logic as `persona-on-the-fly-emailer`:

1. Recent LinkedIn post (≤30 days)
2. Recent funding / news event (≤90 days)
3. Hiring signal (≤30 days)
4. Conference / podcast appearance (≤90 days)
5. Tech stack / product launch
6. Tenure milestone

Each fact must include source URL + date so the rep can verify before recording.

### Step 2 — Generate the script

For each prospect, produce a script with embedded recording notes. The script is what the rep speaks; the recording notes guide pacing.

Template:

```markdown
## Voice note for: {first_name} {last_name} @ {Company}

**Length target:** 30-45 seconds
**Recording notes:** {pace, tone notes — "natural pace, warmth at start, slight smile in voice when mentioning their post"}

---

### Script

"Hey {first_name} — {sender_first_name} here.

[1-second pause]

{Acknowledgment — references specific fact, 1-2 sentences. E.g., 'Saw your post yesterday on {topic} — the part about {specific point} stuck out, especially the {detail}.' Quote a 5-15 word fragment of their actual post if appropriate.}

[short pause]

The reason I picked up to record this: {one-sentence bridge connecting the fact to a problem the sender's offer solves}. {One-sentence value claim that's specific, not generic.}

[short pause]

I'm not gonna pitch you over voice — but I figured a quick note here was better than a generic email. {Soft ask: 'I'll send you something more specific over email tomorrow if that's OK with you.' OR 'Curious if {category problem} is on your radar at {Company} — would love your take.'}

[short pause]

Either way, thanks for the post — really got me thinking. Talk soon.

[end]
"

---

### Source for the rep to verify
- {Source URL with date}

### What to send next (24h later)
The rep should send an email referencing this voice note. Subject template:
"{First_name} — following up on the LinkedIn note"
```

### Step 3 — Quality bar per script

Every script passes:

- **Length:** 80-110 words spoken (translates to 30-45 sec at natural pace). Reject if outside.
- **Specificity:** every script names a specific fact. Reject "I really enjoy your content" / "love what your team's doing" / generic flattery.
- **No question in the close:** the close is a soft offer, not a question. Asking "got 30 minutes?" in a voice note is too aggressive.
- **Natural pacing:** include `[pause]` markers to remind the rep to breathe. Voice notes recorded too fast feel robotic.
- **No banned phrases:** "hope this finds you well", "I came across your profile", "I noticed you're a {title}", "amazing", "incredible".
- **Sender voice match (optional):** if a voice profile is available, lexical match score must be ≥0.7 — the script must sound like the rep, not like an LLM.

### Step 4 — Output

Per prospect:
- `voicenote-scripts/{prospect-slug}.md` — script + recording notes + source

For the batch:
- `voicenote-scripts/_index.md` — list of all scripts with prospect names + the trigger fact
- `voicenote-scripts/recording-checklist.md` — practical checklist for the rep:
  ```
  ## Recording checklist
  
  Setup:
  - Quiet room, no background noise
  - LinkedIn mobile app (web doesn't support voice messaging)
  - Open the conversation thread (you must be connected first; if not, send a connection request first with a short note)
  
  Recording:
  - Read the script once silently to set pacing
  - Record on the second take — first takes feel scripted
  - Listen back; re-record if you stumbled or sound flat
  - Aim for 30-45 sec; under 30 sounds rushed, over 45 starts to drag
  
  Sending:
  - Send during the prospect's working hours (their timezone)
  - Tuesday-Thursday morning is highest engagement
  - Don't bunch up — space sends across the day
  
  After:
  - Mark the prospect as "voice-note sent" in CRM
  - Schedule the email follow-up for 24 hours later
  - Track LinkedIn engagement (did they listen? — LinkedIn shows "seen" status)
  ```

### Step 5 — Pair with the email follow-up

The voice note's value compounds when the email follow-up references it correctly. Generate an email-step companion:

```
Subject: {first_name} — following up on the LinkedIn note

Hi {first_name},

Sent you a quick voice note on LinkedIn yesterday — wanted to follow up
properly here.

{Restate the bridge from the voice note in 1-2 sentences. Add a specific
piece of evidence or a customer story (via prospect-case-study-matcher).}

{Soft ask — 15-min call OR a low-friction artifact send.}

{Sender}
```

The email is calibrated to the voice note: shorter (because the prospect already heard the context), warmer (because the voice note already broke pattern), and more confident in the ask.

## Anti-patterns

- **Generic voice notes** — "Hi {first_name}, just wanted to introduce myself..." Reject.
- **Pitching in the voice note** — voice notes that pitch get ghosted. The voice note is permission-asking; the pitch comes later.
- **Long voice notes** — past 60 seconds, listening completion drops below 30%
- **Voice notes to people you're not connected with on LinkedIn** — most LinkedIn settings don't allow voice notes from non-connections. Connection request first.
- **Voice notes that sound like the rep is reading a script** — practice runs are not optional; first takes are robotic
- **Bulk voice note campaigns** — past ~20-30 per rep per day, the recording quality degrades and authenticity drops

## Edge Cases

- **Prospect doesn't have a recent LinkedIn post** — fall back to company-level facts (funding, hiring). If even those are absent, skip the voice note and use email cadence directly.
- **Prospect is in a regulated industry where unsolicited contact is restricted** — check before sending. The skill flags accounts in finance/legal/healthcare/government for human review.
- **Connection request not yet accepted** — most LinkedIn voice note features require connection. Either send a brief intro DM first, then voice note 48 hours later, or skip if the prospect doesn't accept.
- **Sender has accent or speech pattern that the voice note doesn't account for** — the voice profile match catches this; scripts adjust to natural rhythm.

## Cost

| Component | Cost per prospect |
|---|---|
| Fact gathering | ~$0.10 (mostly free if linkedin-profile-post-scraper already ran) |
| Script generation | ~$0.02 |
| Email companion | ~$0.005 |
| Quality validation | ~$0.005 |
| **Per script** | **~$0.13** |

The recording itself is rep time — typically 2-3 minutes per voice note including the playback check.

## Tools Required

- LLM for script generation
- Existing skills: `linkedin-profile-post-scraper`, `signal-scanner`, or fact source of choice
- Optional: prior voice recordings for voice-profile matching
- Optional: `prospect-case-study-matcher` (Wave 2) for the email follow-up

## Trigger Phrases

- "Write voice note scripts for {Tier list}"
- "Generate LinkedIn voice notes for {Accounts}"
- "Pre-warm scripts before the email cadence"
- "Run the voice note generator"
