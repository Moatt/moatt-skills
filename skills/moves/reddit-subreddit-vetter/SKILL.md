---
name: reddit-subreddit-vetter
description: >
  Vet a list of candidate subreddits to decide which are worth being active in.
  For each sub, reads Konbini subreddit-info (members, age, rules), pulls the
  `new` feed to gauge activity and confirm topic, and judges whether it's usable
  for promotion (rules + brand mentions in post bodies + sub age) — not just
  hiring noise or off-topic chatter. Weights toward old / category-leader subs
  when the goal is SEO/AEO. Returns a ranked, vetted shortlist with a per-sub
  verdict and topic clusters.
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
- **Goal** (optional) — brand authority, early-stage first-conversions, or
  **SEO/AEO** (ranking + AI citations). Shifts how strict you are on "usable for
  promotion" and whether you weight toward old / category-leader subs (Step 3b).

## Workflow

### Step 1 — Pull the `new` feed per candidate

For each candidate sub, pull its most recent posts:

```bash
python3 skills/reddit-post-finder/scripts/search_reddit.py \
  --subreddit <sub> --sort new --max-posts 50 --output json
```

Run these **sequentially**, not in parallel (live data; parallel pulls in one
shell hit the box timeout). Set the `boxExec` `timeoutMs` to `300000`. Tiny subs
return little on `--sort new`; if you get <5 items, also try `--sort top --time month`.

### Step 2 — Read the subreddit's info + estimate activity (the "is it worth it?" gate)

Konbini exposes a **subreddit-info** endpoint that gives you the three signals the
brief asks for in one cheap call — **size, age, and the rules**:

```bash
curl -s -H "Authorization: Bearer $MOATT_API_KEY" \
  "$MOATT_API_BASE/v1/proxy/konbini/v1/reddit/subreddits/<sub>"
```

From `data`, read:
- **`memberCount`** — subscriber size.
- **`published`** — the subreddit's **creation date** → its **age** (see Step 3 — age
  predicts how strict the mods are, and old subs are gold for SEO/AEO).
- **`description`** — the full **rules text**. The cheapest promotion-usability read
  there is: rules that ban self-promotion are stated right here.

Then gauge **activity**. The brief's rough guide is **~5,000 weekly is already enough
to try things** — below that it rarely pays off. Combine:

- **Post velocity** — from the `new` feed timestamps, compute posts/day. Multiple
  posts/day clears the bar; a post every few days is borderline; a newest post
  weeks old is effectively dead.
- **`memberCount`** — a sanity check on velocity, not a hard threshold (a
  2M-member sub with one relevant post a week is still weak for our topic).

Classify each sub's activity: **high / medium / low / dead**.

### Step 3 — Confirm the topic and judge promotion-usability

Read the recent posts. Answer two questions per sub:

1. **Is it on our topic?** Does the actual content match the ICP/topic, or did the
   brand just get name-dropped once? A sub can match a keyword and be about
   something else entirely.
2. **Is it usable for promotion?** This is the real question, and it's cheap to
   check from three signals you already have:
   - **The rules** (`description` from Step 2) — do they explicitly ban
     self-promotion / product mentions? (e.g. r/Payroll's rule 2 forbids it.)
   - **Brand mentions in recent post *bodies*** — scan the `new`/`top` post
     content: if members already name products/tools (or share their GitHub /
     a tool they built), promotion is clearly tolerated. Dev and vibecoder
     communities are usually wide open this way.
   - **Age** (`published` from Step 2) — newer subs generally have laxer mods;
     long-established subs have stricter mods who protect the community. Weight
     your verdict accordingly.

   Then judge: can you plug the brand naturally into a comment on a question that
   gets asked here, **or** tell a genuine story/experience-report that features it?

   Flag the common dead-ends:
   - **hiring-only** ("[Hiring]" / "[For Hire]" posts dominate) → skip.
   - **strict no-promotion / no-self-promo rules** (the `description` says so) →
     flag as risky; intervention must be purely helpful with disclosure, or avoid.
   - **pure memes / off-topic banter** → low value even if "active."

### Step 3b — If the goal is SEO/AEO, weight toward old + category-leader subs

When the user's goal is search/AI visibility (not just engagement), bias the
shortlist: **Google favours old subreddits** for Reddit links on the SERP, so
prefer subs with an early `published` date, and go for the **category leaders** —
sometimes one clear leader (r/payroll for payroll), sometimes several for a broad
category (developers). An old, on-topic, category-leader sub beats a newer, livelier
one for ranking and citation goals.

### Step 4 — Cluster the topics (nice-to-have)

From the posts you read, name the 3–6 recurring topics/question-types in each
worthwhile sub (e.g., "tool recommendations", "pricing complaints", "how-do-I").
This feeds post-format selection downstream and tells the user what to expect.

## Output

A ranked table, best candidates first, plus a one-line verdict each:

```
| Subreddit | Activity (members, age) | On-topic | Promotion-usable | Verdict | Top topics |
|-----------|-------------------------|----------|------------------|---------|------------|
| r/freelance | high · 2.1M · est. 2008 | yes | yes — rules allow tool mentions, members name tools in bodies | KEEP — gold | late payments, client horror stories, rate-setting |
| r/forhire | high · 380k · est. 2010 | partial | no — hiring board | SKIP | gigs, [Hiring], [For Hire] |
| r/Payroll | medium · 33k · est. 2008 | yes | risky — rule 2 bans self-promo; value-only + old → good for SEO/AEO | WATCH | invoicing, compliance, tools |
```

Close with a short recommendation: which 2–3 are the likely "gold" subs (the
brief's note: ~10 subs per client, usually 2–3 are gold), and which to drop.

## Honesty guardrails

- Never recommend astroturfing, vote manipulation, or fake accounts. "Usable for
  promotion" means a real, disclosed, genuinely-helpful contribution.
- If a sub's rules forbid commercial mentions, say so plainly and mark it risky.

## Cost

- Per candidate: one subreddit-info call + one `reddit-post-finder` pull — each is
  one Konbini credit (~$0.002), up to 100 posts/page. Cheap.
- All judgment is your reasoning — no extra spend.

## Dependencies

- `reddit-post-finder` (the post pulls).
- `curl` in the Box + `MOATT_API_KEY` / `MOATT_API_BASE` (for the Konbini
  subreddit-info call — same proxy the post pulls use).
