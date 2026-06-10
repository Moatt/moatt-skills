---
name: reddit-post-drafter
description: >
  Draft a Reddit post that reads like a real member of the community wrote it —
  in the target sub's format and tone, useful and authentic, never an ad. Takes
  a subreddit (+ its format profile), a content brief, and optional brand voice,
  and produces review-ready post drafts. Never auto-publishes; Reddit has no
  public post API and publishing stays a human decision.
tags: [content, social]
---

# Reddit Post Drafter

Write a post for a specific subreddit that fits how that community actually
posts. **You — the agent — draft inline.** No script. The output is a draft a
human reviews and posts manually.

**Hard rule: this skill never publishes.** There is no public Reddit write API,
and (per the brief) covert/automated promotion is out of scope. You produce the
text; a person posts it.

## When to use

- "Draft a post for r/X about <topic>."
- Step in the `reddit-content-studio` play.

## Inputs

- **Subreddit** — where it's going.
- **Format profile** — from `reddit-format-profiler` (recommended format + tone).
  If you don't have one, run the profiler first, or read its cached file.
- **Brief** — what the post is about; the specifics (numbers, story, result) that
  make it real. The brief's "meat" is what keeps the post from being filler.
- **Brand context** (optional) — if the brand is to be mentioned, who it is and
  the honest relationship ("I work at X"). Often the best post mentions nothing.
- **Brand voice** (optional) — from `brand-voice-extractor`, if a house voice
  should color the writing.

## Drafting rules

**Before the draft, state in one line the format + tone you're writing to**
("r/SaaS rewards candid experience reports with hard numbers; writing that") —
from the format profile if you have one, else from the sub's known conventions.
This keeps the draft honest to the community and shows the user your reasoning.

Write to the sub's profile, and obey these always:

1. **Community-native, not corporate.** Match the sub's register and length from
   the format profile. If the sub rewards experience reports, write one.
2. **Lead with substance.** Open with the concrete result, the real question, or
   the specific situation — never a hook that smells like marketing.
3. **No AI slop.** No "in today's fast-paced world", no breathless adjectives,
   no fake enthusiasm. **Zero em dashes (—) anywhere** — not in the draft, not in
   the title, not in your chat reply around it. The — character is the #1 AI tell
   on Reddit. Use short sentences, commas, or parentheses instead. Before
   delivering, literally scan your text for "—" and rewrite every occurrence.
4. **No hard CTA / no link-dropping** unless the sub clearly tolerates it. The
   goal on Reddit is authority and genuine help, not clicks.
5. **Disclose if you name the brand.** "(I work at X)" — honest, in-thread,
   matter-of-fact. Many subs require it; all of them punish hidden promotion.
6. **Don't invent facts.** Use only what the brief gives you. If a claim needs a
   number you don't have, leave a `[fill in: …]` placeholder rather than fabricate.

## Output

One default draft; offer 2–3 variants only if the brief is rich enough to support
genuinely different angles (don't pad). Each draft as its own file:

```yaml
---
platform: reddit
subreddit: <sub>
format: experience-report | question | resource | reply
status: draft
discloses_affiliation: true | false
---
```
Body: the post text only (title line first if the format needs a title, then
body). No analysis, no surrounding commentary in the file.

Then, in chat, tell the user — explicitly, not implied:
1. Where the draft is and why it fits the sub (1 line).
2. **The disclosure decision**: if the brand is named, the draft carries the
   "(I work at X)" line; if you kept it anonymous, say so and offer the
   disclosed variant. Never silently skip this.
3. **"This is a draft. You post it manually."** Verbatim or close. The user
   must never wonder whether something was auto-published.

Optionally save via the draft store (`karmable_create_draft` / the Box
`/workspace/outbox` drafts path) so it shows in their dashboard.

## Self-check before delivering

- Reads like the sub's example posts? (If it could be a press release, rewrite.)
- Zero `—` characters in draft AND surrounding chat text? (Scan literally.)
- Concrete specifics present?
- Disclosure included iff the brand is named, and the decision stated to the user?
- "This is a draft. You post it manually." stated explicitly?
- No invented numbers?

If a draft fails and two rewrites can't fix it, say so rather than ship a weak post.

## Cost

Free — drafting is your reasoning. (Profiling the sub, if needed, costs one
`reddit-post-finder` call.)

## Dependencies

- `reddit-format-profiler` (format + tone), optional `brand-voice-extractor`.
