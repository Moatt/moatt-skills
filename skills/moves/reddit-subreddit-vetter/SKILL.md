---
name: reddit-subreddit-vetter
description: >
  Vet a list of candidate subreddits to decide which are worth being active in.
  For each sub, pulls the `new` feed (via reddit-post-finder), estimates how
  active it is, reads recent posts to confirm it's actually on-topic, and judges
  whether it's usable for promotion (can you plug a brand into an answer, or tell
  a story?) — not just hiring noise or off-topic chatter. Returns a ranked,
  vetted shortlist with a per-sub verdict and topic clusters.
tags: [research, monitoring]
---

# Reddit Subreddit Vetter

You have a list of *candidate* subreddits (usually from `reddit-post-finder`'s
ranked mention counts). This skill decides which ones are actually worth the
effort. **You — the agent — drive the whole flow.** The only data pull is via
the existing `reddit-post-finder` script; everything else is your judgment.

A subreddit can show up in mention counts and still be useless: it might be
hiring-only, off-topic, dead, or hostile to anything that smells commercial.
The point of vetting is to separate "real community on our topic where a helpful
brand mention fits" from "noise."

## Setup — install the dependency first

This skill **calls `reddit-post-finder`'s script** (`search_reddit.py`) for its data
pulls, so that skill must be present in the box. `requires_skills` does NOT
auto-install it. Before running any pull below, ensure it's installed:

```
installOrUpdateSkill({ slug: "reddit-post-finder" })   # idempotent; no-op if present
```

(Confirm the script exists at `skills/reddit-post-finder/scripts/search_reddit.py`;
if not, install it.)

## When to use

- After `reddit-post-finder --output subreddit-counts` returns candidates.
- "Are these subreddits any good?" / "Which of these should we actually monitor?"
- As Step 2 of the `reddit-subreddit-discovery` play.

## Inputs

- **Candidate subreddits** — names (the output of discovery).
- **ICP / topic** — one or two sentences describing who we're trying to reach and
  what they care about. Used to judge topical fit. If absent, ask, or read the
  project brain (`/workspace/home/.moatt-*` / context files).
- **Goal** (optional) — brand authority vs. early-stage first-conversions. Shifts
  how strict you are on "usable for promotion."

## Workflow

### Step 1 — Pull the `new` feed per candidate

For each candidate sub, pull its most recent posts:

```bash
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --subreddit <sub> --sort new --content posts --max-posts 50 --output json
```

Run these **sequentially**, not in parallel (the actor is live and parallel runs
hit the box timeout). Set the `boxExec` `timeoutMs` to `300000`. Tiny subs return
little on `--sort new`; if you get <5 items, also try `--sort top --time month`.

### Step 2 — Estimate activity (the "is it big enough?" gate)

The brief's rough guide is **~10,000 weekly visitors minimum** — below that it
rarely pays off. We can't read "weekly visitors" directly, so use proxies:

- **Post velocity** — from the `new` feed timestamps, compute posts/day. A sub
  with multiple posts per day clears the bar; one with a post every few days is
  borderline; one whose newest post is weeks old is effectively dead.
- **Optional subscriber/active count** — fetch the public about page (free, no
  actor; may be rate-limited, so do it once per sub and don't retry hard):
  ```bash
  curl -sA "moatt-vetter/1.0" "https://www.reddit.com/r/<sub>/about.json" \
    | head -c 4000
  ```
  Read `data.subscribers` and `data.active_user_count`. Treat these as a sanity
  check on velocity, not a hard threshold (a 2M-subscriber sub with one relevant
  post a week is still weak for our topic).

Classify each sub's activity: **high / medium / low / dead**.

### Step 3 — Confirm the topic and judge promotion-usability

Read the recent posts. Answer two questions per sub:

1. **Is it on our topic?** Does the actual content match the ICP/topic, or did the
   brand just get name-dropped once? A sub can match a keyword and be about
   something else entirely.
2. **Is it usable for promotion?** This is the real question. Can you imagine
   either:
   - plugging the brand naturally into a comment on a question that gets asked
     here, **or**
   - telling a genuine story/experience-report that features the brand?

   Flag the common dead-ends:
   - **hiring-only** ("[Hiring]" / "[For Hire]" posts dominate) → skip.
   - **strict no-promotion / no-self-promo rules** → flag as risky; intervention
     must be purely helpful with disclosure, or avoid.
   - **pure memes / off-topic banter** → low value even if "active."

### Step 4 — Cluster the topics (nice-to-have)

From the posts you read, name the 3–6 recurring topics/question-types in each
worthwhile sub (e.g., "tool recommendations", "pricing complaints", "how-do-I").
This feeds post-format selection downstream and tells the user what to expect.

## Output

A ranked table, best candidates first, plus a one-line verdict each:

```
| Subreddit | Activity | On-topic | Promotion-usable | Verdict | Top topics |
|-----------|----------|----------|------------------|---------|------------|
| r/freelance | high (8 posts/day, 2.1M subs) | yes | yes — Q&A about getting paid | KEEP — gold | late payments, client horror stories, rate-setting |
| r/forhire | high | partial | no — hiring board | SKIP | gigs, [Hiring], [For Hire] |
| r/smallbiz | medium | yes | risky — no-promo rule | WATCH | invoicing, taxes, tools |
```

Close with a short recommendation: which 2–3 are the likely "gold" subs (the
brief's note: ~10 subs per client, usually 2–3 are gold), and which to drop.

## Honesty guardrails

- Never recommend astroturfing, vote manipulation, or fake accounts. "Usable for
  promotion" means a real, disclosed, genuinely-helpful contribution.
- If a sub's rules forbid commercial mentions, say so plainly and mark it risky.

## Cost

- Reddit pulls: one `reddit-post-finder` call per candidate (~$3/1k results;
  50 posts/sub is cheap). `about.json` is free.
- All judgment is your reasoning — no extra spend.

## Dependencies

- `reddit-post-finder` (the data pull).
- `curl` in the Box (for the optional about.json check).
