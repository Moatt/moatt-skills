#!/usr/bin/env node

/**
 * moatt — installer CLI for Moatt Skills.
 *
 * Pulls skill files from the public catalog and lands them in the layout
 * expected by your coding agent (Claude Code, Cursor, or Codex).
 *
 *   npx moatt install <slug> [--claude|--codex|--cursor] [--project-dir <path>]
 *   npx moatt list
 *   npx moatt info <slug>
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const {
  parseInstallOptions,
  placeForCodex,
  placeForCursor,
} = require('./lib/targets');

const REPO = 'Karmable-AI/moatt-skills-v3';
const BRANCH = 'main';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;
const INDEX_URL = `${RAW_BASE}/skills-index.json`;

// ── HTTP helper ──────────────────────────────────────────────────────────
//
// Plain `https.get` with manual redirect chasing — keeps the CLI dependency-
// free (no axios, no fetch polyfill) so `npx moatt` boots fast.
function fetch(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https.get(u, { headers: { 'User-Agent': 'moatt-cli' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${u}`));
          return;
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      }).on('error', reject);
    };
    get(url);
  });
}

async function fetchIndex() {
  try {
    const data = await fetch(INDEX_URL);
    return JSON.parse(data);
  } catch (err) {
    console.error(`Failed to fetch skill index: ${err.message}`);
    console.error('Make sure you have internet access.');
    process.exit(1);
  }
}

function getInstallDir(slug) {
  const home = process.env.HOME || process.env.USERPROFILE;
  return path.join(home, '.claude', 'skills', slug);
}

function getCodexSkillsRoot() {
  const home = process.env.HOME || process.env.USERPROFILE;
  return path.join(home, '.codex', 'skills');
}

// Shared Python helpers that some skills depend on. When a skill's metadata
// declares `requires_tools: ["apify_guard"]`, we fetch and drop the listed
// files into the install dir alongside the skill itself.
const TOOL_FILE_MAP = {
  apify_guard: ['tools/apify_guard.py'],
  supabase: ['tools/supabase/__init__.py', 'tools/supabase/supabase_client.py'],
  dataforseo_proxy: ['tools/dataforseo_proxy.py'],
};

async function downloadSkillFiles(skill, installDir) {
  let downloaded = 0;
  for (const filePath of skill.files) {
    const url = `${RAW_BASE}/${filePath}`;
    const localPath = path.join(installDir, path.relative(skill.path, filePath));
    const localDir = path.dirname(localPath);

    fs.mkdirSync(localDir, { recursive: true });

    try {
      const content = await fetch(url);
      fs.writeFileSync(localPath, content);
      downloaded++;
      console.log(`    ${path.relative(installDir, localPath)}`);
    } catch (err) {
      console.error(`    [FAILED] ${filePath}: ${err.message}`);
    }
  }

  // Pull any shared tool files the skill declares.
  const requiresTools = skill.metadata?.requires_tools || [];
  for (const toolName of requiresTools) {
    const toolFiles = TOOL_FILE_MAP[toolName];
    if (!toolFiles) continue;
    for (const toolPath of toolFiles) {
      const url = `${RAW_BASE}/${toolPath}`;
      const localPath = path.join(installDir, toolPath);
      const localDir = path.dirname(localPath);
      fs.mkdirSync(localDir, { recursive: true });
      try {
        const content = await fetch(url);
        fs.writeFileSync(localPath, content);
        downloaded++;
        console.log(`    ${toolPath} (shared tool)`);
      } catch (err) {
        console.error(`    [FAILED] ${toolPath}: ${err.message}`);
      }
    }
  }

  return downloaded;
}

async function installKit(kit, options) {
  const { target, projectDir } = options;

  console.log(`Installing kit "${kit.name}" (${kit.skills.length} skills)...\n`);

  // Grab any shared files at the kit root once — we'll fan them out into
  // each kit-internal sub-skill below.
  const sharedContents = {};
  for (const sharedPath of kit.shared_files || []) {
    const url = `${RAW_BASE}/${sharedPath}`;
    try {
      sharedContents[path.basename(sharedPath)] = await fetch(url);
    } catch (err) {
      console.error(`  [WARN] Could not fetch shared file ${sharedPath}: ${err.message}`);
    }
  }

  for (const subSkill of kit.skills) {
    const installDir = getInstallDir(subSkill.slug);
    const isRegistry = subSkill.source === 'registry';
    const label = isRegistry ? `${subSkill.slug} (registry)` : subSkill.slug;
    console.log(`  ${label} → ${installDir}`);
    fs.mkdirSync(installDir, { recursive: true });

    await downloadSkillFiles(subSkill, installDir);

    // Registry sub-skills are already self-contained; only kit-internal
    // sub-skills get the shared-config copy.
    if (!isRegistry) {
      for (const [filename, content] of Object.entries(sharedContents)) {
        fs.writeFileSync(path.join(installDir, filename), content);
        console.log(`    ${filename} (shared)`);
      }
    }

    if (target === 'codex') {
      placeForCodex(installDir, getCodexSkillsRoot());
    } else if (target === 'cursor') {
      placeForCursor(installDir, projectDir);
    }
  }

  console.log(`\nInstalled ${kit.skills.length} skills from kit "${kit.name}".`);

  if (target === 'codex') {
    console.log('\nNext step (Codex):');
    console.log('  Restart Codex to pick up the new skills.');
  } else if (target === 'cursor') {
    console.log('\nNext step (Cursor):');
    console.log('  Open Cursor in that project to load the new rules.');
  } else {
    console.log(`\nNext step (Claude Code):`);
    for (const subSkill of kit.skills) {
      console.log(`  cp -r ${getInstallDir(subSkill.slug)}/SKILL.md .claude/skills/${subSkill.slug}.md`);
    }
  }
}

async function installSkill(options) {
  const { slug, target, projectDir } = options;
  const index = await fetchIndex();

  // Kits get the kit-installer path; everything else is a single skill.
  const kit = (index.kits || []).find((p) => p.slug === slug);
  if (kit) {
    return installKit(kit, options);
  }

  const skill = index.skills.find((s) => s.slug === slug);

  if (!skill) {
    console.error(`Skill "${slug}" not found.`);
    console.error(`Run "npx moatt list" to see available skills.`);
    process.exit(1);
  }

  // Walk `requires_skills` first and install any missing dependencies before
  // we tackle the requested skill itself.
  const requiresSkills = skill.metadata?.requires_skills || [];
  const installedDeps = [];
  if (requiresSkills.length > 0) {
    console.log(`\nInstalling ${requiresSkills.length} dependency skill(s) first...\n`);
    for (const depSlug of requiresSkills) {
      const depSkill = index.skills.find((s) => s.slug === depSlug);
      if (!depSkill) {
        console.error(`  [WARN] Dependency "${depSlug}" not found in index, skipping.`);
        continue;
      }
      const depDir = getInstallDir(depSlug);
      if (fs.existsSync(path.join(depDir, 'SKILL.md'))) {
        console.log(`  ${depSlug} — already installed`);
        installedDeps.push(depSlug);
        continue;
      }
      console.log(`  ${depSlug} → ${depDir}`);
      fs.mkdirSync(depDir, { recursive: true });
      await downloadSkillFiles(depSkill, depDir);
      installedDeps.push(depSlug);

      if (target === 'codex') {
        placeForCodex(depDir, getCodexSkillsRoot());
      } else if (target === 'cursor') {
        placeForCursor(depDir, projectDir);
      }
    }
    console.log('');
  }

  const installDir = getInstallDir(slug);
  console.log(`Installing ${skill.name} to ${installDir}...`);

  // Make sure the destination exists before we start writing files into it.
  fs.mkdirSync(installDir, { recursive: true });

  const downloaded = await downloadSkillFiles(skill, installDir);

  console.log(`\nInstalled ${downloaded}/${skill.files.length} files.`);
  if (installedDeps.length > 0) {
    console.log(`Dependencies installed: ${installedDeps.join(', ')}`);
  }
  console.log(`Primary location: ${installDir}`);

  if (target === 'codex') {
    const codexDir = placeForCodex(installDir, getCodexSkillsRoot());
    console.log(`Codex location: ${codexDir}`);
    console.log('\nNext step (Codex):');
    console.log('  Restart Codex to pick up the new skill.');
    return;
  }

  if (target === 'cursor') {
    const cursorRule = placeForCursor(installDir, projectDir);
    console.log(`Cursor rule: ${cursorRule}`);
    console.log('\nNext step (Cursor):');
    console.log('  Open Cursor in that project so it can load the new rule.');
    return;
  }

  console.log(`\nNext step (Claude Code):`);
  console.log(`  cp -r ${installDir}/SKILL.md .claude/skills/${slug}.md`);
  console.log(`  # Or reference directly: ${installDir}/SKILL.md`);
}

async function listSkills() {
  const index = await fetchIndex();
  const kits = index.kits || [];

  console.log(`Available skills (${index.skills.length}) and kits (${kits.length}):\n`);

  // Kits get their own block at the top — they're the most discoverable
  // unit for a new user, and we want to surface them before drilling into
  // categories.
  if (kits.length > 0) {
    console.log(`  KITS (${kits.length})`);
    for (const kit of kits) {
      const desc = kit.description.length > 70
        ? kit.description.slice(0, 67) + '...'
        : kit.description;
      console.log(`    ${kit.slug.padEnd(35)} ${desc}`);
      console.log(`      Skills: ${kit.skills.map((s) => s.slug).join(', ')}`);
    }
    console.log('');
  }

  const categories = {};
  for (const skill of index.skills) {
    if (!categories[skill.category]) categories[skill.category] = [];
    categories[skill.category].push(skill);
  }

  for (const [cat, skills] of Object.entries(categories)) {
    console.log(`  ${cat.toUpperCase()} (${skills.length})`);
    for (const skill of skills) {
      const desc = skill.description.length > 70
        ? skill.description.slice(0, 67) + '...'
        : skill.description;
      console.log(`    ${skill.slug.padEnd(35)} ${desc}`);
    }
    console.log('');
  }

  console.log(`Install: npx moatt install <slug>`);
}

async function showInfo(slug) {
  const index = await fetchIndex();
  const skill = index.skills.find((s) => s.slug === slug);
  const kit = (index.kits || []).find((p) => p.slug === slug);

  if (!skill && !kit) {
    console.error(`Skill "${slug}" not found.`);
    process.exit(1);
  }

  if (kit) {
    const totalFiles = kit.skills.reduce((sum, s) => sum + s.files.length, 0);
    console.log(`${kit.name} (kit)`);
    console.log(`${'='.repeat(kit.name.length + 6)}`);
    console.log(`Description: ${kit.description}`);
    if (kit.tags) console.log(`Tags: ${kit.tags}`);
    console.log(`Files: ${totalFiles} across ${kit.skills.length} skills`);
    console.log(`\nSkills (${kit.skills.length}):`);
    for (const s of kit.skills) {
      const desc = s.description.length > 60
        ? s.description.slice(0, 57) + '...'
        : s.description;
      console.log(`  ${s.slug.padEnd(25)} ${desc}`);
    }
    console.log(`\nInstall all: npx moatt install ${kit.slug}`);
    console.log(`GitHub: https://github.com/${REPO}/tree/${BRANCH}/${kit.path}`);
    return;
  }

  console.log(`${skill.name}`);
  console.log(`${'='.repeat(skill.name.length)}`);
  console.log(`Category: ${skill.category}`);
  console.log(`Description: ${skill.description}`);
  if (skill.tags) console.log(`Tags: ${skill.tags}`);
  console.log(`Files: ${skill.files.length}`);
  console.log(`\nInstall: npx moatt install ${skill.slug}`);
  console.log(`GitHub: https://github.com/${REPO}/tree/${BRANCH}/${skill.path}`);
}

// ── Dispatch ─────────────────────────────────────────────────────────────
const [,, command, ...args] = process.argv;

switch (command) {
  case 'install':
    try {
      const options = parseInstallOptions(args);
      installSkill(options).catch((err) => {
        console.error(err.message);
        process.exit(1);
      });
    } catch (err) {
      console.error(err.message);
      console.error('Usage: npx moatt install <slug> [--claude|--codex|--cursor] [--project-dir <path>]');
      process.exit(1);
    }
    break;
  case 'list':
    listSkills();
    break;
  case 'info':
    if (!args[0]) {
      console.error('Usage: npx moatt info <slug>');
      process.exit(1);
    }
    showInfo(args[0]);
    break;
  default:
    console.log('moatt — GTM skills for AI coding agents\n');
    console.log('Commands:');
    console.log('  install <slug>   Install a skill or kit');
    console.log('  list             List available skills and kits');
    console.log('  info <slug>      Show skill or kit details');
    console.log('\nExamples:');
    console.log('  npx moatt list');
    console.log('  npx moatt install reddit-post-finder');
    console.log('  npx moatt install reddit-post-finder --codex');
    console.log('  npx moatt install reddit-post-finder --cursor --project-dir /path/to/project');
    console.log('  npx moatt install lead-gen-devtools          # Install a kit');
    break;
}
