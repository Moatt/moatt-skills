---
name: skill-creator
description: Create new skills for the Moatt catalog. Use when designing new skills, updating existing skills, or helping users build skills with scripts, references, and assets. Triggers on requests to create skills, write SKILL.md files, or structure skill directories.
source: moatt
---


# Skill Creator

Create modular, self-contained skill packages that any AI agent can install via the Moatt CLI.

## What is a skill?

A skill is a markdown file plus optional scripts, references, and assets that teaches an AI agent how to do one specific job. Skills live in the Moatt catalog (open-source MIT, on GitHub at `Moatt/moatt-skills`) and install via `npx moatt install <slug>`.

## Core principle: concise is key

The context window is shared. Only add what the agent doesn't already know. Challenge every paragraph: "Does this justify its token cost?" Prefer concise examples over verbose explanations.

## Skill structure on disk

```
my-skill/
├── SKILL.md              # Required: YAML frontmatter + agent instructions
├── skill.meta.json       # Required: machine-readable metadata
├── scripts/              # Optional: executable code (Python, JS, shell)
├── references/           # Optional: documentation loaded on-demand
└── assets/               # Optional: templates, images, fixtures
```

## SKILL.md format

```markdown
---
name: skill-name
description: What it does + when to use it. This is the trigger mechanism.
source: moatt
---

# Skill Name

[Instructions for using the skill, starting with Setup if it needs credentials.]
```

### Frontmatter rules

- `name`: lowercase, hyphens, under 64 chars (e.g. `pdf-editor`, `gh-review-pr`). Must match the directory name.
- `description`: Include BOTH what it does AND when to trigger. The body isn't loaded until after triggering, so all "when to use" info must be in the description.
- `source: moatt` for skills published in the Moatt catalog.

## skill.meta.json format

```json
{
  "slug": "my-skill",
  "category": "moves",
  "tags": ["outreach"],
  "installation": {
    "base_command": "npx moatt install my-skill",
    "supports": ["claude", "codex", "cursor"]
  },
  "features": ["Bullet 1", "Bullet 2"],
  "requires_skills": [],
  "requires_tools": []
}
```

The `category` must be one of: `moves`, `plays`, `moats`, `kits`. Allowed `tags` are listed in `schemas/skill-meta.schema.json`.

## Degrees of freedom

Match specificity to task fragility:

| Freedom | Use when | Format |
|---|---|---|
| High | Multiple valid approaches | Text instructions |
| Medium | Preferred pattern exists | Pseudocode, parameterized scripts |
| Low | Fragile or error-prone operations | Specific scripts, few params |

## How to contribute a new skill

The Moatt catalog is open source on GitHub. The workflow:

1. **Fork** the repo: https://github.com/Moatt/moatt-skills
2. **Clone** locally
3. **Create the skill directory** under the right category:
   ```bash
   mkdir -p skills/moves/my-skill
   ```
4. **Add `SKILL.md` and `skill.meta.json`** matching the formats above
5. **Validate locally** before committing:
   ```bash
   npm run validate:skills
   ```
6. **Update `registry.json`** with the new entry (slug, name, description, path, tags)
7. **Open a pull request** against `main`

CI runs automated checks (schema validation, leak audit, structural tests) before review.

## Local testing before submitting

To run the skill against a real Moatt account from your machine:

```bash
# From the moatt-skills repo root
ln -s "$(pwd)/skills/moves/my-skill" ~/.claude/skills/my-skill
```

Then open your AI agent (Claude Code, Cursor, or Codex) and ask it to use the skill. Iterate on the SKILL.md until the agent uses it correctly.

## What NOT to include

- README.md, CHANGELOG.md, INSTALLATION_GUIDE.md inside the skill directory
- Setup or testing procedures for the catalog (those live in the repo root)
- User-facing marketing copy
- Anything not needed for the agent to do the job

## Progressive disclosure

Keep SKILL.md under 500 lines. When approaching the limit, split into reference files.

**Pattern: high-level guide with references**

```markdown
## Quick start
[Core workflow here]

## Advanced
- **Complex feature**: See references/feature.md
- **API details**: See references/api.md
```

**Pattern: domain organization**

```
bigquery-skill/
├── SKILL.md         # Overview + navigation
└── references/
    ├── finance.md
    ├── sales.md
    └── product.md
```

The agent loads only the relevant reference file.

## Size discipline checklist

Before submitting, verify:

- SKILL.md is under 500 lines
- The description in frontmatter is one clear sentence that includes the trigger
- At least one concrete example per major operation
- No hardcoded credentials anywhere in the file
- All vendor calls go through `$MOATT_API_BASE/v1/proxy/<vendor>/...` (never hit a vendor API directly)
- Slugs in `requires_skills` exist in the catalog

## Examples to learn from

Browse existing skills in the catalog for patterns:

- A simple `move`: `skills/moves/email-finder-hunter/SKILL.md`
- A multi-step `play`: `skills/plays/ad-angle-miner/SKILL.md`
- A scheduled `moat`: `skills/moats/outbound-prospecting-engine/SKILL.md`

The cleanest skills follow the same shape: Setup → Capabilities → Usage → Example commands.
