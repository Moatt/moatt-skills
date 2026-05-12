# Moatt Skills

**Growth & GTM skills for AI coding agents.** Drop-in Markdown skills for sales, marketing, lead generation, competitive intelligence, SEO, content, and outreach — installable into [Claude Code](https://claude.ai/code), [Cursor](https://cursor.sh), and [Codex](https://openai.com/codex) with one command.

Catalog: [moatt.com](https://moatt.com)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Quick Start

```bash
npx moatt install <slug>                       # Claude Code (default)
npx moatt install <slug> --cursor --project-dir .
npx moatt install <slug> --codex
```

Browse and inspect:

```bash
npx moatt list             # Available skills + kits
npx moatt info <slug>      # Show details for one skill
```

---

## How it works

Each skill ships as a self-contained directory: `SKILL.md` (agent-readable instructions), `skill.meta.json` (catalog metadata), and any helper scripts the skill needs. The CLI fetches them from this repo and lands them in the right place for your agent — `~/.claude/skills/` for Claude Code, `~/.codex/skills/` for Codex, `.cursor/rules/` for Cursor.

Most skills route their API calls through the Moatt proxy with usage-based billing. One key (`MOATT_API_KEY`) covers every upstream — no juggling vendor accounts.

```bash
npx moatt login                                 # Writes ~/.moatt/credentials.json
```

After that, skills automatically pick up `MOATT_API_KEY` and `MOATT_API_BASE` from environment or the credentials file.

---

## Taxonomy

Skills are organised by composition level:

| Level | What it is |
|-------|------------|
| **moves** | Atomic — one skill, one job (e.g., find an email, scrape a page, run a search). |
| **plays** | Orchestrated chains of moves for a recurring workflow (e.g., mine ad angles from reviews + Reddit + competitor ads). |
| **moats** | End-to-end systems that build sustained competitive advantage — full GTM pipelines you can run on a schedule. |
| **kits** | Curated bundles of skills that ship together with shared config files. |

The full machine-readable catalog lives in [`skills-index.json`](skills-index.json) (every file path) and [`registry.json`](registry.json) (curated entries with vendor info, used by the consuming app).

---

## Repository layout

```
moatt-skills/
├── bin/                      # CLI entry-point
├── schemas/                  # JSON Schema for skill + kit metadata
├── scripts/                  # validate-skills, build-index
├── skills/
│   ├── moves/                # atomic skills
│   ├── plays/                # orchestrated chains
│   ├── moats/                # end-to-end systems
│   └── kits/                 # curated bundles
├── tools/                    # shared Python helpers (Apify guard, Supabase)
├── skills-index.json         # auto-generated full catalog
└── registry.json             # auto-generated curated registry
```

---

## Skill metadata contract

Every skill ships two required files.

**`SKILL.md`** — Markdown with YAML frontmatter:

```yaml
---
name: my-skill
description: >
  One paragraph explaining what the skill does and when an agent
  should reach for it.
tags: [lead-generation, research]
---

(skill body — instructions for the agent, code blocks, examples)
```

**`skill.meta.json`** — registry metadata:

```json
{
  "slug": "my-skill",
  "category": "moves",
  "tags": ["lead-generation", "research"],
  "installation": {
    "base_command": "npx moatt install my-skill",
    "supports": ["claude", "cursor", "codex"]
  }
}
```

Optional fields override auto-derived registry entries: `name` (display name), `version`, `argumentHint`, `domain`, `appName`, `changelog`. See [`schemas/skill-meta.schema.json`](schemas/skill-meta.schema.json) for the full contract.

---

## Building from source

```bash
git clone https://github.com/Karmable-AI/moatt-skills-v3.git
cd moatt-skills-v3
npm run validate:skills        # Lint every skill against the schema
npm run build:index            # Regenerate skills-index.json + registry.json
```

The catalog builder reads `SKILL.md` frontmatter and `skill.meta.json`, walks any helper files under each skill directory, and emits two JSON files at the repo root.

---

## Contributing

Adding a new skill takes three files: a directory under `skills/<level>/<slug>/`, a `SKILL.md`, and a `skill.meta.json`. Run `npm run validate:skills` to lint, `npm run build:index` to refresh the catalog, then open a PR.

---

## License

MIT — see [LICENSE](LICENSE).
