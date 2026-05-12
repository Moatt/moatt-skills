---
name: persona-on-the-fly-emailer
description: >
  Generate a unique first-line opener per prospect by running a structured
  prompt over enriched account data (LinkedIn summary, recent posts, news,
  job postings, tech stack, competitor usage) and grounding the line in
  one verifiable, prospect-specific fact. Replaces "Hey {first_name}, hope
  you're well" with a one-line hook that proves the rep researched —
  without the rep researching.
tags: [outreach]
---

# Persona-on-the-Fly Emailer

Cold email personalization is either generic ("Hey {first_name}, hope you're well") or expensive (5-10 minutes of human research per prospect). This skill produces the second-quality output at the first quality's cost — a single grounded sentence per prospect, anchored to a specific public fact, with a confidence score and source link so the rep can verify.

**Built for:** SDR/AE teams running 100-1,000+ outbound emails a week who need real personalization without burning Clay credits or analyst hours.

## When to Use

- "Generate first-lines for this list"
- "Personalize the openers for the {Campaign} batch"
- "Write a hook per prospect for the {Sequence} sequence"
- "Add an opener column to this enriched CSV"

## Inputs

Required:
- **Prospect list** — CSV with at minimum: `first_name`, `last_name`, `company`, `domain`. More fields = better quality.

Optional but raises quality:
- **LinkedIn URL** per prospect (enables post-mining)
- **Recent posts** (last 5-10) per prospect — pulled by `linkedin-profile-post-scraper` if not provided
- **Company news** — last 90 days
- **Job postings** for the company (last 30 days)
- **Tech stack** detected on their site
- **Your offer one-liner** — what the rep is selling. Keeps the hook on-target.
- **Tone** — `direct` / `warm` / `playful`. Default: `direct`.

## What constitutes a "ground-able" fact

Not every fact makes for a good opener. The skill ranks candidate facts by:

| Fact type | Strength | Example hook |
|---|---|---|
| Recent LinkedIn post (≤30 days) | ★★★★★ | "Saw your post about {topic} — the {specific point} stuck out." |
| Company funding round (≤90 days) | ★★★★★ | "Congrats on the {round}; {specific implication} is exactly the kind of moment teams hit {pain}." |
| Specific hiring pattern (≤30 days) | ★★★★ | "Noticed you're hiring {N} {role}s — the {pattern} usually means {inferred priority}." |
| Recent press mention / launch | ★★★★ | "Caught the {announcement} — the {specific detail} is interesting given {context}." |
| Conference / podcast appearance | ★★★★ | "Listened to your {podcast/talk} on {topic} — the {specific claim} is one I keep thinking about." |
| Tech stack detail | ★★★ | "I see {tool} on the marketing stack — {observation about typical pattern with that tool}." |
| LinkedIn job tenure milestone | ★★ | "Almost 2 years at {company} — {role}-shaped problems usually hit around now." |
| Generic LinkedIn bio paraphrase | ★ | (Avoid; reads as scripted) |
| Anything older than 90 days | ★ | (Avoid; not "recent" anymore) |

The skill picks the highest-strength fact available per prospect. If only weak facts exist, it falls back to category-level rather than fabricating specificity.

## Workflow

### Step 1 — Collect facts per prospect

For each row, gather candidate facts in priority order:

1. **LinkedIn posts** — most recent 5; pick one with a strong signal (opinion, story, link to article they wrote, complaint, achievement)
2. **Company news** — last 90 days, filtered for material events
3. **Hiring** — most recent 30 days, filtered for roles tied to the rep's offer category
4. **Conference / podcast** — last 90 days, prospect was a speaker/guest
5. **Tech stack signals** — only if they're tied to the rep's offer (e.g., they use a tool you complement or replace)
6. **Tenure milestones** — if approaching 1, 2, 3, 5 years in role
7. **Bio paraphrase** — last resort, low strength

Each candidate fact must include:
- **Source URL** — the rep can click to verify
- **Date** — to confirm freshness
- **Strength score** — 1-5
- **Sentence-worthy** flag — would this read naturally in a one-line opener? (Some facts are interesting but don't make good hooks.)

### Step 2 — Generate the opener

Take the top-strength fact and run:

```
SYSTEM: You are an SDR drafting one-line cold email openers. Goal: prove the rep researched without sounding like an LLM. Rules:
- One sentence max, ≤25 words.
- Reference the fact directly. Use a 5-15 word fragment of their post / quote / news headline if applicable.
- No adjectives like "amazing" / "incredible" / "thrilled".
- No questions in the opener (questions go in the body).
- No "hope you're doing well" / "hope this finds you well" / "hope you had a great weekend".
- Voice: {tone — direct / warm / playful}.
- If the fact is a LinkedIn post, the opener should react to a specific point, not summarize.
- Output JSON only.

INPUT:
fact_type: {type}
fact_summary: {1-line summary}
fact_quote: {verbatim 5-15 word quote, if applicable}
fact_url: {url}
prospect_first_name: {name}
prospect_role: {title}
sender_offer: {what we sell}
tone: {direct / warm / playful}

OUTPUT:
{
  "opener": "<one sentence>",
  "fact_used": "<what fact informed it>",
  "confidence": 0.0-1.0,
  "source_url": "<url>",
  "tone_signature": "<direct / warm / playful>"
}
```

### Step 3 — Validate

Each generated opener passes through these checks:

1. **Length:** ≤25 words, ≤180 characters. Reject if longer.
2. **Banned phrases:** "hope this finds you well," "hope you're well," "amazing," "incredible," "I came across your profile," "I noticed you're a {title}." Reject and regenerate.
3. **Question count:** zero questions. Reject if any.
4. **First-name presence:** must include the prospect's first name OR a clear addressee. Reject if generic.
5. **Fact grounding:** the opener must reference content from the fact's source. Reject if it could plausibly apply to anyone in the same role.
6. **Confidence floor:** if model returned `confidence < 0.6`, regenerate once. If still <0.6, fall back to `[manual personalization needed]` and skip rather than ship a weak opener.

### Step 4 — Output

Append to the input CSV:

```
opener, fact_type, fact_url, opener_confidence, manual_review
```

- `opener` — the generated sentence (or `[manual personalization needed]` if it failed)
- `fact_type` — which fact category it used (`linkedin_post`, `funding`, `hiring`, etc.)
- `fact_url` — clickable source for the rep to verify
- `opener_confidence` — 0-1
- `manual_review` — `true` for any row that fell back, OR for top-tier accounts where the rep should always eyeball

### Step 5 — Quality report

```markdown
## Persona-on-the-Fly Run — {date}

**Prospects processed:** {N}
**Personalized successfully:** {M} ({pct}%)
**Manual review queue:** {K}

### Fact type distribution
- LinkedIn post: {N}
- Funding signal: {N}
- Hiring signal: {N}
- News / launch: {N}
- Conference / podcast: {N}
- Tech stack: {N}
- Tenure milestone: {N}

### Quality flags
- Below confidence floor: {N}
- Banned-phrase regenerations: {N}
- Avg word count: {N}

### Recommended next step
- Push the {M} successful rows into the sequence as the day-1 first-line.
- Manually review the {K} flagged rows or remove them from this batch.
```

## Tone Examples

Same fact, three tones, to illustrate the difference:

**Fact:** "Mark just posted on LinkedIn about scaling their analytics team from 4 to 12 in the last year."

- **Direct:** "Mark — saw the post on going from 4 to 12 analysts in a year. The first thing teams I work with usually rebuild around 8-10 is the tooling spend."
- **Warm:** "Mark, that note about going from 4 to 12 analysts hit close to home — most folks I work with rebuild their stack around 10."
- **Playful:** "Mark — going from 4 analysts to 12 in a year is wild. The thing nobody warned you about is what month 13 looks like."

The skill picks whichever tone is configured. The fact and the structural punch are identical.

## Anti-patterns the skill rejects

- **Backwards flattery:** "Hi Mark, your work on {topic} is so impressive!" → rejected (adjective + flattery)
- **Generic referral fish:** "Hi Mark, I came across your profile..." → rejected (banned phrase)
- **Tour-of-research:** "Hi Mark, I see you've been at {co} for 2 years, you previously worked at {prev}, and you went to {school}." → rejected (no question or hook, just a recital)
- **Question-led opener:** "Mark — quick question, how are you handling {pain}?" → rejected (question goes in body)
- **Fabricated specificity:** the model invents a quote that doesn't exist in the source → rejected via grounding check

## Edge Cases

- **Prospect has no LinkedIn URL** — skill still runs, but quality degrades. Falls back to company-level facts (funding, hiring, news). Manually flag if even those are missing.
- **Prospect's most recent post is a generic congrats / company repost** — not sentence-worthy. Skill scans for the next fact down the priority list rather than forcing a hook on a weak signal.
- **Prospect just published a viral post** — skill notices the engagement spike and prioritizes that post even if not the most recent.
- **Multiple prospects from same company** — the skill rotates fact types so 5 reps from the same company don't all get "saw the funding round" openers. Diversifies across LinkedIn posts vs. news vs. hiring.

## Cost

| Component | Cost per prospect |
|---|---|
| Fact gathering (LinkedIn / news / etc., when scrapers are needed) | ~$0.05-0.15 |
| Opener generation | ~$0.005 |
| Validation regenerations (avg 1.1× per opener) | ~$0.005 |
| **Total per prospect** | **~$0.06-0.16** |

Versus 5-10 minutes of human research at SDR cost (~$1-2 per prospect at fully-loaded rates), this is roughly 10-20× cheaper for comparable quality.

## Tools Required

- Existing skills: `linkedin-profile-post-scraper`, `company-funding-search`, `linkedin-job-scraper`, `tech-stack-teardown`, web search
- LLM for opener generation
- Read/Write for CSV in/out

## Trigger Phrases

- "Generate first-lines for this list"
- "Personalize openers for {Campaign}"
- "Add an opener column to the enriched CSV"
- "Write hooks per prospect"
