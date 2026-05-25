#!/usr/bin/env node

/**
 * Skills content audit.
 *
 * Complements scripts/validate-skills.js (which enforces the
 * skill.meta.json schema) by scanning every skill file for
 * content-level violations the schema can't catch:
 *
 *   HIGH  forbidden words (legacy CLI names, upstream paths)
 *   HIGH  direct vendor API URLs (should route through the Moatt proxy)
 *   MED   source-attribution phrases ("derived from", "inspired by", ...)
 *   MED   requires_skills referencing a slug that is not in the catalog
 *   LOW   shallow body (< 100 lines, no scripts/, no references/)
 *
 * Usage:
 *   node scripts/audit-skills.js                # human readable, exit 0
 *   node scripts/audit-skills.js --strict       # exit 1 on any HIGH or MED
 *   node scripts/audit-skills.js --json         # machine-readable JSON
 *   node scripts/audit-skills.js --csv          # tabular CSV
 *   node scripts/audit-skills.js --severity=HIGH    # filter
 *
 * Environment:
 *   MOATT_SKILLS_ROOT — override repo root (for fixture-driven tests)
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.env.MOATT_SKILLS_ROOT
  ? path.resolve(process.env.MOATT_SKILLS_ROOT)
  : path.resolve(__dirname, '..');

const SKILLS_DIR = path.join(ROOT, 'skills');
const CATEGORIES = ['moves', 'plays', 'moats', 'kits'];
const REGISTRY_FILES = ['registry.json', 'skills-index.json'];
const SCANNABLE_EXTS = new Set(['.md', '.json', '.js', '.ts', '.sh']);

// ---------------------------------------------------------------------------
// Pattern catalogs — extend these as the audit catches new leak shapes.
// ---------------------------------------------------------------------------

// "openclaw" exists in the catalog in two flavors:
//   - LEAK: legacy paths / prose carried over from the upstream port
//   - LEGIT: OpenClaw is a supported install target alongside Claude / Codex /
//            Cursor, so `~/.openclaw/skills/<slug>/`, the `--openclaw` CLI flag,
//            and label-style mentions in agent lists are valid.
// The patterns below catch only the leak shapes.
const FORBIDDEN_PATTERNS = [
  {
    id: 'openclaw_workspace_path',
    re: /~\/\.openclaw\/workspace\//,
    severity: 'HIGH',
    hint: 'Legacy workspace path. Use ~/.openclaw/skills/<slug>/ if you mean the install path.',
  },
  {
    id: 'openclaw_pkg_key',
    re: /^\s*"openclaw"\s*:\s*\{/m,
    severity: 'HIGH',
    hint: 'package.json metadata key. Rename to "moatt".',
  },
  {
    id: 'openclaw_prose_ask',
    re: /\bAsk\s+OpenClaw\s+to\b/,
    severity: 'HIGH',
    hint: 'Prose addressing OpenClaw specifically. Use neutral language ("Ask your AI agent").',
  },
  {
    id: 'openclaw_prose_session',
    re: /\bOpenClaw\s+(?:session|will|for\s+execution|to\s+execute|to\s+follow|tools?)\b/,
    severity: 'HIGH',
    hint: 'Prose treating OpenClaw as the only runtime. Use neutral language.',
  },
  {
    id: 'orth_skills_cli',
    re: /\borth skills\b/,
    severity: 'HIGH',
    hint: 'Legacy CLI command. Use `npx moatt install` (or the GitHub fork+PR contribution flow).',
  },
  {
    id: 'submit_to_origin',
    re: /Submit to Orthogonal/i,
    severity: 'HIGH',
    hint: 'Upstream contribution language. Replace with "Contribute to the Moatt catalog".',
  },
];

// Vendor URLs that should always pass through the Moatt proxy, never be hit directly.
const DIRECT_VENDOR_URLS = [
  { id: 'direct_url_orthogonal', re: /api\.orth\.sh/,                       severity: 'HIGH' },
  { id: 'direct_url_dataforseo', re: /https?:\/\/api\.dataforseo\.com/,     severity: 'MED'  },
  { id: 'direct_url_firecrawl',  re: /https?:\/\/api\.firecrawl\.dev/,      severity: 'MED'  },
  { id: 'direct_url_apify',      re: /https?:\/\/api\.apify\.com/,          severity: 'MED'  },
  { id: 'direct_url_smartlead',  re: /https?:\/\/(?:api|server)\.smartlead\.ai/, severity: 'MED' },
  { id: 'direct_url_fullenrich', re: /https?:\/\/api\.fullenrich\.com/,     severity: 'MED'  },
];

// Source-attribution phrases that suggest upstream lineage.
//
// These patterns are intentionally narrow: they only fire when a phrase like
// "derived from" is paired with a word that implies a code/catalog source
// (catalog, repo, upstream, etc.). Bare "derived from the keywords" or
// "inspired by Vibe Coding" stays clean — those are data derivations or
// cultural references, not lineage to an upstream repo.
const ATTRIBUTION_PATTERNS = [
  {
    id: 'attr_derived_from_source',
    re: /\b(?:derived|adapted|ported|forked|copied)\s+from\s+(?:the\s+)?(?:original|source|upstream|prior|previous)\b/i,
    severity: 'MED',
  },
  {
    id: 'attr_based_on_source',
    re: /\bbased\s+on\s+(?:the\s+)?(?:original|source|upstream)\s+(?:catalog|repo|repository|skill|implementation|work|catalogue)\b/i,
    severity: 'MED',
  },
  {
    id: 'attr_inspired_by_source',
    re: /\binspired\s+by\s+(?:the\s+)?(?:original|source|upstream)\s+(?:catalog|repo|repository|skill|implementation|work)\b/i,
    severity: 'MED',
  },
  {
    id: 'attr_fork_of_source',
    re: /\bfork\s+of\s+(?:the\s+)?(?:original|upstream|source)\b/i,
    severity: 'MED',
  },
  {
    id: 'attr_originally_from_source',
    re: /\boriginally\s+from\s+(?:the\s+)?(?:original|source|upstream)\b/i,
    severity: 'MED',
  },
];

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const FORMAT_JSON = args.includes('--json');
const FORMAT_CSV = args.includes('--csv');
const SEVERITY_FILTER =
  (args.find((a) => a.startsWith('--severity=')) || '').split('=')[1] || null;

// ---------------------------------------------------------------------------
// File walking helpers
// ---------------------------------------------------------------------------

function walk(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, results);
    } else {
      results.push(full);
    }
  }
  return results;
}

function relativePath(abs) {
  return path.relative(ROOT, abs);
}

function listSkillDirs() {
  const skills = [];
  for (const category of CATEGORIES) {
    const categoryDir = path.join(SKILLS_DIR, category);
    if (!fs.existsSync(categoryDir)) continue;
    for (const entry of fs.readdirSync(categoryDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      skills.push({
        slug: entry.name,
        category,
        dir: path.join(categoryDir, entry.name),
      });
    }
  }
  return skills;
}

function readSkillMeta(skillDir) {
  const metaPath = path.join(skillDir, 'skill.meta.json');
  if (!fs.existsSync(metaPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Violation detectors
// ---------------------------------------------------------------------------

function scanLines(file, patterns) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const hits = [];
  for (const pat of patterns) {
    lines.forEach((line, idx) => {
      if (pat.re.test(line)) {
        hits.push({
          file: relativePath(file),
          line: idx + 1,
          patternId: pat.id,
          severity: pat.severity,
          snippet: line.trim().slice(0, 200),
          hint: pat.hint || null,
        });
      }
    });
  }
  return hits;
}

function detectForbiddenWords(files) {
  const out = [];
  for (const f of files) out.push(...scanLines(f, FORBIDDEN_PATTERNS));
  return out;
}

function detectDirectVendorUrls(files) {
  const out = [];
  for (const f of files) {
    const hits = scanLines(f, DIRECT_VENDOR_URLS);
    for (const h of hits) {
      h.hint =
        'Route through `$MOATT_API_BASE/v1/proxy/<vendor>/...` instead of calling the vendor directly.';
    }
    out.push(...hits);
  }
  return out;
}

function detectAttributionLanguage(files) {
  const out = [];
  for (const f of files) {
    if (!f.endsWith('.md')) continue;
    const hits = scanLines(f, ATTRIBUTION_PATTERNS);
    for (const h of hits) {
      h.hint =
        'Source-attribution phrasing. Rewrite to remove lineage references.';
    }
    out.push(...hits);
  }
  return out;
}

function detectMissingRequiresSkills(skills) {
  const allSlugs = new Set(skills.map((s) => s.slug));
  const hits = [];
  for (const s of skills) {
    const meta = readSkillMeta(s.dir);
    if (!meta || !Array.isArray(meta.requires_skills)) continue;
    for (const dep of meta.requires_skills) {
      if (!allSlugs.has(dep)) {
        hits.push({
          file: relativePath(path.join(s.dir, 'skill.meta.json')),
          line: 0,
          patternId: 'missing_requires_skill',
          severity: 'MED',
          snippet: `requires_skills: ${dep}`,
          hint: `requires_skills references "${dep}" which is not in the catalog.`,
        });
      }
    }
  }
  return hits;
}

function detectShallowBody(skills) {
  const hits = [];
  for (const s of skills) {
    const skillMd = path.join(s.dir, 'SKILL.md');
    if (!fs.existsSync(skillMd)) continue;
    const lineCount = fs.readFileSync(skillMd, 'utf8').split('\n').length;
    const hasScripts = fs.existsSync(path.join(s.dir, 'scripts'));
    const hasReferences = fs.existsSync(path.join(s.dir, 'references'));
    if (lineCount < 100 && !hasScripts && !hasReferences) {
      hits.push({
        file: relativePath(skillMd),
        line: 0,
        patternId: 'shallow_body',
        severity: 'LOW',
        snippet: `body: ${lineCount} lines, no scripts/, no references/`,
        hint: 'Skill body is thin. Consider rewriting with concrete steps + examples, or archiving.',
      });
    }
  }
  return hits;
}

// ---------------------------------------------------------------------------
// Summarization + output formatters
// ---------------------------------------------------------------------------

function summarize(hits) {
  const bySeverity = { HIGH: 0, MED: 0, LOW: 0 };
  const byPattern = {};
  const byFile = {};
  for (const h of hits) {
    bySeverity[h.severity] = (bySeverity[h.severity] || 0) + 1;
    byPattern[h.patternId] = (byPattern[h.patternId] || 0) + 1;
    byFile[h.file] = (byFile[h.file] || 0) + 1;
  }
  return {
    total: hits.length,
    bySeverity,
    byPattern,
    filesAffected: Object.keys(byFile).length,
  };
}

function printHuman(hits, summary, fileCount, skillCount) {
  const C = {
    reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
    red: '\x1b[31m', yellow: '\x1b[33m', blue: '\x1b[34m', green: '\x1b[32m',
  };
  const sevColor = (s) => (s === 'HIGH' ? C.red : s === 'MED' ? C.yellow : C.blue);

  console.log(`${C.bold}=== moatt-skills audit ===${C.reset}`);
  console.log(`${C.dim}Root:${C.reset}     ${ROOT}`);
  console.log(`${C.dim}Skills:${C.reset}   ${skillCount}`);
  console.log(`${C.dim}Files:${C.reset}    ${fileCount} scanned`);
  console.log('');

  if (hits.length === 0) {
    console.log(`${C.green}${C.bold}0 violations.${C.reset} Catalog is clean.`);
    return;
  }

  console.log(
    `${C.bold}Total:${C.reset} ${hits.length} ` +
      `(${C.red}HIGH ${summary.bySeverity.HIGH}${C.reset}, ` +
      `${C.yellow}MED ${summary.bySeverity.MED}${C.reset}, ` +
      `${C.blue}LOW ${summary.bySeverity.LOW}${C.reset}) ` +
      `across ${summary.filesAffected} files`,
  );
  console.log('');

  console.log(`${C.bold}By pattern:${C.reset}`);
  const sorted = Object.entries(summary.byPattern).sort((a, b) => b[1] - a[1]);
  for (const [pat, count] of sorted) {
    console.log(`  ${pat.padEnd(28)} ${count}`);
  }
  console.log('');

  console.log(`${C.bold}Details:${C.reset}`);
  const byFile = {};
  for (const h of hits) (byFile[h.file] = byFile[h.file] || []).push(h);
  for (const file of Object.keys(byFile).sort()) {
    console.log(`  ${C.bold}${file}${C.reset}`);
    for (const h of byFile[file]) {
      const lineStr = h.line > 0 ? `:${h.line}` : '';
      console.log(
        `    ${sevColor(h.severity)}[${h.severity}]${C.reset} ${h.patternId}${C.dim}${lineStr}${C.reset}`,
      );
      console.log(`      ${C.dim}${h.snippet}${C.reset}`);
    }
  }
}

function printJson(hits, summary, fileCount, skillCount) {
  console.log(
    JSON.stringify(
      { root: ROOT, totalSkills: skillCount, totalFilesScanned: fileCount, summary, hits },
      null,
      2,
    ),
  );
}

function printCsv(hits) {
  console.log('severity,patternId,file,line,snippet');
  for (const h of hits) {
    const snippet = (h.snippet || '').replace(/"/g, '""').replace(/\n/g, ' ');
    console.log(`${h.severity},${h.patternId},${h.file},${h.line},"${snippet}"`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const skills = listSkillDirs();

  const allFiles = [];
  for (const s of skills) {
    for (const f of walk(s.dir)) {
      const ext = path.extname(f);
      if (SCANNABLE_EXTS.has(ext)) allFiles.push(f);
    }
  }
  for (const rootFile of REGISTRY_FILES) {
    const p = path.join(ROOT, rootFile);
    if (fs.existsSync(p)) allFiles.push(p);
  }

  let hits = [];
  hits = hits.concat(detectForbiddenWords(allFiles));
  hits = hits.concat(detectDirectVendorUrls(allFiles));
  hits = hits.concat(detectAttributionLanguage(allFiles));
  hits = hits.concat(detectMissingRequiresSkills(skills));
  hits = hits.concat(detectShallowBody(skills));

  if (SEVERITY_FILTER) {
    hits = hits.filter((h) => h.severity === SEVERITY_FILTER.toUpperCase());
  }

  const summary = summarize(hits);

  if (FORMAT_JSON) {
    printJson(hits, summary, allFiles.length, skills.length);
  } else if (FORMAT_CSV) {
    printCsv(hits);
  } else {
    printHuman(hits, summary, allFiles.length, skills.length);
  }

  if (STRICT && (summary.bySeverity.HIGH > 0 || summary.bySeverity.MED > 0)) {
    process.exit(1);
  }
}

main();
