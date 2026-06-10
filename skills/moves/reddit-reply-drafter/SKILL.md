---
name: reddit-reply-drafter
description: >
  Draft a reply to a Reddit post that sounds like a real community member — not
  an AI, not a brand. Takes the post body (and optional thread context), an
  objective (reply / disagree / ask a clarifying question / add a resource), and
  style constraints, and returns ONLY the final reply text. Enforces a
  community-native tone, no em dashes, concision, and no invented facts.
tags: [content, social]
---

# Reddit Reply Drafter

Treat a reply as a content-generation task with strict constraints. **You — the
agent — write it inline.** No script. The output is the reply text only; a human
reviews and posts it (replying/engaging on Reddit is fully manual).

## Inputs

Recommended:

- **Subreddit** — `r/{sub}` (sets the tone).
- **Original post body** — the text you're replying to. Required.
- **Thread context** (optional) — the top comment or a couple of key replies, so
  you don't repeat what's already said or contradict the room.
- **Objective** — one of: `reply` (add value), `disagree` (respectfully push
  back), `ask` (clarifying question), `add-resource` (point to something useful,
  possibly your brand).
- **Style constraints** (optional) — length band, tone, brand to mention. If a
  brand is named, disclosure is required.

## Style rules (always)

- **Natural, community-native tone.** Not corporate, not salesy. Sound like a
  person who actually has this experience.
- **No em dashes (—).** Use short sentences, commas, or parentheses instead. This
  is a hard constraint — em dashes are an AI tell on Reddit.
- **Don't invent facts.** If you're unsure, say so or ask a question. Never
  fabricate stats, prices, or features.
- **Concise.** 2–6 sentences unless the sub clearly expects long-form.
- **Disclose affiliation** if you mention the brand: a plain "(I work on one of
  these)" / "(disclosure: I work at X)". Honest and in-line.
- **Match the objective.** A `disagree` stays respectful and specific; an `ask`
  is genuinely curious; an `add-resource` leads with help, mentions the brand only
  if it truly fits and then with disclosure.

## Objective playbook

| Objective | Shape |
|---|---|
| `reply` | Empathize/acknowledge, then add one genuinely useful point. |
| `disagree` | "I see it differently —" no. Instead: "In my experience that didn't hold, because…" Specific, not combative. |
| `ask` | A short, real clarifying question that moves the thread forward. |
| `add-resource` | Lead with the helpful thing; mention the brand last, with disclosure, framed as "what worked for me." |

## Output

**Return only the final reply text.** No headings, no analysis, no "Here's a
draft:", no surrounding commentary. Just the reply, ready to paste.

(If the caller is a play/pipeline that wants metadata too, also write the reply to
a draft file — but the chat/return payload is the bare reply text.)

## Self-check before returning

- Contains zero `—` characters.
- ≤ 6 sentences (unless long-form was requested).
- No fabricated specifics.
- Disclosure present iff a brand is named.
- Reads like a person from this sub, not an assistant.

If any check fails, fix it before returning.

## Cost

Free — pure reasoning.

## Dependencies

None required. Pairs well with `reddit-format-profiler` (sub tone) and
`reddit-post-reranker` (which surfaces the post worth replying to).
