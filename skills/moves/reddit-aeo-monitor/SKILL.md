---
name: reddit-aeo-monitor
description: >
  Monitor Reddit for threads where AI search engines (ChatGPT,
  Perplexity, Google AI Mode) are likely to retrieve answers
  about a brand or category. Surfaces threads that are ranking
  in Reddit search and drawing AI-citation traffic, identifies
  the top answer's content + author, and recommends interventions
  (engaging in the thread, creating canonical content elsewhere,
  fixing brand-mention sentiment).
tags: [seo, research]
---

# Reddit AEO Monitor

AI search engines lean heavily on Reddit for retrieval — when ChatGPT, Perplexity, or Google AI Mode answer category questions, a Reddit thread is often in the top citations. The thread that ranks shapes how millions of people are told about your category. This skill watches Reddit for those high-AI-leverage threads about your brand or category and recommends interventions.

**Built for:** Brand marketing, content, and SEO teams that have started seeing AI-overview citation traffic and want to influence the Reddit threads behind those citations.

## When to Use

- "Monitor Reddit for {brand} mentions in AI-citation context"
- "Find Reddit threads being cited in AI Overviews about {category}"
- "Run the Reddit AEO scan"
- "Which {category} subreddit threads are ranking for AI retrieval"

## What this skill is and isn't

**Is:** A monitor that surfaces high-leverage Reddit threads, scores them for AI-retrieval likelihood, analyzes the top answer's content, and recommends interventions.

**Is not:** A bot that posts on Reddit. Anything posted on Reddit must be a real human contribution; bot detection is aggressive and the credibility hit from being caught is severe.

**vs `reddit-serp-tracker`:** that move is the *raw measurement* layer — exact Google positions and which AI engines cite which Reddit URLs (via DataForSEO). This skill is the *intervention* layer — it scores threads for leverage and recommends what to do. In the `reddit-visibility-tracker` play they run together: serp-tracker measures, this skill decides. Don't duplicate the measurement here.

## What makes a Reddit thread AI-retrieval-likely

| Signal | Why |
|---|---|
| **High Reddit search rank for category keyword** | AI engines retrieve from Reddit's top results |
| **Top answer with high upvotes** (≥50) | Ranking signal within the thread |
| **Direct question structure in title** | "What's the best X" / "X vs Y" / "How do I" |
| **Recent activity (≤90 days)** | AI engines weight recency |
| **Author has high karma** | Higher-trust contributor signal |
| **Cited externally by other sites** | Inbound signal |
| **Thread linked from your brand's organic pages or backlinks** | The thread is connected to your topical graph |

## Inputs

Required:
- **Brand or category keywords** to monitor — e.g., `["our brand name", "competitor names", "category keywords"]`
- **Subreddits** — relevant communities (`r/SaaS`, `r/marketing`, `r/devops`, `r/{specific industry}`)

Optional:
- **AI engine query bank** — specific queries you want to track ("What's the best X for Y?") so the skill can verify whether your monitored threads are actually being cited
- **Cadence** — `daily` / `weekly`. Default: weekly.

## Workflow

### Step 1 — Pull recent threads matching keywords

For each (subreddit, keyword) pair:

1. Use Reddit search (free API or via existing `reddit-post-finder` skill) for keyword in subreddit, sort by `relevance` and `top` from last 90 days
2. Pull thread metadata: title, URL, author, score, comment count, creation date
3. Filter to threads with ≥10 comments and ≥10 upvotes (signal floor)

### Step 2 — Pull top answer per thread

For each thread:
- Fetch the comment tree
- Identify the top-scoring comment (highest upvotes, marked top by Reddit's sort)
- Capture: comment author, comment body, comment score, depth (top-level answer vs. nested)

### Step 3 — Score AI-retrieval likelihood per thread

Composite score 0-100:

```
score = (reddit_search_rank_signal × 25) +    // is this the top result for the keyword?
        (top_answer_upvotes_normalized × 25) +
        (title_question_structure × 15) +
        (recency_bonus × 15) +                 // recent threads cited more
        (author_karma_normalized × 10) +
        (external_citation_count × 10)
```

Tier:
- **High (≥70):** Likely already being cited; intervene proactively
- **Medium (40-69):** Watching it grow; monitor for intervention triggers
- **Low (<40):** Background noise

### Step 4 — Analyze the top answer

For each high-tier thread, the skill summarizes:

- What does the top answer recommend? (What product / approach / etc.)
- Is your brand mentioned? Positive / neutral / negative?
- Are competitors mentioned? Positive / neutral / negative?
- What evidence does the answer cite? (links, customer stories, specific features)
- What's missing or wrong?

### Step 5 — Verify AI citation (optional, if query bank provided)

For each query in the bank, run it against ChatGPT / Perplexity / Google AI Mode (via API where possible) and capture the citations. Cross-reference against monitored threads:

- Threads being cited: confirmed AI-leverage threads
- Threads not being cited despite high score: may not be in the AI retrieval set yet

This verification step is the strongest signal but requires AI-engine API access (some are free-tier, some are paid).

### Step 6 — Recommend interventions

For each high-tier thread, the skill suggests an intervention type:

#### Intervention A: Engage in the thread (highest leverage when applicable)
When the top answer has factual errors about your brand or category:
- Recommended: a long, helpful, non-promotional answer that corrects the error and adds genuine context
- The author should be a real employee with a real Reddit history (not a fresh account)
- Disclosure: must include a transparent "I work at {brand}" disclosure if mentioning your brand
- The skill drafts the answer; a real human posts it after personal review

#### Intervention B: Create canonical content elsewhere
When the thread itself is fine but your brand has no good public answer to the question:
- Recommended: a thorough blog post / docs page / G2 review answering the same question with stronger evidence
- The post becomes the "primary source" the AI engines start citing alongside or instead of the Reddit thread

#### Intervention C: Fix factual misinformation
When the top answer is factually wrong about your product (pricing, features, capabilities):
- Recommended: gentle correction in-thread (with disclosure), plus a public-facing canonical page for AI engines to find

#### Intervention D: Just monitor
When the thread is positive about your brand or neutral and accurate:
- Don't intervene; let it work for you. Continue tracking score over time.

#### Intervention E: Create new thread (sparingly)
When a relevant question has no Reddit thread:
- A real employee asks a genuine question or shares a learning in the relevant subreddit
- Never astroturf; the question / share must be real

### Step 7 — Output

```markdown
## Reddit AEO Scan — {date}

**Subreddits monitored:** {N}
**Keywords:** {N}
**Threads scored:** {M}
**High-leverage threads:** {K}

---

### High-leverage threads (score ≥70)

#### "{Thread title}" — r/{subreddit}
- **Score:** {N}/100
- **Posted:** {date}, {age_days} days ago
- **Top answer:** {top_score} upvotes, by {author} ({karma} karma)
- **Top answer summary:** {1-2 sentence summary}
- **Brand mention:** {yes — neutral | yes — positive | yes — negative | no}
- **Competitor mention:** {if applicable}
- **AI citation status:** {confirmed cited in {engines} | likely cited | unknown}
- **Recommended intervention:** {A — engage / B — canonical content / C — correction / D — monitor / E — new thread}
- **Specific action:** {1-3 sentence action description}
- **URL:** {Reddit link}

#### Next thread...

---

### Threads to watch (score 40-69)
{condensed table}

---

### Verified AI citations (if query bank provided)
| AI engine | Query | Cited threads | Action |
|---|---|---|---|
| ChatGPT | "best X for Y" | {3 threads listed} | Monitor |
| Perplexity | "X vs Z" | {1 thread, neutral} | Improve canonical content |
| Google AI Mode | "alternatives to X" | {2 threads, one negative} | Address in-thread |

---

### Output files
- `aeo-scan-{date}.md` — this report
- `aeo-scan-{date}.csv` — per-thread data
- `intervention-drafts/{thread-id}.md` — draft answers / canonical content briefs for the recommended interventions
```

## Honesty + Compliance Guardrails

- **No bot accounts.** Every Reddit interaction must be from a real human with a real Reddit history. Detection is aggressive; the consequences (subreddit ban, brand reputation hit) outweigh any short-term gain.
- **Always disclose affiliation.** "I work at {brand}" must appear in any post that mentions the brand. Reddit's rules + most subreddit rules require this.
- **Don't manipulate votes.** Vote brigading is bannable.
- **Don't recycle drafts across multiple accounts.** One employee, one voice.
- **Don't intervene in every thread.** Most threads should be left alone. Over-engagement looks like astroturfing; under-engagement only when warranted is credible.

## Edge Cases

- **Top answer recommends your brand positively** — flag with `intervention: D — monitor`. Resist the urge to "amplify"; visible promotion drops credibility.
- **Subreddit has strict no-promotion rules** — many subreddits ban any commercial mention. Verify each subreddit's rules before recommending intervention. The skill flags subreddits where intervention is risky.
- **Thread is years old but resurfacing** — old threads cited by AI engines need fresh content alongside (a 2020 answer about your 2025 product is misleading by default). Recommend canonical content creation, not in-thread editing.
- **Brand mentioned negatively with valid reason** — engage with the customer to address; don't argue in-thread.

## Cost

| Component | Cost |
|---|---|
| Reddit search per keyword | Free (Reddit API) |
| Per-thread comment tree fetch | Free |
| Scoring + answer analysis (LLM) | ~$0.02 per thread |
| AI-citation verification (if API access) | ~$0.05 per query |
| Intervention draft generation | ~$0.05 per intervention |
| **Per scan, 50 threads** | **~$2-5** |

## Tools Required

- Reddit API or `reddit-post-finder` (existing) for search + comments
- LLM for scoring + analysis + intervention drafts
- Optional: AI-engine APIs (Perplexity Pro API, OpenAI, etc.) for citation verification
- Optional: Slack webhook for high-leverage thread alerts

## Trigger Phrases

- "Monitor Reddit for {brand} in AI-citation context"
- "Find Reddit threads cited in AI Overviews"
- "Run the Reddit AEO scan"
- "Which {category} subreddit threads are AI-cited"
