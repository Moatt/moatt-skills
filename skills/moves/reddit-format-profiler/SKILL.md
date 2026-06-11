---
name: reddit-format-profiler
description: >
  Profile a subreddit's recent posts to learn what format and tone actually work
  there. Clusters posts by type (question, experience report, in-thread reply,
  list/resource, etc.), reads the room, and returns a recommended post format
  plus an encoded tone guide for that sub — so anything you draft reads like a
  native post, not an ad.
tags: [content, research]
---

# Reddit Format Profiler

Every subreddit has its own grammar: what gets posted, what gets upvoted, what
gets removed. **You — the agent — drive this.** Pull a sub's recent posts, group
them by format, infer the tone, and output a concrete recommendation. The method
is repeatable across any sub.

## Setup — install the dependency first

This skill **calls `reddit-post-finder`'s script** for its pulls, so that skill
must be present in the box (`requires_skills` does NOT auto-install it):

```
installOrUpdateSkill({ slug: "reddit-post-finder" })   # idempotent
```

## When to use

- "What kind of post works in r/X?" / "How should we post in r/X?"
- Before drafting (feeds `reddit-post-drafter` and `reddit-content-studio`).
- As Step 2 of the `reddit-monitor-loop` play (per-sub format guide).

## Inputs

- **Subreddit** — the sub to profile.
- (optional) **Goal** — what we'd want to post about, so the recommendation is
  tailored (a question vs. an experience report serves different goals).

## Workflow

### Step 1 — Pull the right reads (all-time best + recent winners + baseline)

Use the endpoints that actually teach you the sub (per the brief):

```bash
# Best ever — what has worked in this sub of all time
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --subreddit <sub> --sort top --time all --max-posts 50 --output json
# Recent winners — what's landing NOW; this is what really sets the current tone
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --subreddit <sub> --sort top --time week --max-posts 50 --output json
# What's normal right now (baseline volume/format)
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --subreddit <sub> --sort new --max-posts 30 --output json
```

`top&time=all` shows the all-time winners; recent `top` (or `--sort hot`) shows the
*current* winners and is the strongest tone signal. (Konbini has no Reddit `best`
sort — "recent winners" = recent `top`/`hot`.) Sequential calls, `timeoutMs` 300000.
Tiny sub → widen the recent window to `--time month`.

### Step 2 — Cluster by format

Bucket every post into a format type. The recurring Reddit formats (from the
brief) plus the usual extras:

- **Question** — "What's the best X for Y?", "How do I…?", "Anyone else…?"
- **Experience report** — "I did X for 6 months, here's what happened."
- **In-thread reply** — the value lives in comments, not standalone posts.
- **Resource / list** — "Top N tools for…", guides, roundups.
- **News / launch**, **rant / complaint**, **meme / off-topic** (note these so we
  avoid them).

Count the distribution and note which formats get the **highest engagement**
(upvotes + comments), not just which are most common.

### Step 3 — Encode the tone

Read 8–12 of the higher-engagement posts and distill the sub's voice into a short
tone guide:

- **Register** — casual / technical / candid / formal?
- **Length** — short punchy vs. long-form?
- **What's rewarded** — concrete numbers? vulnerability? expertise? humor?
- **What's punished** — marketing language, CTAs, vague advice, self-promo?
- **Signature patterns** — TL;DRs, specific openers, formatting habits.

## Output

```markdown
## r/<sub> — format profile

**Format distribution (last month):**
- Experience report: 38% (highest engagement)
- Question: 31%
- Resource/list: 14%
- Rant: 11% · Other: 6%

**Recommended format:** Experience report.
**Why:** these consistently top the sub; the community rewards "I tried X, here's
the real result" over advice or tool drops.

**Tone guide:**
- Candid, anti-marketing, numbers-forward. First person.
- ~200–400 words. Lead with the concrete result.
- No CTA, no links in the body. Self-promo gets downvoted/removed.
- A TL;DR at the bottom is common and welcomed.

**Avoid:** anything that reads like a press release; bare tool recommendations
with no story; em-dash-heavy AI phrasing.
```

This profile is the direct input to `reddit-post-drafter`. Cache it (e.g.
`/workspace/home/projects/reddit/profiles/<sub>.md`) so drafting can reuse it.

## Cost

- One or two `reddit-post-finder` calls per sub. Clustering/tone work is free.

## Dependencies

- `reddit-post-finder` (the data pull).
