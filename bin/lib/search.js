

const registry = require('./registry');

function tokenize(q) {
  return q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function scoreEntry(entry, query, tokens) {
  const slug = (entry.slug || '').toLowerCase();
  const name = (entry.name || '').toLowerCase();
  const desc = (entry.description || '').toLowerCase();
  const tags = Array.isArray(entry.tags) ? entry.tags.map((t) => String(t).toLowerCase()) : [];

  if (!tokens.length) return 0;

  let score = 0;
  if (slug === query.toLowerCase()) score += 10;
  if (tokens.every((t) => slug.includes(t))) score += 5;
  for (const t of tokens) {
    if (name.includes(t)) score += 3;
    if (tags.includes(t)) score += 2;
    if (desc.includes(t)) score += 1;
  }
  return score;
}

function shape(entry, score, kind) {
  return {
    kind,
    slug: entry.slug,
    name: entry.name,
    category: entry.category || null,
    description: entry.description,
    tags: entry.tags || [],
    score,
    install: `npx moatt install ${entry.slug}`,
  };
}

function printHumanTable(rows) {
  if (rows.length === 0) {
    console.log('No matching skills.');
    return;
  }
  console.log('');
  for (const r of rows) {
    const tag = r.kind === 'kit' ? '[kit] ' : '';
    const desc = r.description.length > 90 ? r.description.slice(0, 87) + '...' : r.description;
    console.log(`  ${tag}${r.slug.padEnd(30)} ${desc}`);
  }
  console.log('');
  console.log(`  Install with: npx moatt install <slug>`);
  console.log('');
}

async function search({ query, limit = 20, human = false } = {}) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    console.error('Usage: npx moatt search "<query>" [--limit N] [--human]');
    process.exit(1);
  }

  const tokens = tokenize(query);
  const index = await registry.fetchIndex();

  const skillHits = (index.skills || [])
    .map((s) => shape(s, scoreEntry(s, query, tokens), 'skill'))
    .filter((h) => h.score > 0);

  const kitHits = (index.kits || [])
    .map((p) => shape(p, scoreEntry(p, query, tokens), 'kit'))
    .filter((h) => h.score > 0);

  const all = [...kitHits, ...skillHits].sort((a, b) => b.score - a.score).slice(0, limit);

  if (human) {
    printHumanTable(all);
  } else {
    console.log(JSON.stringify(all, null, 2));
  }
}

module.exports = { search };
