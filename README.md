# Moatt Skills

**Growth & GTM skills for AI coding agents.** Drop-in Markdown skills for sales, marketing, lead generation, competitive intelligence, SEO, content, and outreach — installable into [Claude Code](https://claude.ai/code), [Cursor](https://cursor.sh), and [Codex](https://openai.com/codex) with one command.

- Catalog: **[moatt.com](https://moatt.com)**
- Docs: **[docs.moatt.com](https://docs.moatt.com)**

[![npm version](https://img.shields.io/npm/v/moattai.svg?label=moattai)](https://www.npmjs.com/package/moattai)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> The CLI is published on npm as **`moattai`**. The binary on your PATH is **`moatt`**.

---

## Install

```bash
# One-off (recommended for first try)
npx moattai login
npx moattai install <slug>

# Or install globally so you can type `moatt` directly
npm install -g moattai
moatt login
moatt install <slug>
```

After install, ask your AI coding agent to do something a skill covers — it picks the right skill and runs it.

> Commands below use `moatt` (global install) — prefix with `npx moattai` if you didn't install globally.

### Other install flags

```bash
moatt install <slug> --claude              # Force a single target
moatt install <slug> --cursor --project-dir .
moatt install <slug> --force               # Convert legacy installs to symlinks
```

### Find and refresh

```bash
moatt search "<query>"                     # JSON output (agent-friendly)
moatt search "<query>" --human --limit 5   # Human-readable list
moatt list                                 # Full catalog
moatt info <slug>                          # Details for one skill or kit
moatt update                               # Refresh every installed skill
moatt update <slug>                        # Refresh one
```

---

## Where skills go on disk

Skills follow a "canonical store + symlinks" layout so one update reaches every agent:

```
~/.agents/skills/<slug>/                   ← canonical files (single source of truth)
~/.claude/skills/<slug>     → symlink ──→ ~/.agents/skills/<slug>
~/.codex/skills/<slug>      → symlink ──→ ~/.agents/skills/<slug>
<project>/.cursor/rules/moatt-<slug>.mdc   ← real file (Cursor's rule format requires inline content)
```

`moatt install` is idempotent — re-running it on an already-installed skill is a no-op. `moatt update` refreshes the canonical copy and every symlink picks up the new content automatically.

---

## How it works

Each skill ships as a self-contained directory: `SKILL.md` (agent-readable instructions), `skill.meta.json` (catalog metadata), and any helper scripts. The CLI fetches these from this repo and lands them in the right place for your agent.

Most skills route API calls through the **Moatt proxy** with usage-based billing. One key (`MOATT_API_KEY`) covers every upstream — no juggling vendor accounts.

```bash
moatt login
```

This opens your browser, signs you in, lets you pick a default project, and writes the issued key to `~/.moatt/credentials.json` (`chmod 0600`). Skills read that file and send `Authorization: Bearer <key>` on every proxy call.

### Auth commands

```bash
moatt login              # Browser-based login + project picker
moatt logout             # Clear local credentials (key stays valid on server)
moatt logout --all       # Also revoke the key on the server
moatt whoami             # Email, org, current project
moatt status             # whoami + credit balance + key info
moatt credits            # Print credit balance (JSON; --human for table)
moatt projects list      # List all projects your key can use
moatt switch <slug>      # Change the default project (local, no browser)
```

`moatt switch` is the gh-CLI-style flow: one login mints a single key for your org, then flip between any project you have access to without re-authenticating.

### Credentials file shape

```json
{
  "api_key": "mk_...",
  "api_base": "https://moatt.com",
  "email": "you@example.com",
  "userId": "user_...",
  "clerkOrgId": "org_...",
  "orgName": "Acme",
  "currentProject": "acme-marketing",
  "projects": [
    { "id": "...", "slug": "acme-marketing", "name": "Acme Marketing" },
    { "id": "...", "slug": "acme-seo",       "name": "Acme SEO" }
  ],
  "loggedInAt": "..."
}
```

Keys use snake_case so skills can read them with one-line Python snippets like:

```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
```

---

## Taxonomy

Skills are organised by composition level:

| Level | What it is |
|-------|------------|
| **moves** | Atomic — one skill, one job (find an email, scrape a page, run a search). |
| **plays** | Orchestrated chains of moves for a recurring workflow (mine ad angles from reviews + Reddit + competitor ads). |
| **moats** | End-to-end systems that build sustained competitive advantage — full GTM pipelines you can run on a schedule. |
| **kits** | Curated bundles of skills that ship together with shared config files. |

The full machine-readable catalog lives in [`skills-index.json`](skills-index.json) (every file path) and [`registry.json`](registry.json) (curated entries with vendor info, used by the consuming app).

---

## Repository layout

```
moatt-skills/
├── bin/                      # CLI entry-point (published as `moattai` on npm)
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
    "base_command": "moatt install my-skill",
    "supports": ["claude", "cursor", "codex"]
  }
}
```

Optional fields override auto-derived registry entries: `name` (display name), `version`, `argumentHint`, `domain`, `appName`, `changelog`. See [`schemas/skill-meta.schema.json`](schemas/skill-meta.schema.json) for the full contract.

---

## Building from source

```bash
git clone https://github.com/Karmable-AI/moatt-skills.git
cd moatt-skills
npm install
npm run validate:skills        # Lint every skill against the schema
npm run build:index            # Regenerate skills-index.json + registry.json
```

The catalog builder reads `SKILL.md` frontmatter and `skill.meta.json`, walks any helper files under each skill directory, and emits two JSON files at the repo root.

---

## Contributing

Adding a new skill takes three files: a directory under `skills/<level>/<slug>/`, a `SKILL.md`, and a `skill.meta.json`. Run `npm run validate:skills` to lint, `npm run build:index` to refresh the catalog, then open a PR.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

---

## License

MIT — see [LICENSE](LICENSE).
