---
name: ai-account-brief-generator
description: >
  Pre-call account brief that orchestrates company research, leadership lookup,
  recent news, hiring signals, tech stack detection, and competitor presence
  into a 200-word brief plus a recommended trap question per stakeholder.
  Designed to land in the AE's inbox 24 hours before any sales call so they
  walk in informed without spending 45 minutes prepping.
tags: [research]
---

# AI Account Brief Generator

The difference between a discovery call that converts and one that wanders is whether the AE knew, before walking in, what's true about the company beyond the obvious. This skill chains research across six dimensions, synthesizes the result into a 200-word brief, and proposes one specific question per stakeholder that reveals where the deal can move.

**Built for:** AEs who walk into 5+ first calls a week and want every one of them to feel like they've done deep prep, without actually spending an hour on each.

## When to Use

- "Run the account brief for {Company}"
- "Pre-call prep for the {Prospect} meeting tomorrow"
- "Generate briefs for all my calls today"
- "Account brief — discovery call with {Stakeholder} at {Account}"

## Phase 0: Intake

Required:
1. **Account name** (and domain if non-obvious)
2. **Stakeholders attending** — names + titles. At minimum the primary contact.
3. **Call type** — discovery / demo / negotiation / executive / renewal. Tunes the brief's emphasis.
4. **Your offer one-liner** — what you sell. Keeps the trap question on-target.

Optional:
5. **Time horizon** — when's the call? (Brief is calibrated to "as fresh as possible." Calls more than 7 days out get a re-run trigger.)
6. **CRM context** — past activity with this account, prior closed-lost reasons, etc.

## Phase 1: Research (parallel)

Run the following sub-skills in parallel. None block on each other.

### 1A — Company snapshot
**Skill:** `company-intel`
- Industry, size band, HQ, business model, customer types
- Outputs: 3-line description, headcount estimate, vertical tags

### 1B — Funding + financial signal
**Skills:** `company-funding-search`, `crunchbase-pull` (when available), web search
- Last round (date, size, stage, lead investor)
- Burn / runway signals (recent layoffs, hiring pace, exec changes)
- Outputs: "{Series X, $Y, {date}} | runway signal: {accelerating | steady | tightening | unknown}"

### 1C — Leadership + buying committee
**Skill:** `linkedin-profile-post-scraper` for each named stakeholder
- Job tenure, prior companies, education, last 5-10 LinkedIn posts
- For each stakeholder: bio, role tenure, three recent post topics, voice/tone
- Build the buying committee: known stakeholders + likely stakeholders inferred from the org

### 1D — Hiring signals
**Skill:** `linkedin-job-scraper` (or `job-scraper`)
- Open jobs in the last 60 days
- Pattern flags: data team scaling, RevOps role posted, GTM hire on the way, role in the prospect's org
- Outputs: 3-5 most signal-rich postings with what they imply

### 1E — Tech stack + intent
**Skill:** `tech-stack-teardown` (or BuiltWith / Wappalyzer wrapper)
- Detected analytics, CRM, marketing, product tools
- Highlights: tools you displace, tools you complement, tools that are signal of pain
- If `g2-buyer-intent` or `bombora-company-surge` integrations exist: pull category-level intent score

### 1F — Recent news + signals
**Skill:** Web search with date filter
- Press, product launches, customer announcements, leadership changes, lawsuits, layoffs in last 90 days
- Outputs: 3 most relevant items, each in one sentence

### 1G — Competitor presence (optional)
- If competitor list provided: detect competitor logos on their site, mentions in their content, or job postings referencing competitor experience
- Outputs: "{competitor X} likely in use" / "uses {complementary tool}, may be entry-point" / "no signal"

## Phase 2: Synthesis

Run a single LLM synthesis pass over all collected data. Produce the brief in the structure below — 200 words is a hard cap on the body. Anything that doesn't fit goes into a "deeper context" appendix that's separate.

### The brief structure

```markdown
# Account Brief: {Company}
*For: {AE name} | Call: {call type} on {date} | Stakeholders: {list}*

## Snapshot (≤30 words)
{What the company does, in their language, plus the single most signal-rich
fact about right now — funding, layoff, hire, launch.}

## What's actually true (≤120 words, 3-5 bullets)
- {Hiring signal — one sentence}
- {Funding/runway signal — one sentence}
- {Tech stack signal — one sentence}
- {News/competitive signal — one sentence}
- {CRM history note if any — one sentence}

## Buying committee
| Person | Role | Tenure | Recent angle | Likely stance |
|---|---|---|---|---|
| {name} | {title} | {months} | {what they post / care about} | {champion / blocker / neutral} |
| ... | ... | ... | ... | ... |

## Trap question per stakeholder
- **{Stakeholder 1}:** "{Specific question. Their answer with X reveals Y; their answer with Z reveals W.}"
- **{Stakeholder 2}:** "{Specific question.}"

## Recommended opener (for the AE who's running the call)
"{One specific, fact-grounded opening line that references something real
about the account in the last 30 days. Not flattery. Not a generic question.}"

## Risks to watch for
- {One specific risk — e.g., 'they just lost their CRO; deal could stall 60+ days'}
- {Another risk if applicable}

---
*Brief generated {timestamp}. Re-run within 24h of the call if {company news / champion change / new hire} fires.*
```

### Trap question quality bar

A trap question:
- References a specific signal (not "tell me about your priorities")
- Has a binary or near-binary signal in the answer ("are you doing X or Y" reveals a clear path)
- Avoids asking what's already public (avoid asking about funding if they raised yesterday)

Examples of good vs. weak trap questions:

| Weak | Strong |
|---|---|
| "What are your top priorities for this quarter?" | "I noticed you're hiring two analytics engineers. Is the new data stack already in flight, or is the role meant to figure out which stack you're going to build on?" |
| "How are you thinking about ROI?" | "Most teams using {their stack} that we talk to either run reporting in-house and burn analyst hours, or pay for {expensive tool} and get blocked by the model. Which side are you on right now?" |

The brief includes both the question *and* what each likely answer signals.

## Phase 3: Deeper context appendix (optional, separate file)

For high-stakes calls (enterprise, late-stage, exec), produce a longer appendix at `appendix-{slug}.md`. Includes:

- Each stakeholder's last 10 LinkedIn posts in full
- Full job listing list (not just summary)
- Full news list
- Tech stack detail
- Detected competitor presence with evidence
- Past CRM history if provided

The 200-word brief stays the headline; the appendix is for AEs who want to go deep before the call.

## Phase 4: Delivery

Default delivery options:

1. **Markdown file** — saved to `clients/<client>/accounts/<slug>/brief-{YYYY-MM-DD}.md`
2. **Email** — sent to AE 24 hours before the call (if calendar integration is wired up)
3. **Slack DM** — posted to AE 1 hour before the call as a tactical reminder
4. **CRM note** — attached to the opportunity if HubSpot/Salesforce access is provided

The 1-hour Slack reminder uses a condensed format: snapshot, top trap question, top risk. The AE can read it on the way to the meeting.

## Phase 5: Refresh signals

A brief generated 7 days ago for a call tomorrow should be re-run if any of the following fire in the interim:

- New funding round announced
- Stakeholder leaves the company
- New stakeholder added to the meeting
- New jobs posted matching key signal patterns
- Significant news (acquisition, layoff, lawsuit)
- Competitor displacement/announcement

The skill writes a `triggers.json` alongside the brief; `signal-scanner` (existing) can poll this and re-fire.

## Phase 6: Output formats

```markdown
# Account Brief: Acme Co
*For: Jane (AE) | Call: Discovery on 2026-05-14 | Stakeholders: Mark Patel (VP Engineering), Lisa Chen (Director, Analytics)*

## Snapshot
Acme Co is a 320-person Series C data infrastructure platform. Raised $80M in March 2026; just opened five analytics-engineering roles in the last 30 days.

## What's actually true
- Active hiring: 5 analytics-engineering roles posted in last 30 days; 2 mention "Snowflake" — fresh data stack signal.
- Funding signal: $80M round March 2026 led by {VC}; runway easily 24+ months.
- Stack: BuiltWith shows Segment + Looker + dbt + Snowflake. They run on the modern data stack but no observability layer detected.
- News: Launched their {Product Y} on Apr 12; CEO posted three times this week about "data quality at scale."
- CRM: Closed-lost in 2024 — reason was "too early; no DataOps owner." Now they have one.

## Buying committee
| Person | Role | Tenure | Recent angle | Likely stance |
|---|---|---|---|---|
| Mark Patel | VP Engineering | 22 mo | Posts about reliability, tech debt, hiring | Champion likely |
| Lisa Chen | Director, Analytics | 4 mo (new!) | Posts about dbt and Snowflake migration | Champion likely — fresh role, building stack |

## Trap question per stakeholder
- **Mark:** "I saw the analytics-engineering hiring push. Are those folks coming in to lay new infra alongside Snowflake/dbt, or to fix something that's currently broken in production reporting?"
  → "lay new infra" = greenfield motion, longer cycle. "fix broken" = pain, 60-90 day cycle.
- **Lisa:** "You came in 4 months ago — what was the first thing you wanted to see fixed in the data layer once you got the lay of the land?"
  → answer reveals her authority + current frustrations she'd budget against.

## Recommended opener
"Saw your Apr 12 launch of {Product Y} — congrats. Looks like you doubled your analytics hiring around the same window. Walk me through what the plan is for the data layer once those folks are seated."

## Risks to watch for
- Mark posted critically about vendor sales calls in February. Tone matters more than usual.
- They closed-lost with us in 2024. Not raising it ourselves is fine; if they raise it, lean into "you just hired the role we were missing on the prior eval."
```

## Cost

| Component | Cost per brief |
|---|---|
| Company intel (existing skill) | ~$0.05-0.10 |
| LinkedIn profile + post scrape (per stakeholder) | ~$0.10-0.20 |
| Job scrape | ~$0.05 |
| Tech stack detection | ~$0.02 |
| News search | ~$0.05 |
| Synthesis LLM | ~$0.05 |
| **Typical 2-stakeholder brief** | **~$0.50-0.80** |

## Tools Required

- `company-intel` (existing)
- `linkedin-profile-post-scraper` (existing)
- `company-funding-search` (existing)
- `linkedin-job-scraper` (existing)
- `tech-stack-teardown` (existing)
- Web search for news
- LLM for synthesis
- Optional: calendar integration for delivery, CRM access for context

## Trigger Phrases

- "Run the account brief for {Company}"
- "Pre-call prep for {Prospect}"
- "Generate briefs for today's calls"
- "Account brief: {Account} — call tomorrow"
