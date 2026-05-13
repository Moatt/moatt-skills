

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const registry = require('./registry');
const installTargets = require('./install-targets');

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function relPathForLocal(remoteFilePath, skillRepoPath) {

  return path.relative(skillRepoPath, remoteFilePath);
}

async function diffAndApplyOne(slug, remote, canonical) {
  const summary = { updated: [], unchanged: [], removed: [], added: [] };

  if (!Array.isArray(remote.files) || remote.files.length === 0) {
    return summary;
  }

  const expectedLocalFiles = new Set();

  for (const remoteFilePath of remote.files) {
    const rel = relPathForLocal(remoteFilePath, remote.path);
    const localPath = path.join(canonical, rel);
    expectedLocalFiles.add(path.normalize(localPath));

    const url = registry.rawUrl(remoteFilePath);
    let remoteBuf;
    try {
      remoteBuf = await registry.fetchBuffer(url);
    } catch (err) {
      summary.updated.push(`[FAILED] ${rel}: ${err.message}`);
      continue;
    }

    const exists = fs.existsSync(localPath);
    if (exists) {
      const localBuf = fs.readFileSync(localPath);
      if (sha256(localBuf) === sha256(remoteBuf)) {
        summary.unchanged.push(rel);
        continue;
      }
      fs.writeFileSync(localPath, remoteBuf);
      summary.updated.push(rel);
    } else {
      fs.mkdirSync(path.dirname(localPath), { recursive: true });
      fs.writeFileSync(localPath, remoteBuf);
      summary.added.push(rel);
    }
  }

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);

        try {
          if (fs.readdirSync(full).length === 0) fs.rmdirSync(full);
        } catch {}
        continue;
      }
      if (!expectedLocalFiles.has(path.normalize(full))) {
        fs.unlinkSync(full);
        summary.removed.push(path.relative(canonical, full));
      }
    }
  };
  walk(canonical);

  return summary;
}

function summarize(slug, summary) {
  const changes =
    summary.updated.length + summary.added.length + summary.removed.length;
  if (changes === 0) {
    console.log(`  ${slug}: up to date (${summary.unchanged.length} files)`);
    return;
  }
  const parts = [];
  if (summary.added.length) parts.push(`${summary.added.length} added`);
  if (summary.updated.length) parts.push(`${summary.updated.length} updated`);
  if (summary.removed.length) parts.push(`${summary.removed.length} removed`);
  console.log(`  ${slug}: ${parts.join(', ')}`);
  for (const f of summary.added) console.log(`    + ${f}`);
  for (const f of summary.updated) console.log(`    ~ ${f}`);
  for (const f of summary.removed) console.log(`    - ${f}`);
}

async function update({ specificSlug = null } = {}) {
  const installed = installTargets.listInstalledCanonical();

  if (installed.length === 0) {
    console.log('No Moatt skills are installed yet. Run `npx moatt install <slug>` first.');
    return;
  }

  const toCheck = specificSlug
    ? installed.filter((s) => s.slug === specificSlug)
    : installed;

  if (toCheck.length === 0) {
    console.log(`No installed skill matches "${specificSlug}".`);
    console.log('Installed skills:');
    for (const s of installed) console.log(`  ${s.slug}`);
    process.exit(1);
  }

  console.log(`Updating ${toCheck.length} skill${toCheck.length === 1 ? '' : 's'}...`);
  console.log('');

  let touched = 0;
  for (const local of toCheck) {
    const remote = await registry.getSkillBySlug(local.slug);
    if (!remote) {
      console.log(`  ${local.slug}: not in registry (skipped)`);
      continue;
    }
    const summary = await diffAndApplyOne(local.slug, remote, local.path);
    summarize(local.slug, summary);
    if (summary.added.length || summary.updated.length || summary.removed.length) touched++;
  }

  console.log('');
  if (touched === 0) {
    console.log('Everything is up to date.');
  } else {
    console.log(`Updated ${touched} skill${touched === 1 ? '' : 's'}.`);
  }
}

module.exports = { update };
