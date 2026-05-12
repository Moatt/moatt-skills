#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Repo root resolution — defaults to the project root, with MOATT_SKILLS_ROOT
// available as an override (the same convention build-index.js follows so
// tests can drive both scripts against a fixture tree).
const ROOT = process.env.MOATT_SKILLS_ROOT
  ? path.resolve(process.env.MOATT_SKILLS_ROOT)
  : path.resolve(__dirname, '..');
const CATEGORIES = ['moves', 'plays', 'moats'];
const SCHEMA_PATH = path.join(ROOT, 'schemas', 'skill-meta.schema.json');

function fail(messages) {
  console.error('Skill validation failed:');
  for (const msg of messages) console.error(`- ${msg}`);
  process.exit(1);
}

function isValidSlug(slug) {
  return /^[a-z0-9-]+$/.test(slug);
}

const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
const allowedTags = new Set(schema.properties.tags.items.enum);

const errors = [];
const slugs = new Set();

// Recursively descend skills/ collecting every SKILL.md path we encounter.
// Cross-referenced at the end against the catalog index — any drift between
// what's on disk and what the index exposes is caught here before it reaches
// downstream consumers.
function collectSkillMdDirs(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSkillMdDirs(full, results);
    } else if (entry.name === 'SKILL.md') {
      results.push(path.relative(ROOT, path.dirname(full)));
    }
  }
  return results;
}

for (const category of CATEGORIES) {
  const categoryPath = path.join(ROOT, 'skills', category);
  if (!fs.existsSync(categoryPath)) continue;

  for (const slug of fs.readdirSync(categoryPath)) {
    const skillDir = path.join(categoryPath, slug);
    if (!fs.statSync(skillDir).isDirectory()) continue;

    const skillMd = path.join(skillDir, 'SKILL.md');
    const metaPath = path.join(skillDir, 'skill.meta.json');

    if (!fs.existsSync(skillMd)) {
      errors.push(`Missing SKILL.md for ${category}/${slug}`);
      continue;
    }
    if (!fs.existsSync(metaPath)) {
      errors.push(`Missing skill.meta.json for ${category}/${slug}`);
      continue;
    }

    let meta;
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    } catch (err) {
      errors.push(`Invalid JSON in ${category}/${slug}/skill.meta.json`);
      continue;
    }

    if (!isValidSlug(slug)) {
      errors.push(`Directory slug has invalid format: ${category}/${slug}`);
    }
    if (meta.slug !== slug) {
      errors.push(`Slug mismatch in ${category}/${slug}: meta.slug=${meta.slug}`);
    }
    if (meta.category !== category) {
      errors.push(`Category mismatch in ${category}/${slug}: meta.category=${meta.category}`);
    }
    if (!Array.isArray(meta.tags)) {
      errors.push(`tags must be an array in ${category}/${slug}`);
    } else {
      const invalidTags = meta.tags.filter((t) => !allowedTags.has(t));
      if (invalidTags.length) {
        errors.push(
          `invalid tag(s) in ${category}/${slug}: ${invalidTags.join(', ')}. ` +
            `Allowed: ${[...allowedTags].sort().join(', ')}`
        );
      }
    }
    if (!meta.installation || typeof meta.installation.base_command !== 'string' || !meta.installation.base_command.trim()) {
      errors.push(`installation.base_command required in ${category}/${slug}`);
    }
    if (!meta.installation || !Array.isArray(meta.installation.supports) || meta.installation.supports.length === 0) {
      errors.push(`installation.supports required in ${category}/${slug}`);
    }

    if (slugs.has(slug)) {
      errors.push(`Duplicate slug: ${slug}`);
    }
    slugs.add(slug);
  }
}

// Tree-vs-index sanity gate: every on-disk SKILL.md must be addressable from
// the top-level skills array in the generated index. The most common failure
// is sub-skills that live inside a kit landing only in nested arrays where
// downstream consumers never look — this catches that class of regression
// before it ships.
const allSkillMdDirs = collectSkillMdDirs(path.join(ROOT, 'skills'));
const indexPath = path.join(ROOT, 'skills-index.json');
if (fs.existsSync(indexPath)) {
  let index;
  try {
    index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch (err) {
    errors.push(`skills-index.json is not valid JSON: ${err.message}`);
  }

  if (index) {
    // Hard requirement: top-level skills[] must cover everything we walked.
    // A SKILL.md surfacing only via kits[].skills[] does NOT pass — that's
    // the specific regression this gate exists to catch, since the consumers
    // we ship to iterate idx.skills[] directly.
    const topLevelPaths = new Set();
    for (const s of index.skills || []) {
      if (s.path) topLevelPaths.add(s.path);
    }

    const missing = allSkillMdDirs.filter((d) => !topLevelPaths.has(d));
    if (missing.length) {
      errors.push(
        `${missing.length} SKILL.md file(s) are missing from top-level idx.skills[]. ` +
          `Kit sub-skills need to surface at the top level — entries that only exist ` +
          `inside kits[].skills[] are invisible to the backend sync. ` +
          `Re-run \`npm run build:index\` to refresh. Missing:\n  ${missing.join('\n  ')}`,
      );
    }
  }
} else {
  errors.push('skills-index.json missing — run `npm run build:index` first.');
}

if (errors.length) fail(errors);
console.log(`Skill validation passed for ${slugs.size} skills.`);
