---
name: generate-voice-guide
description: >
  Produce a personal voice guide for X (Twitter) and/or LinkedIn by analysing a user's
  prior posts and iterating through sample-and-feedback rounds. Outputs a structured
  Markdown voice guide that sibling skills (create-x-content, create-linkedin-content)
  consume to draft posts in the same voice. Distinct from brand-voice-extractor, which
  analyses company blogs and landing pages — this skill is built for personal social
  voice.
tags: [content, social]
---

# Generate Voice Guide

Take a real person's past posts and turn them into a structured voice guide that other skills can use to draft in-voice content. Generates one guide per platform (X, LinkedIn, or both) covering persona, dos/don'ts, banned phrases, hook patterns, format rules, and example posts.

**This skill is agent-executed** — the agent handles scraping, analysis, drafting, and iteration using whatever tools are available in the session. There's no bundled Python script.

## When to use

- A user wants to build a personal voice guide for social content
- Another skill (such as `create-x-content`, `create-linkedin-content`, `social-kit`) needs a voice guide and none exists yet
- The user wants to mimic someone else's public voice (for ghostwriting, parody, or study)

**When NOT to use:** For analysing a company's blog or landing-page voice, use `brand-voice-extractor` instead. That's the corporate-marketing-voice tool; this one is for individual social voice.

## Quick Start

Interactive:
```
/generate-voice-guide
```

Args mode:
```
/generate-voice-guide --profile @MoattAI --platforms x,linkedin --output ~/.moatt-skills/voice-guides
```

## Discovery Questions (front-loaded)

Ask these up front when they aren't supplied via flags:

1. **Whose voice?** "Paste an X/Twitter handle (e.g. `@MoattAI`), a LinkedIn profile URL, or both. You can mimic your own voice or someone else's."
2. **Which platforms?** "Build a voice guide for X, LinkedIn, or both?"
3. **How many posts to scan?** "Default: 50 X posts / 25 LinkedIn posts. Higher = more signal, more tokens, slower."
4. **Save location?** "Default: `~/.moatt-skills/voice-guides/voice-{x,linkedin}.md`. OK to use that, or prefer a different path?"

## Workflow

### Phase 1 — Scrape past posts

**For X:**
- Use Apify actor `apidojo/twitter-user-tweets-scraper` (or whichever X scraper is available in the session) keyed off the handle.
- Pull the target count (default 50). Drop replies, retweets, and quote tweets unless the user specifies otherwise — we want original voice.
- Requires the `APIFY_API_TOKEN` env var. If it's missing, surface a clear error with the setup link.

**For LinkedIn:**
- Use Apify actor `harvestapi/linkedin-profile-posts` keyed off the profile URL.
- Pull the target count (default 25). Include only original posts (no reshares).

**Fallback (no scraper or posts are paywalled):** ask the user to paste 15–25 posts as plain text.

Store the raw post text, engagement counts (likes, views if available), and timestamps.

### Phase 2 — Generate v1 voice guide

Use `voice-x.md` / `voice-linkedin.md` template references (see "Template Skeleton" below) to draft v1 of the guide. Do NOT copy content from them — only the *structure*.

Mine the scraped posts for:

- **Persona** — inferred role, audience, credentials, tone spectrum
- **The "meat" principle** — what concrete substance shows up consistently: tools, numbers, builds, steps, links
- **Dos** — observed hook patterns, connective phrases, list style, casual asides, emoji usage, CTA patterns
- **Don'ts** — patterns the author conspicuously avoids (no threads, no engagement bait, etc.)
- **Banned phrases** — common LLM-speak the author never uses (`excited to share`, `leverage`, `game-changing`, `thrilled`, etc.). List 10–20.
- **Hook patterns** — 5–8 distinct opening-line templates drawn from real posts
- **Format rules** — word count ranges, bullet style, density, line-break rhythm
- **Tone calibration** — educator vs conversational ratio; when each applies
- **Example posts with analysis** — pull 4–6 real posts and explain *why* each one works, which pattern it exemplifies

### Phase 3 — Sample + feedback loop (5+ iterations)

This is where voice-guide quality is made. Do NOT skip iterations.

Each iteration:

1. **Generate 3 sample posts** from the current guide, each using a different hook pattern from the guide. Pull topics from the user's own posting history so they're easy to judge (e.g. if they post about AI agents, draft on AI agents).
2. **Show the user:**
   - Which hook pattern each sample used
   - The 3 sample posts
   - 1–2 lines from the current guide that most shaped the samples
3. **Ask for feedback** — be specific:
   - "Which samples sound like you? Which don't?"
   - "What's the most off-sounding phrase or pattern?"
   - "What's missing — a hook you use, a rule you follow?"
4. **Apply feedback** — revise the guide. Update dos/don'ts, hook patterns, banned phrases, examples. Track what changed in a short changelog at the top of the guide during iteration.
5. **Repeat.**

**Stopping rule:** keep going until the user explicitly says "this is good" AND at least 5 iterations have completed. 5 is a floor, not a ceiling. If the user says "good enough" at iteration 2, push back: "Voice guides need at least 5 rounds to actually lock in. Can we do 3 more?"

### Phase 4 — Save + register

1. Write the final guide to the resolved output path (default `~/.moatt-skills/voice-guides/voice-<platform>.md`).
2. Strip the iteration changelog — only keep the final clean guide.
3. Update `~/.moatt-skills/config.json`:
   ```json
   {
     "voice_guides": {
       "x": "<absolute path to voice-x.md>",
       "linkedin": "<absolute path to voice-linkedin.md>"
     }
   }
   ```
   Create the directory/file if it doesn't exist. Merge with the existing config if present (don't overwrite other keys).
4. Print a confirmation with the saved paths and a next-step nudge: "You can now run `/create-x-content --brief \"...\"` and it'll use this voice guide automatically."

## Template Skeleton

Every generated voice guide should carry these top-level sections, in order:

```
# Voice Guide: <Platform> — <Handle or Name>

## Persona
## The "Meat" Principle
## Dos
## Don'ts
## Banned Phrases
## Hook Patterns
## CTA Guidelines
## Format Rules
## Tone Calibration
## Example Posts That Exemplify The Voice
```

Match the depth and specificity of a well-written voice guide — prose for persona, numbered lists for dos/don'ts, quoted examples with analysis. Aim for 120–250 lines.

## Config File

`~/.moatt-skills/config.json` is a lightweight cross-skill config. Schema:

```json
{
  "voice_guides": {
    "x": "/absolute/path/to/voice-x.md",
    "linkedin": "/absolute/path/to/voice-linkedin.md"
  }
}
```

Sibling skills read this to find the voice-guide paths. Always use absolute paths.

## Inputs

| Input | Required | Default |
|-------|----------|---------|
| `--profile` | Yes (one of X handle, LinkedIn URL, or both) | — |
| `--platforms` | No | `x,linkedin` if both profiles given, else matches supplied profiles |
| `--posts-x` | No | 50 |
| `--posts-linkedin` | No | 25 |
| `--output` | No | `~/.moatt-skills/voice-guides` |
| `--iterations-min` | No | 5 |

## Outputs

- `<output>/voice-x.md` and/or `<output>/voice-linkedin.md`
- Updated `~/.moatt-skills/config.json` with voice-guide paths
- Stdout summary: paths written + quick-start command for the next step

## Dependencies

- Apify API token (`APIFY_API_TOKEN`) for scraping
- No other paid services required
- Voice-guide *structural* references (open via `WebFetch` or read locally if the user has them) — not required to run

## Tips

- **5+ iterations is the floor.** If the user pushes to stop early, explain that voice guides only become useful after ~5 rounds.
- **Use the user's own topics for samples.** Drafting on subjects they've posted about makes it much easier for them to spot an off-key line.
- **Quote real posts in the examples section.** Never paraphrase — use direct verbatim quotes with a source link.
- **Call out ghost-writing or assistant-authored posts.** If a few posts feel dramatically different, flag it: "These 3 posts read differently — worth checking if they're yours or ghost-written."
- **Don't lean on LLM clichés in the banned-phrases list.** Derive bans from actual absence in the user's writing, not a generic blocklist.
