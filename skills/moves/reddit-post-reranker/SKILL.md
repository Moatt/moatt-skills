---
name: reddit-post-reranker
description: >
  Rank a set of Reddit posts by how relevant they really are to a target ICP or
  intent — by meaning, not keyword match. Built for monitoring: you pull the
  `new` feed of a sub, then use this to surface the few posts genuinely worth
  replying to and drop the noise. Avoids the keyword traps (e.g. the brand
  "Wise" also just means *wise*) by scoring on semantics. Returns posts ranked
  0–1 with a one-line reason each.
tags: [monitoring, research]
---

# Reddit Post Reranker

Given a list of posts and a description of what you're looking for, rank the
posts by true relevance. **You — the agent — are the reranker.** You read each
post against the intent and assign a calibrated score. No external service, no
script. (If a dedicated reranker like zerank-2 is later wired into the Moatt
proxy, this skill can call it; until then, your judgment is the ranker.)

## Why not keyword matching

Keyword matching is too rigid and produces both false positives and false
negatives:

- **False positives:** a post that says "that's a wise decision" is not about the
  brand *Wise*. "Deel" matches Dutch text. Common-word brands collide constantly.
- **False negatives:** the strongest posts often never name the brand or keyword
  at all — someone describing the exact pain your product solves ("clients keep
  paying me 30 days late") is a perfect reply target and contains none of your
  terms.

So rank on **meaning**: does this post express the situation/pain/question our
ICP has, such that a genuinely helpful reply (that could mention us) fits?

## Inputs

- **Posts** — JSON array from `reddit-post-finder` (each has `title`, `body`,
  `communityName`, `url`, `upVotes`, `numberOfComments`, `createdAt`).
- **Intent / ICP** — what makes a post worth replying to, in plain language.
  e.g. *"freelancers struggling to get paid on time / chasing late invoices —
  we make invoicing + payment reminders easier."* Be specific; vague intent
  produces vague ranking.

## How to score

For each post assign **relevance 0.0–1.0** using this rubric:

| Band | Meaning |
|---|---|
| 0.8–1.0 | Directly expresses the ICP's pain/question; a helpful reply clearly fits. Reply-worthy now. |
| 0.5–0.79 | Adjacent/relevant; a reply could fit but it's a stretch or low-engagement. |
| 0.2–0.49 | Same general topic, but not an opening for us. |
| 0.0–0.19 | Off-topic, or a keyword-only false positive. |

Adjust slightly for **opportunity**, not just topicality: a question with few
answers is a better target than a saturated thread; a fresh post beats a stale
one (people still reading). Engagement counts are a tiebreaker, not the driver.

Do the scoring in one pass over the batch so scores are calibrated against each
other. For large batches (>40), score in chunks but keep the rubric fixed.

## Output

Posts sorted by score descending, noise dropped (default threshold 0.5 — state
it, and let the user lower it for quiet subs where you review case-by-case):

```json
[
  {
    "url": "https://reddit.com/r/freelance/...",
    "title": "Clients keep paying me 30+ days late, how do you handle it?",
    "communityName": "freelance",
    "relevance": 0.92,
    "reason": "Exact ICP pain (late payments); open question, few answers — strong reply target.",
    "upVotes": 48,
    "numberOfComments": 12
  }
]
```

Always keep the `url`. Below the JSON, give a 1–2 line human summary: how many
cleared the threshold, and the single best target.

## Volume guidance (from the monitoring brief)

- **Noisy subs** (a post every few minutes): filter hard — keep only 0.8+.
- **Quiet subs:** lower the threshold and review case by case; with little volume
  the AI can look at each post individually.

## Cost

Free — this is your reasoning over data already pulled.

## Dependencies

- `reddit-post-finder` (produces the posts you rank).
