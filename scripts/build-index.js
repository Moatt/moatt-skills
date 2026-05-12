#!/usr/bin/env node

/**
 * Catalog index builder.
 *
 * Walks every SKILL.md + skill.meta.json pair under skills/ and emits two
 * artifacts at the repo root:
 *
 *   - skills-index.json — full machine catalog (every file path included)
 *   - registry.json     — curated entries with auto-derived display fields
 *
 * registry.json is the consumption format for downstream apps that need
 * human-friendly names, vendor info, and version metadata; skills-index.json
 * is the authoritative file listing for the install CLI.
 */

const fs = require('fs');
const path = require('path');

// Repo root resolution. MOATT_SKILLS_ROOT lets fixture trees drive the
// builder under test without the working directory shuffle.
const ROOT = process.env.MOATT_SKILLS_ROOT
  ? path.resolve(process.env.MOATT_SKILLS_ROOT)
  : path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'skills-index.json');
const REGISTRY_OUTPUT = path.join(ROOT, 'registry.json');

// ── YAML frontmatter parser ──────────────────────────────────────────────
//
// Hand-rolled (no js-yaml dependency) because the only constructs we accept
// in SKILL.md frontmatter are simple scalars, inline arrays, and folded
// block scalars (`>` and `|`). Everything else is rejected silently — if
// a skill author needs richer frontmatter they should reach for a real
// YAML library.

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const lines = match[1].split('\n');
  const result = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (!kvMatch) { i++; continue; }

    const key = kvMatch[1];
    let raw = kvMatch[2];

    // Block-scalar headers: `>` (folded) or `|` (literal), with the optional
    // chomp indicators `-` and `+`. Continuation lines are indented; we eat
    // them until we hit a non-indented line or the end of the block.
    if (/^[>|][-+]?\s*$/.test(raw)) {
      const isFolded = raw.trim().startsWith('>');
      i++;
      const blockLines = [];
      let baseIndent = null;
      while (i < lines.length) {
        const next = lines[i];
        if (next === '') { blockLines.push(''); i++; continue; }
        if (/^\S/.test(next)) break;
        const indent = next.match(/^(\s+)/)[1].length;
        if (baseIndent === null) baseIndent = indent;
        if (indent < baseIndent) break;
        blockLines.push(next.slice(baseIndent));
        i++;
      }
      while (blockLines.length && blockLines[blockLines.length - 1] === '') blockLines.pop();

      if (isFolded) {
        // Folded semantics: collapse runs of non-empty lines into one
        // space-joined paragraph; preserve empty lines as paragraph breaks.
        const out = [];
        let buf = [];
        for (const l of blockLines) {
          if (l === '') {
            if (buf.length) { out.push(buf.join(' ')); buf = []; }
            out.push('');
          } else { buf.push(l); }
        }
        if (buf.length) out.push(buf.join(' '));
        result[key] = out.join('\n').replace(/\n+$/, '');
      } else {
        result[key] = blockLines.join('\n');
      }
      continue;
    }

    // Plain inline value — strip surrounding quotes if present.
    let value = raw.trim().replace(/^['"]|['"]$/g, '');
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter((s) => s);
    }
    result[key] = value;
    i++;
  }
  return result;
}

// ── Filesystem walk filters ─────────────────────────────────────────────
//
// `output` is excluded because skill runs frequently dump artifacts there
// and we don't want local-only files polluting the public catalog.
const SKIP_DIRS = new Set(['.tmp', '__pycache__', 'node_modules', '.git', 'output']);
const SKIP_EXTS = new Set(['.pyc', '.pyo']);
const SKIP_FILES = new Set(['.DS_Store', 'Thumbs.db']);

function collectFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      files.push(...collectFiles(full));
    } else {
      if (SKIP_FILES.has(entry.name)) continue;
      if (SKIP_EXTS.has(path.extname(entry.name))) continue;
      files.push(full);
    }
  }
  return files;
}

// ── Scan one category ───────────────────────────────────────────────────
function scanCategory(category) {
  const categoryDir = path.join(ROOT, 'skills', category);
  if (!fs.existsSync(categoryDir)) return [];

  const skills = [];
  const slugs = fs.readdirSync(categoryDir).filter((d) =>
    fs.statSync(path.join(categoryDir, d)).isDirectory()
  );

  for (const slug of slugs) {
    const skillDir = path.join(categoryDir, slug);
    const skillMd = path.join(skillDir, 'SKILL.md');
    const metaPath = path.join(skillDir, 'skill.meta.json');

    if (!fs.existsSync(skillMd)) continue;
    if (!fs.existsSync(metaPath)) {
      throw new Error(`Missing skill.meta.json for skills/${category}/${slug}`);
    }

    const content = fs.readFileSync(skillMd, 'utf8');
    const metaFromFrontmatter = parseFrontmatter(content);
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

    const allFiles = collectFiles(skillDir).map((f) => path.relative(ROOT, f));

    skills.push({
      slug,
      name: metaFromFrontmatter.name || slug,
      category,
      description: metaFromFrontmatter.description || '',
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      path: `skills/${category}/${slug}`,
      files: allFiles,
      metadata: meta,
    });
  }

  return skills;
}

// ── Scan kits ────────────────────────────────────────────────────────────
//
// Kits live one level below `skills/kits/`, grouped by the axis the bundle
// is themed around. Currently recognised axes:
//
//   skills/kits/industries/<slug>/   → bundles tuned for a vertical
//   skills/kits/channels/<slug>/     → bundles for a delivery medium
//   skills/kits/roles/<slug>/        → bundles for a job function
//   skills/kits/functions/<slug>/    → bundles for a GTM job-to-be-done
//
// Each kit ships its own kit.meta.json declaring two kinds of children:
//   - `skills`: directories under the kit root with their own SKILL.md
//     (kit-internal sub-skills, never installable standalone)
//   - `registry_skills`: slugs from one of the top-level categories
//     (re-exported by reference, no file duplication)
const KIT_AXES = ['industries', 'channels', 'roles', 'functions'];

function scanKits(registrySkills) {
  const kitsRoot = path.join(ROOT, 'skills', 'kits');
  if (!fs.existsSync(kitsRoot)) return [];

  const registryBySlug = {};
  for (const s of registrySkills) {
    registryBySlug[s.slug] = s;
  }

  const kits = [];

  for (const axis of KIT_AXES) {
    const axisDir = path.join(kitsRoot, axis);
    if (!fs.existsSync(axisDir)) continue;

    const slugs = fs.readdirSync(axisDir).filter((d) =>
      fs.statSync(path.join(axisDir, d)).isDirectory()
    );

    for (const slug of slugs) {
      const kitDir = path.join(axisDir, slug);
      const metaPath = path.join(kitDir, 'kit.meta.json');

      if (!fs.existsSync(metaPath)) continue;

      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

      // Walk the kit-internal sub-skills first.
      const subSkills = [];
      for (const skillSlug of (meta.skills || [])) {
        const skillDir = path.join(kitDir, skillSlug);
        const skillMd = path.join(skillDir, 'SKILL.md');

        if (!fs.existsSync(skillMd)) {
          throw new Error(`Kit "${slug}": missing SKILL.md in ${skillSlug}/`);
        }

        const content = fs.readFileSync(skillMd, 'utf8');
        const frontmatter = parseFrontmatter(content);
        const allFiles = collectFiles(skillDir).map((f) => path.relative(ROOT, f));

        subSkills.push({
          slug: skillSlug,
          name: frontmatter.name || skillSlug,
          description: frontmatter.description || '',
          path: `skills/kits/${axis}/${slug}/${skillSlug}`,
          files: allFiles,
          source: 'kit',
        });
      }

      // Then resolve any registry references.
      for (const regSlug of (meta.registry_skills || [])) {
        const regSkill = registryBySlug[regSlug];
        if (!regSkill) {
          throw new Error(`Kit "${slug}": registry_skills references unknown skill "${regSlug}"`);
        }
        subSkills.push({
          slug: regSkill.slug,
          name: regSkill.name,
          description: regSkill.description,
          path: regSkill.path,
          files: regSkill.files,
          source: 'registry',
        });
      }

      // Shared-at-the-kit-root files (env templates, configs, etc).
      const sharedFiles = (meta.shared_files || [])
        .map((f) => `skills/kits/${axis}/${slug}/${f}`)
        .filter((f) => fs.existsSync(path.join(ROOT, f)));

      kits.push({
        slug,
        name: meta.name || slug,
        type: 'kit',
        axis,
        description: meta.description || '',
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        path: `skills/kits/${axis}/${slug}`,
        shared_files: sharedFiles,
        skills: subSkills,
        metadata: meta,
      });
    }
  }

  return kits;
}

const registrySkills = [
  ...scanCategory('moves'),
  ...scanCategory('plays'),
  ...scanCategory('moats'),
];

const kits = scanKits(registrySkills).sort((a, b) => a.slug.localeCompare(b.slug));

// ── Promote kit-internal sub-skills to the top-level skills array ─────────
//
// Sub-skills with source 'kit' aren't reachable from any category dir on
// disk, so without promotion they'd be invisible to consumers iterating
// idx.skills[]. Sub-skills with source 'registry' are already top-level via
// scanCategory and don't need promoting — they're just referenced from the
// kit for grouping.
const promotedFromKits = [];
const registrySlugs = new Set(registrySkills.map((s) => s.slug));
const promotedSlugs = new Map(); // slug -> kit it came from
for (const kit of kits) {
  for (const sub of kit.skills) {
    if (sub.source !== 'kit') continue;

    if (registrySlugs.has(sub.slug)) {
      throw new Error(
        `Kit "${kit.slug}": sub-skill slug "${sub.slug}" collides with a top-level registry skill`,
      );
    }

    const existingKit = promotedSlugs.get(sub.slug);
    if (existingKit) {
      throw new Error(
        `Kit-internal sub-skill slug "${sub.slug}" appears in multiple kits ` +
          `("${existingKit}" and "${kit.slug}"). ` +
          `Sub-skill slugs must be globally unique — downstream consumers upsert by slug.`,
      );
    }
    promotedSlugs.set(sub.slug, kit.slug);

    promotedFromKits.push({
      slug: sub.slug,
      name: sub.name,
      // Kit sub-skills get filed as `moves` in the catalog. Backend syncs
      // gate is_active by category and anything outside the recognised
      // taxonomy is retired immediately, so we slot them in with the
      // atomic skills.
      category: 'moves',
      description: sub.description,
      tags: Array.isArray(kit.metadata && kit.metadata.tags) ? kit.metadata.tags : [],
      path: sub.path,
      files: sub.files,
      metadata: {
        slug: sub.slug,
        category: 'moves',
        kit: kit.slug,
        tags: Array.isArray(kit.metadata && kit.metadata.tags) ? kit.metadata.tags : [],
        // Standalone install isn't supported for kit sub-skills — installing
        // the parent kit pulls them all in.
        installation: {
          base_command: `npx moatt install ${kit.slug}`,
          supports: ['claude', 'cursor', 'codex'],
        },
      },
    });
  }
}

const skills = [
  ...registrySkills,
  ...promotedFromKits,
].sort((a, b) => a.slug.localeCompare(b.slug));

// Slug uniqueness across kits + skills.
const skillSlugs = new Set(skills.map((s) => s.slug));
for (const kit of kits) {
  if (skillSlugs.has(kit.slug)) {
    throw new Error(`Kit slug "${kit.slug}" collides with an existing skill slug`);
  }
}

// Stable `generated` date — keep the previous value when nothing else
// changed so CI doesn't see spurious diffs on no-op rebuilds.
let generatedDate = new Date().toISOString().split('T')[0];
if (fs.existsSync(OUTPUT)) {
  try {
    const existing = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));
    const newContent = JSON.stringify({ skills, kits });
    const oldContent = JSON.stringify({ skills: existing.skills, kits: existing.kits });
    if (newContent === oldContent && existing.generated) {
      generatedDate = existing.generated;
    }
  } catch {}
}

const index = {
  version: '1.0.0',
  generated: generatedDate,
  skills,
  kits,
};

fs.writeFileSync(OUTPUT, JSON.stringify(index, null, 2) + '\n');
console.log(`Generated ${OUTPUT} with ${skills.length} skills and ${kits.length} kits.`);

// ── registry.json — curated schema for the consuming app ─────────────────
//
// The fields below are auto-derived from skill.meta.json + frontmatter.
// Per-skill overrides ride along inside skill.meta.json (any key set there
// wins over the auto-derived value): name, version, argumentHint, domain,
// appName, changelog.

function humanize(slug) {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Vendor lookup keyed by the trailing token of the slug. When a skill ends
// with `-hunter` / `-tomba` / etc. we attach the matching appName + domain
// automatically. Slugs without a known vendor suffix fall through to an
// empty domain and a humanised slug as the appName.
const KNOWN_VENDORS = {
  hunter: { appName: 'Hunter', domain: 'hunter.io' },
  tomba: { appName: 'Tomba', domain: 'tomba.io' },
  sixtyfour: { appName: 'SixtyFour', domain: 'sixtyfour.ai' },
  contactout: { appName: 'ContactOut', domain: 'contactout.com' },
  fiber: { appName: 'Fiber', domain: 'fiber.dev' },
  exa: { appName: 'Exa', domain: 'exa.ai' },
  tavily: { appName: 'Tavily', domain: 'tavily.com' },
  perplexity: { appName: 'Perplexity', domain: 'perplexity.ai' },
  jina: { appName: 'Jina', domain: 'jina.ai' },
  andi: { appName: 'Andi', domain: 'andisearch.com' },
  linkup: { appName: 'Linkup', domain: 'linkup.so' },
  valyu: { appName: 'Valyu', domain: 'valyu.network' },
  olostep: { appName: 'Olostep', domain: 'olostep.com' },
  scrapegraph: { appName: 'ScrapeGraph', domain: 'scrapegraphai.com' },
  riveter: { appName: 'Riveter', domain: 'riveter.com' },
  notte: { appName: 'Notte', domain: 'notte.cc' },
  branddev: { appName: 'Brand.dev', domain: 'brand.dev' },
  searchapi: { appName: 'SearchAPI', domain: 'searchapi.io' },
  logodev: { appName: 'Logo.dev', domain: 'logo.dev' },
  textbelt: { appName: 'Textbelt', domain: 'textbelt.com' },
  didit: { appName: 'Didit', domain: 'didit.me' },
  tako: { appName: 'Tako', domain: 'tako.so' },
  tavus: { appName: 'Tavus', domain: 'tavus.io' },
  scrapecreators: { appName: 'ScrapeCreators', domain: 'scrapecreators.com' },
  smartlead: { appName: 'Smartlead', domain: 'smartlead.ai' },
  nyne: { appName: 'Nyne', domain: 'nyne.app' },
  precip: { appName: 'Precip', domain: 'precip.dev' },
};

function deriveVendorFields(slug) {
  const tail = slug.split('-').pop();
  return KNOWN_VENDORS[tail] || {};
}

function buildRegistryEntry(s) {
  const meta = s.metadata || {};
  const vendor = deriveVendorFields(s.slug);
  return {
    slug: s.slug,
    name: meta.name || humanize(s.slug),
    description: s.description || '',
    category: s.category || meta.category || 'moves',
    tags: Array.isArray(meta.tags) ? meta.tags : (Array.isArray(s.tags) ? s.tags : []),
    version: meta.version || '0.1.0',
    path: s.path,
    argumentHint: meta.argumentHint || '',
    domain: meta.domain || vendor.domain || '',
    appName: meta.appName || vendor.appName || humanize(s.slug),
    changelog: meta.changelog || { '0.1.0': 'Initial release.' },
    // Pass through the v2 taxonomy fields so the consuming app can render
    // chains (plays) and kit membership.
    requires_skills: Array.isArray(meta.requires_skills) ? meta.requires_skills : [],
    kit: meta.kit || null,
  };
}

// Build a curated kit registry entry. Kits aren't tied to a single vendor,
// so we skip the vendor lookup and emit just the fields the marketplace UI
// needs: identity, copy, tags, contained sub-skill slugs.
function buildKitRegistryEntry(k) {
  const meta = k.metadata || {};
  return {
    slug: k.slug,
    name: meta.name || k.name || humanize(k.slug),
    description: k.description || '',
    tags: Array.isArray(meta.tags) ? meta.tags : (Array.isArray(k.tags) ? k.tags : []),
    path: k.path,
    // Each sub-skill is either kit-internal (lives only inside the kit) or a
    // registry reference (also exists top-level). The UI doesn't need that
    // distinction — it just lists what installing the kit will pull in.
    skills: (k.skills || []).map((s) => ({
      slug: s.slug,
      name: s.name,
      description: s.description,
    })),
  };
}

const registry = {
  version: '1',
  updatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  skills: skills.map(buildRegistryEntry),
  kits: kits.map(buildKitRegistryEntry),
};

// Same stability trick — keep the previous `updatedAt` when the curated
// content is byte-identical, so CI doesn't churn on no-op rebuilds.
if (fs.existsSync(REGISTRY_OUTPUT)) {
  try {
    const existing = JSON.parse(fs.readFileSync(REGISTRY_OUTPUT, 'utf8'));
    const newContent = JSON.stringify({ skills: registry.skills, kits: registry.kits });
    const oldContent = JSON.stringify({ skills: existing.skills, kits: existing.kits });
    if (newContent === oldContent && existing.updatedAt) {
      registry.updatedAt = existing.updatedAt;
    }
  } catch {}
}

fs.writeFileSync(REGISTRY_OUTPUT, JSON.stringify(registry, null, 2) + '\n');
console.log(
  `Generated ${REGISTRY_OUTPUT} with ${registry.skills.length} skills and ${registry.kits.length} kits.`,
);
