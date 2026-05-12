---
name: create-x-content
description: >
  Generate voice-aligned X (Twitter) post variants from a free-form brief. Reads a
  personal voice guide (built via generate-voice-guide), produces 2–5 variants in
  distinct framings (simple-howto, problem-first, hype, mechanism-breakdown, etc.),
  and runs a self-check against the voice guide's banned phrases before delivering.
tags: [content, social]
---

# Create X Content

Generate X/Twitter post variants that sound like you, not like an AI. Reads a voice guide the user already created (or offers to make one), produces several framings of the same idea, and saves each variant as its own markdown file with frontmatter.

**This is an agent-executed skill** — the agent runs the drafting and self-check inline. No Python script involved.

## Quick Start

```
/create-x-content --brief "New open-source CLI that turns Figma files into React components. Called figma2react. Free, MIT licensed."
```

Or interactively:
```
/create-x-content
```

## Inputs

| Flag | Required | Default |
|------|----------|---------|
| `--brief` | Yes (prompted interactively if missing) | — |
| `--variants` | No | Skill picks based on brief richness (2–5) |
| `--voice-guide` | No | Resolved using the chain below |
| `--output` | No | `./content/YYYY-MM-DD-<topic-slug>/` |
| `--topic` | No | Pulled from the brief |

## Voice Guide Resolution

Walk through these in order and stop on the first match:

1. `--voice-guide <path>` flag
2. `~/.moatt-skills/config.json` → `voice_guides.x`
3. `~/.moatt-skills/voice-guides/voice-x.md` (default path)
4. **Fallback prompt** — no guide located. Offer the user three paths forward:
   - (a) Paste a path to an existing guide
   - (b) Run `/generate-voice-guide --platforms x` now to create one (recommended)
   - (c) Proceed with a neutral default (warn that the output will read as generic)

Never silently skip the voice guide. Generic-sounding posts are the failure mode to dodge.

## Workflow

### Phase 1 — Load the voice guide

Read the chosen voice guide into context. Capture, for use throughout drafting:
- **Banned phrases** — treat as hard blocks
- **Hook patterns** — sample these for variant framings
- **Format rules** — length bands, line-break style, emoji policy
- **Dos/don'ts** — apply across every variant
- **Example posts** — use as calibration anchors

### Phase 2 — Parse the brief and decide variant count

Pick a variant count based on how rich the brief is:
- **2 variants** — one-line opinions, single-angle hot takes, plain tool mentions with no mechanism
- **3 variants** — standard tool spotlights, single how-tos, observations with one clear angle
- **4 variants** — multi-angle topics (a how-to + a problem-first frame + a hype frame + a mechanism breakdown)
- **5 variants** — rich, mechanism-heavy content where several distinct hooks all have real substance

If `--variants` is set explicitly, honour it. Otherwise pick the smallest count where every variant adds a genuinely different angle. **Quality > quantity.** Two strong variants beat five watered-down ones.

### Phase 3 — Generate variants with explicit framing

Each variant receives a specific *framing label* that drives both structure and hook:

| Framing | Structure | When to use |
|---------|-----------|-------------|
| `simple-howto` | Bare steps, no mechanism | Tool install + usage, 2–3 line how-to |
| `howto-plus-mechanism` | How-to + "here's how it works" breakdown | Tools where the mechanism is interesting |
| `problem-first` | Open with the pain, then the solution | When the problem is visceral/relatable |
| `hype` | Punchy "someone just dropped X" energy | Launches, fresh OSS releases, cool builds |
| `mechanism-breakdown` | Focus on the *how* | Technical builds, systems, architectures |
| `ecosystem-map` | Curated list of N related tools/companies | Landscape posts |
| `contrarian` | "Most people do X wrong" opener | Opinion pieces with a clear counter-take |
| `personal-experience` | "We've been doing X. Here's what I learned" | Field notes, lessons learned |

Stick to framings the voice guide's hook patterns actually support. Don't force framings the user never uses.

### Phase 4 — Self-check against the voice guide

Before persisting, run every variant through these checks:

1. **Banned phrase check** — does the variant use any phrase from the voice guide's banned list? If yes, rewrite that line.
2. **Length check** — does it satisfy the voice guide's format rules (short-form <280, long-form 100–1000, etc.)?
3. **"Meat" check** — does it cite at least one concrete reference: a specific tool, number, workflow, or build? If not, it's filler — rewrite.
4. **Voice-match spot check** — could this credibly appear in the voice guide's example posts? If it reads as a generic AI tweet, rewrite.

If a variant fails any check and two rewrites can't fix it, drop the variant rather than ship a weak one.

### Phase 5 — Save outputs

Write each variant as its own `.md` file. File naming:
```
variant-<letter>-<framing-slug>.md
```
Examples: `variant-a-simple-howto.md`, `variant-b-problem-first.md`.

Frontmatter schema:
```yaml
---
id: <topic-slug>-<letter>
platform: x
format: short | long
topic: <slug>
framing: <framing-slug>
status: draft
---
```

Body: just the post text. No surrounding commentary, no extra markdown.

### Phase 6 — Deliver

Report to the user:
- Output directory path
- List of files created
- Variant count plus framings used
- Suggested next step (review, tweak, or run `/social-kit` for a matching graphic)

## Outputs

- `<output>/variant-<letter>-<framing>.md` per variant
- No index file — every variant is self-contained

## Examples

**Simple brief:**
```
/create-x-content --brief "npx moatt install claude-code-hooks — a new skill that adds pre-commit, pre-tool-use, and post-response hooks to Claude Code so you can enforce coding standards automatically."
```
→ 3 variants (howto, hype, mechanism)

**Rich brief:**
```
/create-x-content --brief "Built a Claude-driven lead gen system. Scrapes Reddit for people asking about email deliverability, finds their domains, verifies their business email via Hunter, drafts a personalized DM. 47 leads in 6 hours at $0.03/lead."
```
→ 5 variants (personal-experience, mechanism-breakdown, hype, problem-first, simple-howto)

## Dependencies

- A voice guide located at the resolved path (see Voice Guide Resolution above)
- `generate-voice-guide` skill (for spinning one up when absent)

## Tips

- **Default to fewer variants.** Five mediocre ones is worse than two sharp ones. The skill should feel picky, not generous.
- **Framings must genuinely differ.** Five variants with the same opening hook and small tweaks is not five variants. Each one = a fresh lens on the same idea.
- **Lift the brief's specifics verbatim.** Numbers, tool names, prices — these are the "meat." Paraphrasing them strips the post.
- **If the voice guide includes a "field-notes deep-dive" hook pattern and the brief is rich enough, ship one long-form variant.** That format tends to outperform on X.
