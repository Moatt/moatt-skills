---
name: objection-library-rag
description: >
  Build and query a retrieval-augmented objection library from past
  winning sales-call transcripts. Indexes objections by type, with
  the verbatim winning response, the rep who said it, the deal it
  closed, and the contextual setup. Reps can query in real-time:
  "what's the best response when a CFO says X?" and get the actual
  language that's worked, grounded in real wins.
tags: [outreach]
---

# Objection Library RAG

Generic objection-handling guides ("when they say price, talk about value!") are useless under pressure. What works is the specific language that's actually closed deals — words your top reps used in moments that converted. This skill indexes those moments from call recordings and serves them back on-demand.

**Built for:** Sales teams with 6+ months of call recordings (Gong, Chorus, ZoomInfo Engage, or transcripts) who want to extract their own institutional knowledge into a queryable system rather than relying on tribal memory.

## When to Use

- "How do we handle price objections from CFOs?"
- "Pull winning responses to {objection type}"
- "Build the objection library from last 90 days of calls"
- "What did {top rep} say when {prospect type} pushed back on {topic}?"

## What gets indexed

Each entry in the library contains:

```json
{
  "id": "<unique id>",
  "objection_text": "<verbatim what the prospect said>",
  "objection_type": "price | feature_gap | timing | no_need | competitor | security | authority | other",
  "objection_subtype": "<finer classification>",
  "response_text": "<verbatim what the rep said>",
  "context_setup": "<the 2-3 turns of conversation leading up to the objection>",
  "follow_through": "<the prospect's next reply, to verify the response actually worked>",
  "outcome": "deal_closed | meeting_advanced | stalled | declined",
  "rep_name": "",
  "deal_size": 0,
  "prospect_role": "",
  "prospect_company_size": "",
  "prospect_vertical": "",
  "deal_close_date": "",
  "notes": "<LLM-extracted observations on why this response worked>"
}
```

The library grows over time. As more calls are recorded and tagged, the library deepens. The retrieval gets sharper.

## Inputs

Required:
- **Call transcripts source** — Gong / Chorus / ZoomInfo Engage / any standard transcript format
- **CRM data per call** — the deal record so the skill can tag objection responses with the eventual outcome (only `deal_closed` and `meeting_advanced` outcomes seed the library; `stalled` and `declined` are filtered out)

Optional but improves quality:
- **Top-rep designation** — who's the highest-converting rep per segment (filters the library to "winning patterns" first)
- **Vertical / segment metadata** per deal
- **Battlecards or positioning docs** — for the LLM to ground the "why this worked" notes

## Workflow — Indexing (one-time + ongoing)

### Step 1 — Identify objection moments in transcripts

For each call transcript:

1. Run an LLM pass to detect objection moments. The signal: prospect uses phrases that match objection patterns (price, timing, etc.) AND the rep responds with a substantive answer (not just "got it" / "let me follow up").
2. Extract the objection text, the rep's response, the 2-3 turns before (context_setup), and the prospect's next reply (follow_through).
3. Tag each moment with deal outcome from CRM.

### Step 2 — Filter to winning responses only

Keep only objection moments where:
- Deal eventually closed-won, OR
- Deal advanced to next stage with a positive next-action booked

Drop moments from stalled or lost deals — they teach the wrong lessons.

### Step 3 — Classify objection type

Use the same taxonomy as `ai-objection-branch-emailer`:
- `price`, `feature_gap`, `timing`, `no_need`, `competitor`, `security`, `authority`, `other`

Plus subtypes for finer retrieval:
- price → `cheaper_alternative`, `over_budget`, `seat_count_too_high`, `total_cost_unclear`
- feature_gap → `missing_specific_feature`, `incomplete_integration`, `scale_limit`
- competitor → `already_using_X`, `evaluated_us_before`, `enterprise_brand_preference`
- (etc.)

### Step 4 — Annotate with "why this worked"

For each entry, run an LLM pass to extract observations:

```json
{
  "why_it_worked": "Rep acknowledged the price concern explicitly before reframing on payback period; offered a smaller pilot scope as a face-saving alternative.",
  "key_phrase": "Honestly, that math is tight if we go full implementation. What if we ran a 30-day pilot on the {smaller subset} first?",
  "transferability": "high | medium | low — rated by how generalizable the response is across segments"
}
```

### Step 5 — Index for retrieval

Store the library in:
- A vector database (for semantic search) — embedding the `objection_text + context_setup` joint string
- A relational store — for filtering by metadata (objection_type, rep, segment, deal_size)

The retrieval combines both: filter by metadata first, then semantic-rank within the filtered set.

## Workflow — Querying (real-time)

### Step 1 — Parse the query

Reps ask in natural language:
- "How do I handle price objections from a CFO at a 500-person SaaS?"
- "What works when they say they already use {Competitor}?"
- "Best response when timing is bad after a fundraise?"

The skill extracts:
- Objection type
- Prospect profile (role, vertical, size)
- Specific subtype if mentioned

### Step 2 — Retrieve top matches

Filter the library to matches on objection_type + (optionally) prospect profile. Semantic-rank by similarity to the query. Return top 5.

### Step 3 — Surface the responses

```markdown
## Top responses for: "Price objection from CFO at 500-person SaaS"

(Filtered to: objection_type=price, prospect_role=CFO, prospect_size=mid-market.
 5 matching wins from the last 12 months.)

### #1 — Rep: Sara K. — Deal: Acme ($120K) — closed 2025-11

**Setup:**
> [Sara]: "We're typically a 12-month commit at $120K all-in for the package."
> [Prospect CFO]: "That's about 2× what we'd budgeted. Honestly that math is tight."

**Sara's response:**
> "Honestly, that math is tight if we go full implementation. What if we
> ran a 30-day pilot on the {smaller subset} first? You'd see the payback
> math against your specific numbers before any full commit. Worst case,
> we walk away after 30 days and you've spent $8K on the pilot, which is
> closer to where you'd budgeted."

**Prospect's reply:**
> "OK that's interesting. Walk me through what the pilot scope would
> look like."

**Why this worked (LLM annotation):**
- Acknowledged the price concern in the prospect's own language ("that math is tight")
- Reframed on smaller scope rather than discounting the full price
- Quantified the worst case explicitly — removed the perceived risk
- Did not negotiate against the list price

### #2 — Rep: Marcus B. — Deal: Beta Co ($90K) — closed 2025-09
... (similar structure)

### #3...
```

### Step 4 — Synthesize a recommended response (optional)

If the rep asks "synthesize the best response for my situation," the skill produces a tailored response drawing on patterns across the top 3-5 matches:

```
**Synthesized response (drawing on Sara K., Marcus B., and Alex P.'s patterns):**

"That's fair — the full annual is a stretch against the budget you set.
Three of our customers in your size range started with a {smaller scope}
pilot for {N} days; the math typically clears the bar within {timeframe}.
Want to walk through what that pilot would look like for {their company}
specifically?"

**Caveat:** This is a synthesis, not a verbatim past response. The
verbatim wins above will land more naturally if you can pattern-match
to one of them.
```

## Library Maintenance

### Quarterly refresh
- Re-run the indexing on the prior quarter's calls
- Drop stale entries (>18 months old, where pricing/features have changed)
- Re-classify entries if the objection taxonomy has evolved

### Quality decay watch
- If a previously-winning response stops working (subsequent calls citing the same response with worse outcomes), demote it
- If new objection types emerge (e.g., "AI-driven" objections that didn't exist 2 years ago), flag for human classification

## Output formats

| Use case | Output |
|---|---|
| Real-time pre-call query | Markdown brief, returned to the rep's tool of choice |
| Battlecard generation | JSON of top objection-responses per category, fed into `battlecard-generator` |
| New rep onboarding | Curated library of top 20 responses across all categories |
| Coaching | Individual rep's library — what they've personally said vs. what top reps said |

## Edge Cases

- **Library is too small** (<50 entries) — retrieval will be unreliable. Flag this; recommend using the library with caution and supplementing with manual coaching until N grows.
- **Top reps' wins are over-represented** — library skews to one rep's voice. Diversify by capping per-rep contribution at ~30% of any single category.
- **Industry-specific language doesn't transfer** — what closes in healthcare doesn't always close in fintech. The vertical filter handles this; reps querying without vertical context get a "filter narrower for better results" note.
- **Wins from very old deals** — pricing, features, competitors may have shifted. Auto-decay weight on entries >12 months old; flag in retrieval.
- **The "best" response was actually outcome-incidental** — the deal closed for reasons unrelated to that specific objection-handling moment. Manual review of high-impact entries to confirm the response is actually causal.

## Cost

| Component | Cost |
|---|---|
| Indexing (one-time per quarter) | ~$0.50 per call transcript |
| Per-query retrieval | ~$0.005 |
| Synthesis (when requested) | ~$0.02 |
| **One-time index of 500 calls** | **~$250** |
| **Per-query** | **~$0.005** |

The skill amortizes well: high upfront indexing cost, near-free queries forever after.

## Tools Required

- LLM for objection detection, classification, and annotation
- Vector database (Pinecone, Upstash Vector, or local) for semantic search
- Read access to call transcripts (Gong / Chorus / etc.)
- CRM data for outcome tagging
- Optional: integration with the rep's pre-call tool (Slack, Notion, CRM) for delivery

## Trigger Phrases

- "How do we handle {objection} from {role}?"
- "Pull winning responses to {objection type}"
- "Build the objection library"
- "What did {rep} say when {prospect type} pushed back?"
