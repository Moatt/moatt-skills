---
name: reddit-subreddit-discovery
description: >
  Go from a company (name or site) to a vetted shortlist of subreddits worth
  being active in. Follows the chain Product → ICP → subreddits: confirms which
  ICP to target now, finds candidate subs via brand, competitor, and keyword
  search on Reddit, then vets each for activity, topic fit, and whether it's
  usable for promotion. Chains reddit-post-finder and reddit-subreddit-vetter.
tags: [research, monitoring]
---

# Reddit Subreddit Discovery

The first half of any Reddit motion. Input is a company; output is a ranked,
vetted shortlist of subreddits with a verdict on each. Everything follows one
chain:

> **Product → ICP → subreddits.**

## Setup — install the chain

This play orchestrates several skills; `requires_skills` does not auto-install
them. Install what you'll run before starting (idempotent):

```
installOrUpdateSkill({ slug: "reddit-post-finder" })       # data pulls (has the script)
installOrUpdateSkill({ slug: "reddit-subreddit-vetter" })  # vetting
installOrUpdateSkill({ slug: "icp-identification" })        # if ICP isn't on file
```

## When to Use

- "Which subreddits should we be active in?"
- "Find the right Reddit communities for <company>."
- "Where on Reddit is <product / our space> discussed?"
- As Stage 0–1 of the `reddit-growth-engine` moat.

## Phase 0 — Product → ICP (pick what matters now)

There's a function from all available context to the products/ICPs; the real signal
is the user. A company may have several products and ICPs and want Reddit for only
one right now.

1. **Read the brain first and show you know their products — fast.** Onboarding
   usually already wrote the products, ICPs, and competitors to the project
   (context files / `/workspace/home`). Reuse it: briefly restate what they do so
   they feel understood (you can't help them if you don't know them), but don't
   burn the turn re-researching what's already known.
2. **Clarify which *product* — a separate axis from the ICP.** Is this push for a
   **current product or a new one** (companies prioritise products or test new ones)?
   Ask via `askUserQuestion` when the brief hasn't said — but if the brief already
   states it (e.g. "our current contractor product"), take that answer and move on;
   do NOT re-ask what's already answered or stall waiting on it. If the ICP isn't on
   file (e.g. a brand-new product), run **`icp-identification`** to define it.
3. **Confirm which ICP is the Reddit focus right now**, and the goal. Reddit is a
   problem-centered platform: established brands here usually pursue **brand
   authority** or **SEO/AEO**, not conversions (better channels exist for
   converting). The exception is very early-stage startups, where Reddit can be the
   best channel for first conversions — surface this so the user picks the right
   ICP and goal. (You can fold the product + ICP/goal confirmation into one
   `askUserQuestion` to avoid extra round-trips.)

Lock: **one product (current or new) + one ICP + a goal (authority / first-conversions / SEO-AEO).**

## Phase 1 — Find candidate subreddits

Pick the path(s) that fit the situation (often several at once):

| Situation | Path |
|---|---|
| Company well-known + discussed on Reddit (Deel, Stripe) | **Brand search** — search the name; see where it keeps coming up. |
| Company well-known, the *space* is discussed | **Keyword search** — search the industry term ("payroll", "EOR"). |
| Well-known but barely on Reddit | **Competitor search** — search bigger competitors; see where they're mentioned. |
| Early-stage, absent from Reddit | **Competitor + keyword walk** — start from larger competitors and topic words, work back to the communities. |
| Early-stage, brand-new space | **Deeper keyword research** — broaden terms, follow related subs. |

> **Early-stage stance:** we don't handle posting — assume the user has one or
> several accounts to market from, and **don't assume low karma** (early-stage ≠
> weak accounts). Advise **explicit transparency** (a founder-voice disclosure,
> "I'm the founder of X and I think this helps your problem"), never covert/volume
> astroturfing — that breaks Reddit's ToS and we don't push it.

Use **`reddit-post-finder`** with global search and ranked counts — don't guess a
sub list and scrape each:

```bash
python3 $HOME/skills/moves/reddit-post-finder/scripts/search_reddit.py \
  --query "Deel contractor" --max-posts 150 --time year --output subreddit-counts
```

- **Common-word brands REQUIRE disambiguation — a single query is not enough.**
  "Deel" is Dutch for "part"; "Wise" is an adjective. You MUST run at least 2–3
  specific phrases (`"Deel payroll"`, `"Deel EOR"`, `"Deel contractor"`) as
  **separate** `--query` calls and merge the count tables. One combined query
  ("Deel contractor freelancer") does not disambiguate and fails this step.
- Run brand / competitor / keyword queries as separate calls; merge into one
  candidate list ranked by mention count.

## Phase 2 — Vet the candidates

Run **`reddit-subreddit-vetter`** on the top candidates. It reads each sub's
Konbini **subreddit-info** (members, `published` age, rules) and pulls its `new`
feed, estimates activity (rough guide: **~5k weekly is enough to try** / healthy
post velocity), confirms the topic, and judges **usable for promotion** from the
rules + brand mentions in post bodies + the sub's age — flagging hiring-only
boards, no-promo subs, and dead subs. For an SEO/AEO goal it weights toward old /
category-leader subs.

## Phase 3 — Shortlist + checkpoint

Present the vetted shortlist (best first): per sub → activity, topic fit,
promotion-usability, verdict (KEEP / WATCH / SKIP), top topics. Note the likely
**2–3 "gold" subs** (the brief: ~10 subs/client, usually 2–3 are gold).

**Human checkpoint:** ask the user to confirm which subs to monitor before moving
on to `reddit-monitor-loop`.

## Tools Required

- `icp-identification` (define ICP if not on file)
- `reddit-post-finder` (candidate discovery)
- `reddit-subreddit-vetter` (vetting)

## Output

- A ranked, vetted subreddit shortlist with per-sub verdicts and topic clusters.
- The locked ICP + goal, carried forward to monitoring and content.

## Trigger Phrases

- "Which subreddits should we target?"
- "Find Reddit communities for <company>"
- "Where is <space> discussed on Reddit?"
