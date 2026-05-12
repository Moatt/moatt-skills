// Catalog acceptance suite.
//
// Verifies structural invariants of the skills catalog: every skill
// directory carries a SKILL.md + skill.meta.json pair, manifests align
// with their on-disk location, and the index/registry builder produces
// the shape downstream consumers expect.
//
// Run with `npm test`.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'skills');
const CATEGORY_DIRS = ['moves', 'plays', 'moats'];

function listSkillDirs(category) {
  const dir = path.join(SKILLS_DIR, category);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function readMeta(category, slug) {
  const metaPath = path.join(SKILLS_DIR, category, slug, 'skill.meta.json');
  return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
}

test('skills/ contains exactly the four expected top-level directories', () => {
  const entries = fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  assert.deepEqual(entries, ['kits', 'moats', 'moves', 'plays']);
});

for (const category of CATEGORY_DIRS) {
  test(`every skill in skills/${category}/ has both SKILL.md and skill.meta.json`, () => {
    for (const slug of listSkillDirs(category)) {
      const dir = path.join(SKILLS_DIR, category, slug);
      assert.ok(
        fs.existsSync(path.join(dir, 'SKILL.md')),
        `${category}/${slug}: missing SKILL.md`,
      );
      assert.ok(
        fs.existsSync(path.join(dir, 'skill.meta.json')),
        `${category}/${slug}: missing skill.meta.json`,
      );
    }
  });

  test(`every manifest in skills/${category}/ declares category="${category}"`, () => {
    for (const slug of listSkillDirs(category)) {
      const meta = readMeta(category, slug);
      assert.equal(
        meta.category,
        category,
        `${category}/${slug}: meta.category=${meta.category}`,
      );
    }
  });

  test(`every manifest slug in skills/${category}/ matches its directory name`, () => {
    for (const slug of listSkillDirs(category)) {
      const meta = readMeta(category, slug);
      assert.equal(meta.slug, slug, `${category}/${slug}: meta.slug=${meta.slug}`);
    }
  });
}

test('every kit ships a kit.meta.json whose slug matches its directory', () => {
  const kitsDir = path.join(SKILLS_DIR, 'kits');
  assert.ok(fs.existsSync(kitsDir), 'skills/kits/ missing');

  // Kits are nested one level deeper under an axis directory.
  const axisDirs = fs
    .readdirSync(kitsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let kitCount = 0;
  for (const axis of axisDirs) {
    const axisPath = path.join(kitsDir, axis);
    const kits = fs
      .readdirSync(axisPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const slug of kits) {
      const metaPath = path.join(axisPath, slug, 'kit.meta.json');
      assert.ok(fs.existsSync(metaPath), `${axis}/${slug}: missing kit.meta.json`);
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      assert.equal(meta.slug, slug, `${axis}/${slug}: meta.slug mismatch`);
      kitCount++;
    }
  }

  assert.ok(kitCount > 0, 'expected at least one kit under skills/kits/<axis>/');
});

test('build:index runs cleanly and emits a well-shaped index + registry', () => {
  execSync('node scripts/build-index.js', { cwd: ROOT, stdio: 'pipe' });

  const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'skills-index.json'), 'utf8'));
  assert.ok(Array.isArray(idx.skills), 'index.skills not an array');
  assert.ok(Array.isArray(idx.kits), 'index.kits not an array');

  // Every standalone skill in skills/<cat>/ must appear by slug.
  const indexSlugs = new Set(idx.skills.map((s) => s.slug));
  for (const cat of CATEGORY_DIRS) {
    for (const slug of listSkillDirs(cat)) {
      assert.ok(indexSlugs.has(slug), `standalone skill "${slug}" missing from index`);
    }
  }

  const categoriesInIndex = [...new Set(idx.skills.map((s) => s.category))].sort();
  for (const c of categoriesInIndex) {
    assert.ok(['moats', 'moves', 'plays'].includes(c), `unexpected category in index: ${c}`);
  }

  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry.json'), 'utf8'));
  assert.ok(Array.isArray(registry.skills), 'registry.skills not an array');
});

test('validate:skills passes against the freshly built index', () => {
  execSync('node scripts/build-index.js', { cwd: ROOT, stdio: 'pipe' });
  execSync('node scripts/validate-skills.js', { cwd: ROOT, stdio: 'pipe' });
});
