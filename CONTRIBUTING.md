# Contributing to Moatt Skills

Thanks for your interest. Here's how to add or improve skills in the catalog.

## Adding a new skill

1. Pick a slug — lowercase, hyphenated, unique across the catalog (e.g., `apollo-lead-finder`).

2. Create the skill directory under the right composition level:

   ```
   skills/moves/<slug>/        # atomic, single-job skills
   skills/plays/<slug>/        # orchestrated multi-skill chains
   skills/moats/<slug>/        # end-to-end pipelines
   ```

3. Add the two required files:

   - **`SKILL.md`** — agent-readable instructions with YAML frontmatter (`name`, `description`, `tags`).
   - **`skill.meta.json`** — registry metadata (see `schemas/skill-meta.schema.json`).

4. Validate and rebuild the index:

   ```bash
   npm run validate:skills
   npm run build:index
   ```

5. Run the test suite:

   ```bash
   npm test
   ```

6. Open a pull request. CI will re-run validate, build, and tests on every push.

## Coding conventions

- **Zero runtime dependencies** in `bin/`, `scripts/`, and `tools/`. Use Node's built-ins (`https`, `fs`, `path`) and Python's `urllib` only.
- **Skill scripts** under `skills/<level>/<slug>/scripts/` may use third-party packages, but document the install in the skill's `SKILL.md`.
- **Tags** must be from the enum in `schemas/skill-meta.schema.json`. Open an issue first if you need a new tag.
- **`base_command`** in `skill.meta.json` must match `npx moatt install <slug>` exactly.

## Reporting bugs

Open an issue with:
- The skill slug (if relevant)
- What you expected vs. what happened
- A minimal repro
