

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { renderCursorRule } = require('./targets');

const HOME = os.homedir();
const CANONICAL_ROOT = path.join(HOME, '.agents', 'skills');
const CLAUDE_ROOT = path.join(HOME, '.claude', 'skills');
const CODEX_ROOT = path.join(HOME, '.codex', 'skills');
const OPENCLAW_ROOT = path.join(HOME, '.openclaw', 'skills');

function canonicalDir(slug) {
  return path.join(CANONICAL_ROOT, slug);
}

function claudeLink(slug) {
  return path.join(CLAUDE_ROOT, slug);
}

function codexLink(slug) {
  return path.join(CODEX_ROOT, slug);
}

function openclawLink(slug) {
  return path.join(OPENCLAW_ROOT, slug);
}

function detectInstalledAgents({ projectDir = null } = {}) {
  const agents = [];
  if (fs.existsSync(path.join(HOME, '.claude'))) agents.push('claude');
  if (fs.existsSync(path.join(HOME, '.codex'))) agents.push('codex');
  if (fs.existsSync(path.join(HOME, '.openclaw'))) agents.push('openclaw');

  if (projectDir && fs.existsSync(path.join(projectDir, '.cursor'))) {
    agents.push('cursor');
  } else if (!projectDir && fs.existsSync(path.join(process.cwd(), '.cursor'))) {
    agents.push('cursor');
  }
  return agents;
}

function readlinkOrNull(p) {
  try {
    const stat = fs.lstatSync(p);
    if (!stat.isSymbolicLink()) return null;
    return fs.readlinkSync(p);
  } catch {
    return null;
  }
}

function inspectTarget(targetPath, canonicalPath) {
  if (!fs.existsSync(targetPath) && !readlinkOrNull(targetPath)) {
    return { kind: 'missing' };
  }
  const linkTarget = readlinkOrNull(targetPath);
  if (linkTarget) {

    const resolved = path.resolve(path.dirname(targetPath), linkTarget);
    if (resolved === canonicalPath) return { kind: 'symlink-ok' };
    return { kind: 'symlink-elsewhere', resolved };
  }
  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) return { kind: 'legacy-copy' };
  return { kind: 'unknown' };
}

function ensureSymlink(linkPath, canonicalPath, { force = false } = {}) {
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });

  const status = inspectTarget(linkPath, canonicalPath);

  if (status.kind === 'missing') {

    const rel = path.relative(path.dirname(linkPath), canonicalPath);
    fs.symlinkSync(rel, linkPath);
    return 'created';
  }
  if (status.kind === 'symlink-ok') return 'noop';
  if (status.kind === 'symlink-elsewhere') {
    fs.unlinkSync(linkPath);
    const rel = path.relative(path.dirname(linkPath), canonicalPath);
    fs.symlinkSync(rel, linkPath);
    return 'relinked';
  }
  if (status.kind === 'legacy-copy') {
    if (!force) return 'skipped-legacy';
    fs.rmSync(linkPath, { recursive: true, force: true });
    const rel = path.relative(path.dirname(linkPath), canonicalPath);
    fs.symlinkSync(rel, linkPath);
    return 'force-replaced';
  }

  return 'skipped-legacy';
}

function placeForClaude(slug, { force = false } = {}) {
  return ensureSymlink(claudeLink(slug), canonicalDir(slug), { force });
}

function placeForCodex(slug, { force = false } = {}) {
  return ensureSymlink(codexLink(slug), canonicalDir(slug), { force });
}

function placeForOpenclaw(slug, { force = false } = {}) {
  return ensureSymlink(openclawLink(slug), canonicalDir(slug), { force });
}

function placeForCursor(slug, projectDir) {
  if (!projectDir) {
    throw new Error('placeForCursor requires a projectDir.');
  }
  const canonical = canonicalDir(slug);
  const skillPath = path.join(canonical, 'SKILL.md');
  if (!fs.existsSync(skillPath)) {
    throw new Error(`Missing SKILL.md at ${skillPath}`);
  }
  const rulesDir = path.join(projectDir, '.cursor', 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  const fileName = slug.startsWith('moatt-') ? `${slug}.mdc` : `moatt-${slug}.mdc`;
  const rulePath = path.join(rulesDir, fileName);
  const skillContent = fs.readFileSync(skillPath, 'utf8');
  fs.writeFileSync(rulePath, renderCursorRule(slug, skillContent), 'utf8');
  return rulePath;
}

function listInstalledCanonical() {
  if (!fs.existsSync(CANONICAL_ROOT)) return [];
  const out = [];
  for (const entry of fs.readdirSync(CANONICAL_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    const dir = path.join(CANONICAL_ROOT, slug);
    if (fs.existsSync(path.join(dir, 'SKILL.md'))) {
      out.push({ slug, path: dir });
    }
  }
  return out;
}

function detectLegacyClaudeCopy(slug) {
  const linkPath = claudeLink(slug);
  if (!fs.existsSync(linkPath)) return false;
  if (readlinkOrNull(linkPath)) return false;
  const skillMd = path.join(linkPath, 'SKILL.md');
  return fs.existsSync(skillMd);
}

module.exports = {
  CANONICAL_ROOT,
  CLAUDE_ROOT,
  CODEX_ROOT,
  OPENCLAW_ROOT,
  canonicalDir,
  claudeLink,
  codexLink,
  openclawLink,
  detectInstalledAgents,
  ensureSymlink,
  inspectTarget,
  placeForClaude,
  placeForCodex,
  placeForOpenclaw,
  placeForCursor,
  listInstalledCanonical,
  detectLegacyClaudeCopy,
};
