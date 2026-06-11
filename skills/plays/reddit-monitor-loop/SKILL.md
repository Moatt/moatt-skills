---
name: reddit-monitor-loop
description: >
  Monitor a set of subreddits on a schedule: pull the newest posts, rank them by
  real relevance to the ICP (semantic, not keyword), and surface the handful
  worth replying to — plus a per-sub format guide. Designed to run as a recurring
  Box agent (roughly hourly, tuned to each sub's activity). Chains
  reddit-post-finder, reddit-post-reranker, and reddit-format-profiler.
tags: [monitoring, research]
---

# Reddit Monitor Loop

Monitoring in practice = pulling posts continuously and filtering hard. This play
turns a confirmed subreddit shortlist into an ongoing watch that emits a ranked
"reply-worthy" queue. **Runs best as a scheduled Box agent.**

## Setup — install the chain

Install the skills this play runs before the first pass (idempotent;
`requires_skills` does not auto-install):

```
installOrUpdateSkill({ slug: "reddit-post-finder" })     # pulls the 'new' feed (has the script)
installOrUpdateSkill({ slug: "reddit-post-reranker" })   # relevance ranking (reasoning)
installOrUpdateSkill({ slug: "reddit-format-profiler" }) # per-sub format/tone
```

## When to Use

- "Monitor r/X and r/Y for posts relevant to <ICP>."
- "Watch these subs and tell me what's worth replying to."
- Stage 2–3 of the `reddit-growth-engine` moat, after discovery is approved.

## Inputs

- **Subreddits** — the approved shortlist (from `reddit-subreddit-discovery`).
- **ICP / intent** — what makes a post worth replying to, in plain language. This
  is the reranking target. Not a keyword list — a description of the pain/question
  our ICP has. (The brief's warning: keyword matching is bad. "Wise" also means
  *wise*; monitor against the ICP, e.g. "people about to sit tech interviews".)
- **Cadence** — default ~hourly; tune per sub activity.
- **Capacity** — how many accounts the user has + how much time. This sets how many
  posts to surface: **there is no fixed target number — relevance decides, scaled to
  capacity.** One account + little time ⇒ surface only the *really, really* relevant
  ones; more accounts + more time ⇒ also surface the longer tail. Ask if unknown.
- **Delivery** (optional) — where the queue should land: chat/workspace, or pushed
  to a **Google Sheet / Notion via Composio** (see Step 4).

## One monitoring pass

### Step 1 — Pull the newest posts

For each sub, pull the `new` feed (freshness is the point — you want posts while
people are still reading them):

```bash
python3 $HOME/skills/moves/reddit-post-finder/scripts/search_reddit.py \
  --subreddit <sub> --sort new --max-posts 100 --output json
```

- Set `boxExec` `timeoutMs` to `300000` (Konbini is a fast live fetch, but
  paginating several subs adds up).
- Run subs **sequentially**, never parallelized in one shell.
- The goal is to reply to **posts**, not comments — monitor posts. (Comments come
  along for context but aren't the target.)

### Step 2 — Rerank by relevance

Run **`reddit-post-reranker`** over the pulled posts against the ICP/intent. It
scores each 0–1 on semantic relevance and drops keyword false-positives.

- **No fixed count — relevance + capacity decide how many surface.** Tight capacity
  (one account, little time) ⇒ raise the bar, surface only the top few; more
  capacity ⇒ extend further down the ranking.
- **Noisy subs** (a post every few minutes) → keep only high scores (0.8+).
- **Quiet subs** → lower the threshold and review case by case.

### Step 3 — Format guide per sub (first pass / refresh weekly)

Run **`reddit-format-profiler`** per sub to attach the recommended post/reply
format + tone. Cache it; refresh weekly, not every run.

### Step 4 — Emit the queue

Output a ranked reply-worthy queue: post title, URL, sub, relevance, one-line
why, and the sub's tone note. This feeds `reddit-content-studio` (reply drafting).

**Land it somewhere usable.** Beyond chat/workspace, offer to push the queue to a
**Google Sheet or Notion via Composio** (we have those integrations) — agencies and
busy operators want the queue in their own tooling, not buried in a chat log. Use
the connected Composio toolkit (Sheets / Notion) to append the rows; if none is
connected, say so and fall back to the workspace file.

## Running it on a schedule (Box agent)

- Create a scheduled Box agent whose prompt is this play, with the subreddit list
  + ICP baked in. Cadence ~hourly (the platform minimum is ~10 min; hourly is the
  brief's recommendation, tuned down for noisy subs and up for quiet ones).
- Each run writes the queue to the workspace (e.g.
  `/workspace/home/projects/reddit/queue/<date-hour>.json`) and/or the drafts
  store, so the user reviews a rolling queue rather than re-running manually.
- Keep `--max-posts` modest to control KonbiniAPI cost (one credit per 100-post page).

## Human Checkpoints

- The queue is a **suggestion list**. A human decides what to engage with;
  nothing is posted automatically (see `reddit-content-studio`).

## Tools Required

- `reddit-post-finder` (pull `new`)
- `reddit-post-reranker` (relevance ranking)
- `reddit-format-profiler` (per-sub format/tone)

## Cost

- One `reddit-post-finder` call per sub per run — one Konbini credit (~$0.002) per
  100-post page. Ranking + profiling are free reasoning. Watch frequency × subs × cost.

## Trigger Phrases

- "Monitor these subreddits for relevant posts"
- "What's worth replying to in r/X today?"
- "Set up an hourly Reddit watch for <ICP>"
