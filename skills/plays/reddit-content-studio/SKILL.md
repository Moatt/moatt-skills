---
name: reddit-content-studio
description: >
  Turn a target post or a content idea into review-ready Reddit copy — posts and
  replies that read like a real community member wrote them. Picks the right
  format and tone for the sub, drafts in the brand's voice when relevant, and
  always leaves publishing to a human. Chains reddit-format-profiler,
  reddit-post-drafter, reddit-reply-drafter, and brand-voice-extractor.
tags: [content, social]
---

# Reddit Content Studio

The content half of the Reddit motion: produce posts and replies that fit the
community. Nothing here publishes — Reddit has no public write API and (per the
brief) automated/covert promotion is out of scope. You draft; a human posts.

## When to Use

- "Draft a post for r/X about <topic>."
- "Write a reply to this thread."
- "Give me Reddit copy for <sub>."
- Stage 4–5 of the `reddit-growth-engine` moat.

## Two modes

### Mode A — Write a post

1. **Get the sub's format profile.** Use `reddit-format-profiler` (or its cached
   file) to know the recommended format + tone.
2. **(optional) Load brand voice** via `brand-voice-extractor` if a house voice
   should color the writing.
3. **Draft** with `reddit-post-drafter`: community-native, leads with substance,
   no AI slop, no em-dash phrasing, discloses affiliation if the brand is named,
   no invented facts. One strong draft by default; variants only if the brief
   genuinely supports different angles.

### Mode B — Write a reply

1. Gather the **post body** + relevant **thread context** (top comment etc.) — the
   reranked queue from `reddit-monitor-loop` is the natural source of targets.
2. Pick an **objective**: reply / disagree / ask / add-resource.
3. **Draft** with `reddit-reply-drafter`: returns only the reply text; enforces
   no em dashes, concision (2–6 sentences), no fabricated facts, disclosure if the
   brand is mentioned, native tone.

## Format reference (from the brief)

The recurring Reddit formats: **questions**, **experience reports**, and **replies
inside an existing thread**. Match the sub — an experience report that works in
one community reads as bragging in another. The format profiler tells you which.

## Human Checkpoints

- **Every post and reply is reviewed by a human before posting.** The studio's job
  ends at "review-ready draft." Surface drafts in files / chat / the drafts store
  so the user can edit and post manually.

## Guardrails

- No astroturfing, no posting-a-question-and-answering-yourself, no tooling whose
  purpose is to hide that something is promotional. Disclose brand affiliation.

## Tools Required

- `reddit-format-profiler` (sub format + tone)
- `reddit-post-drafter` (posts)
- `reddit-reply-drafter` (replies)
- `brand-voice-extractor` (optional house voice)

## Output

- Post drafts (with frontmatter) and/or reply text, review-ready, never posted.

## Trigger Phrases

- "Draft a Reddit post for r/X"
- "Write a reply to this Reddit thread"
- "Reddit copy for <sub>"
