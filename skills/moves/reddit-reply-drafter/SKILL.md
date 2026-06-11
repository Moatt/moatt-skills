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
- **Persona** — the voice is the **user's choice**: an *employee*, a *real user*,
  or the *founder*. The founder disclosure often reads the most legit. Ask if it
  isn't given; don't assume.
- **Length** — also the **user's choice**, and it can vary across a set of comments
  (a one-liner here, a fuller reply there). Default to 2–6 sentences only when the
  user hasn't said.
- **Style constraints** (optional) — tone, brand to mention. If a brand is named,
  disclosure is required.

## Before you draft — get the missing essentials (don't guess, don't placeholder)

If the brief hasn't already told you, ask the user ONCE (a single `askUserQuestion`)
for the things that are the user's choice, then draft:

- **The product/brand name** to mention (and whether to name it at all). You must
  NEVER write a `[your product name]` / `[brand]` / `[Fill in…]` placeholder in a
  reply — if you'd need one, you're missing an input, so ask for it. A reply with a
  placeholder is unpublishable and fails.
- **Persona** — employee / real user / founder.
- **Length** — default short (2–6 sentences) if they don't care.

One question round is fine. Do NOT draft a placeholdered reply and then explain the
placeholder in a note — get the name and use it.

## Style rules (always)

- **Natural, community-native tone.** Not corporate, not salesy. Sound like a
  person who actually has this experience.
- **No em dashes (—).** Use short sentences, commas, or parentheses instead. This
  is a hard constraint — em dashes are an AI tell on Reddit.
- **Don't invent facts.** If you're unsure, say so or ask a question. Never
  fabricate stats, prices, or features. This includes fake PERSONAL data: no
  "my clients rarely pay more than X days late", no made-up reminder schedules
  or workflows presented as your own experience. If the input gave you no
  numbers, write the reply without numbers.
- **Concise by default (2–6 sentences), or the length the user set.** When no
  length is given, 2–6 sentences is the cap — count before returning; 7+ means cut,
  not trim. One idea per sentence, no stacked clauses. If the user asked for a
  specific length (or different lengths across comments), honor that instead.
- **When promoting a tool: succinct, and match the user's actual problem.** Don't
  over-explain. If the tool solves *several* of the poster's problems, say that it
  does. The plug only earns its place when it genuinely fits.
- **Never dangle the tool.** No "happy to share if useful", no "DM me if you're
  interested", no "let me know and I'll send it". On Reddit you either share or you
  don't — so name the tool plainly (or don't mention it at all). A wishy-washy
  offer reads as marketing and helps nobody.
- **Pick the answer type** (it varies, and that's fine): sometimes you just drop
  the tool's name in passing; sometimes you disclose you're the founder, which
  reads really legit. Choose what fits the post and the chosen persona.
- **Disclose affiliation** if you mention the brand: a plain "(I work on one of
  these)" / "(disclosure: I work at X)" / "I build X". Honest and in-line. NAME the
  product if you know its name — a nameless "a tool I use" plug helps nobody find
  it. If you don't know the name, keep it generic but still disclose.
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

**Return only the final reply text.** Your ENTIRE chat message is the reply,
ready to paste. Nothing before it, nothing after it. No headings, no analysis,
no "Here's a draft:", no "Here's the reply:", no separators (`---`), no numbered
sections, no closing notes about where it was saved. If you feel the urge to add
context, don't: the user asked for the reply text and the reply text alone.

(If the caller is a play/pipeline that wants metadata too, also write the reply to
a draft file — but the chat/return payload is the bare reply text.)

## Self-check before returning

- Contains zero `—` characters.
- Length matches what the user asked for; if unset, sentence count ≤ 6 (count them).
- **No bracketed placeholders** (`[your product name]`, `[brand]`, `[Fill in…]`) and
  **no meta-note / `---` separator** explaining one. If you were about to placeholder
  the product, you skipped "Before you draft" — go ask for the name.
- **No dangling share offer** — no "happy to share", "DM me if interested",
  "let me know and I'll send it". The tool is named plainly or not mentioned.
- If a tool is promoted: it's succinct and matched to the poster's actual problem
  (and says so if it solves several).
- Written in the persona the user chose (employee / real user / founder).
- No fabricated specifics: no invented stats, no invented personal experience
  data, no invented product behavior.
- Disclosure present iff a brand/product is referenced; product named when known.
- Reads like a person from this sub, not an assistant.
- The message contains the reply text and NOTHING else.

If any check fails, fix it before returning.

## Cost

Free — pure reasoning.

## Dependencies

None required. Pairs well with `reddit-format-profiler` (sub tone) and
`reddit-post-reranker` (which surfaces the post worth replying to).
