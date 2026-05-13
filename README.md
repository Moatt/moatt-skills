# Moatt Skills

**Growth & GTM skills for AI coding agents.** Drop-in Markdown skills for sales, marketing, lead generation, competitive intelligence, SEO, content, and outreach — installable into [Claude Code](https://claude.ai/code), [Cursor](https://cursor.sh), and [Codex](https://openai.com/codex) with one command.

Catalog: [moatt.com](https://moatt.com)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Quick Start

```bash
npx moatt install <slug>                       # Auto-detects Claude Code, Codex, Cursor
npx moatt install <slug> --claude              # Force a single target
npx moatt install <slug> --cursor --project-dir .
```

Find and refresh:

```bash
npx moatt search "<query>"                     # JSON output (agent-friendly)
npx moatt search "<query>" --human --limit 5   # Human-readable list
npx moatt list                                 # Full catalog
npx moatt info <slug>                          # Details for one skill / kit
npx moatt update                               # Refresh every installed skill
npx moatt update <slug>                        # Refresh one
```

## Where skills go on disk

Skills follow the `vercel-labs/skills` "canonical store + symlinks" layout so a single update reaches every agent:

```
~/.agents/skills/<slug>/                   ← canonical files (single source of truth)
~/.claude/skills/<slug>     → symlink ──→ ~/.agents/skills/<slug>
~/.codex/skills/<slug>      → symlink ──→ ~/.agents/skills/<slug>
<project>/.cursor/rules/moatt-<slug>.mdc   ← real file (Cursor's rule format requires inline content)
```

`moatt install` is idempotent. Re-running it on an already-installed skill is a no-op. If you have a legacy installation (a literal copy in `~/.claude/skills/<slug>/` from an older version of the CLI), re-run `moatt install <slug> --force` to convert it to the new layout.

`moatt update` refreshes the canonical copy; the symlinks pick up the new content automatically.

---

## How it works

Each skill ships as a self-contained directory: `SKILL.md` (agent-readable instructions), `skill.meta.json` (catalog metadata), and any helper scripts the skill needs. The CLI fetches them from this repo and lands them in the right place for your agent — `~/.claude/skills/` for Claude Code, `~/.codex/skills/` for Codex, `.cursor/rules/` for Cursor.

Most skills route their API calls through the Moatt proxy with usage-based billing. One key (`MOATT_API_KEY`) covers every upstream — no juggling vendor accounts.

```bash
npx moatt login                                 # Writes ~/.moatt/credentials.json
```

This opens your browser, signs you in via Clerk, lets you pick which project the CLI defaults to, and writes the issued key to `~/.moatt/credentials.json` (`chmod 0600`). Skills read that file and send `Authorization: Bearer <key>` plus `X-Moatt-Project: <slug>` on every proxy call.

### Auth commands

```bash
npx moatt login              # browser-based login + project picker
npx moatt logout             # clear local credentials (key stays valid on server)
npx moatt logout --all       # also revoke the key on the server
npx moatt whoami             # email, org, current project
npx moatt status             # whoami + credit balance + last-used
npx moatt projects list      # list all projects your key can use
npx moatt switch <slug>      # change the default project (local, no browser)
```

`moatt switch` is the GitHub-CLI-style flow: one login mints a single key for your org, then you can flip between any project you have access to without re-authenticating.

Credentials file shape:

```json
{
  "apiKey": "mk_...",
  "email": "you@example.com",
  "clerkOrgId": "org_...",
  "orgName": "Acme",
  "currentProject": "acme-marketing",
  "projects": [
    { "id": "...", "slug": "acme-marketing", "name": "Acme Marketing" },
    { "id": "...", "slug": "acme-seo",       "name": "Acme SEO" }
  ],
  "apiBase": "https://moatt.com",
  "loggedInAt": "..."
}
```

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
