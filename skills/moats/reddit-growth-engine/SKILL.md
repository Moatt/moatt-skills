---
type: playbook
name: reddit-growth-engine
description: Run a full Reddit growth motion — product to ICP to subreddits, then monitor, draft, engage, and measure search + AI visibility
---

# Reddit Growth Engine

Stand up and operate a Reddit motion for a client end to end: define the ICP,
find and vet the right subreddits, monitor them for reply-worthy posts, draft
community-native posts and replies, and measure the payoff on Google and in AI
answers. Everything follows one chain:

> **Product → ICP → subreddits → monitor → format → draft/reply → visibility → report.**

## When to Use

- "Set up our Reddit growth motion."
- "Help us grow on Reddit for <company>."
- "Run the Reddit playbook for <client>."

## Operating principles (read first)

- **Reddit is problem-centered.** Brands here usually win **authority**, not
  conversions — there are better places to convert. The exception is very
  early-stage startups, where Reddit can be the channel for first conversions.
  Pick the goal explicitly; it changes how aggressive engagement should be.
- **The company brain is reusable.** Onboarding already wrote the product, ICPs,
  and competitors to the project filesystem. Read it; don't re-derive it.
- **Publishing is always manual.** No public Reddit write API, and covert/
  automated promotion is out of scope. The engine drafts; a human posts. No
  astroturfing, no answering your own questions with alt accounts, no hiding that
  something is promotional. Disclose brand affiliation.

## Steps

### 1. Define the ICP (Stage 0)

Read the brain for product/ICP/competitors. A company may have several ICPs and
want Reddit for **one** right now — the real signal is the user. Use
`icp-identification` if the ICP isn't on file.

**Lock:** one ICP + a goal (authority vs. first-conversions).

### 2. Find + vet subreddits (Stage 1) — play `reddit-subreddit-discovery`

**EXECUTE this now — don't just name the engine or describe the plan.** Install and
run `reddit-subreddit-discovery`: find candidates via brand / competitor / keyword
search on Reddit (`reddit-post-finder`, ranked counts; disambiguate common-word
brands), then vet each with `reddit-subreddit-vetter` (activity, topic fit,
usable-for-promotion). **Present the vetted shortlist with each subreddit's URL
(`https://reddit.com/r/<sub>`)** before pausing. A summary that promises a shortlist
without actually producing one does not satisfy this step.

**Human checkpoint:** approve which subs to monitor (~10 subs, usually 2–3 gold).

**Stage-1 wrap-up — your message to the user MUST contain, every time:**
1. The **actual vetted shortlist** synthesized from the searches you just ran (each
   sub with its `https://reddit.com/r/<sub>` URL, activity, verdict). Never present a
   speculative / "likely" list from memory — if the searches ran, use their results.
2. The **proposed monitor cadence** (~hourly, tuned to sub activity) — *proposed*,
   not yet scheduled.
3. The **guardrails, stated explicitly:** posts/replies are **published manually by a
   human** (the engine only drafts), and **no astroturfing** (transparent, disclosed
   participation only).
4. Drafting + visibility named as **deferred next steps**, and the question **"which
   of these subs should we monitor?"** Then stop and wait — do not schedule.

### 3. Monitor + format (Stage 2–3) — play `reddit-monitor-loop`

> **HARD GATE: do not create, schedule, or start the monitor Box agent until the
> user has explicitly approved the subreddit shortlist from Step 2.** Even when the
> user says "build everything", that means build up to each checkpoint and then
> stop for approval — it does NOT authorize scheduling before the shortlist is
> approved. Present the vetted shortlist, get the go-ahead, *then* set up monitoring.

Pull each sub's `new` feed on a schedule (~hourly, tuned per activity), rerank by
semantic relevance to the ICP (`reddit-post-reranker`, not keyword matching), and
attach a per-sub format guide (`reddit-format-profiler`). Emits a ranked
reply-worthy queue. Runs as a scheduled Box agent.

### 4. Draft posts + replies (Stage 4–5) — play `reddit-content-studio`

For posts: profile the sub, then `reddit-post-drafter`. For replies: take the
queue's targets and `reddit-reply-drafter` (no em dashes, concise, native tone,
disclose affiliation). Always community-native, never an ad.

**Human checkpoint:** every post/reply reviewed before a human posts it manually.

### 5. Measure visibility + report (Stage 6–7) — play `reddit-visibility-tracker`

Track where your threads rank on Google and which AI engines cite them
(`reddit-serp-tracker` + `aeo`), plus engagement and mention sentiment, and roll
it into a dashboard + client export (`create-dashboard`). Re-check periodically.

## Human Checkpoints

- **After Step 1:** confirm the chosen ICP + goal.
- **After Step 2:** approve the subreddit shortlist before scheduling monitoring.
  Step 2 must have actually produced the vetted shortlist (with subreddit URLs) and
  presented it — don't jump to agent-building on a promised-but-unbuilt shortlist.
- **Throughout Step 4:** review every draft before manual posting.

**Always restate the guardrails** when you summarize the plan: posts/replies are
**published manually by a human** (the engine only drafts), and there is **no
astroturfing** (transparent, disclosed participation only). State these explicitly
in your wrap-up, every time — don't assume they're understood.

## Cadence

- **Hourly-ish:** Reddit `new` pulls (per `reddit-monitor-loop`), tuned to sub activity.
- **Weekly:** refresh format profiles; review the reply queue and draft.
- **Weekly/Monthly:** re-run SERP + AI-citation checks; update the dashboard.

## Skills Used

`icp-identification` · `reddit-subreddit-discovery` (→ `reddit-post-finder`,
`reddit-subreddit-vetter`) · `reddit-monitor-loop` (→ `reddit-post-reranker`,
`reddit-format-profiler`) · `reddit-content-studio` (→ `reddit-post-drafter`,
`reddit-reply-drafter`, `brand-voice-extractor`) · `reddit-visibility-tracker`
(→ `reddit-serp-tracker`, `aeo`, `reddit-aeo-monitor`, `create-dashboard`).
