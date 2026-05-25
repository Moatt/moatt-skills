#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const registry = require('./lib/registry');
const installTargets = require('./lib/install-targets');
const { parseInstallOptions } = require('./lib/targets');
const { search } = require('./lib/search');
const { update } = require('./lib/update');
const { login } = require('./lib/login');
const auth = require('./lib/auth-commands');

const REPO = registry.REPO;
const BRANCH = registry.BRANCH;
const RAW_BASE = registry.RAW_BASE;

const TOOL_FILE_MAP = {
  apify_guard: ['tools/apify_guard.py'],
  supabase: ['tools/supabase/__init__.py', 'tools/supabase/supabase_client.py'],
  dataforseo_proxy: ['tools/dataforseo_proxy.py'],
};

async function fetchIndexOrDie() {
  try {
    return await registry.fetchIndex();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

async function downloadSkillFiles(skill, canonical) {
  let downloaded = 0;
  for (const filePath of skill.files) {
    const url = registry.rawUrl(filePath);
    const localPath = path.join(canonical, path.relative(skill.path, filePath));
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    try {
      const content = await registry.fetch(url);
      fs.writeFileSync(localPath, content);
      downloaded++;
      console.log(`    ${path.relative(canonical, localPath)}`);
    } catch (err) {
      console.error(`    [FAILED] ${filePath}: ${err.message}`);
    }
  }

  const requiresTools = skill.metadata?.requires_tools || [];
  for (const toolName of requiresTools) {
    const toolFiles = TOOL_FILE_MAP[toolName];
    if (!toolFiles) continue;
    for (const toolPath of toolFiles) {
      const url = registry.rawUrl(toolPath);
      const localPath = path.join(canonical, toolPath);
      fs.mkdirSync(path.dirname(localPath), { recursive: true });
      try {
        const content = await registry.fetch(url);
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

function resolveAgents({ target, projectDir }) {
  if (target === 'claude') return ['claude'];
  if (target === 'codex') return ['codex'];
  if (target === 'openclaw') return ['openclaw'];
  if (target === 'cursor') return ['cursor'];

  const detected = installTargets.detectInstalledAgents({ projectDir });
  if (detected.length === 0) {

    return ['claude'];
  }
  return detected;
}

function placeForAgents(slug, agents, { force, projectDir }) {
  const placements = [];
  for (const agent of agents) {
    if (agent === 'claude') {
      const result = installTargets.placeForClaude(slug, { force });
      placements.push({ agent, result, path: installTargets.claudeLink(slug) });
    } else if (agent === 'codex') {
      const result = installTargets.placeForCodex(slug, { force });
      placements.push({ agent, result, path: installTargets.codexLink(slug) });
    } else if (agent === 'openclaw') {
      const result = installTargets.placeForOpenclaw(slug, { force });
      placements.push({ agent, result, path: installTargets.openclawLink(slug) });
    } else if (agent === 'cursor') {
      if (!projectDir) {
        placements.push({
          agent,
          result: 'skipped-no-project-dir',
          path: null,
        });
        continue;
      }
      const rulePath = installTargets.placeForCursor(slug, projectDir);
      placements.push({ agent, result: 'created', path: rulePath });
    }
  }
  return placements;
}

function printPlacementSummary(slug, placements) {
  for (const p of placements) {
    const label = `[${p.agent}]`.padEnd(10);
    switch (p.result) {
      case 'created':
        console.log(`  ${label} ${p.path}`);
        break;
      case 'noop':
        console.log(`  ${label} already linked (${p.path})`);
        break;
      case 'relinked':
        console.log(`  ${label} relinked → ${p.path}`);
        break;
      case 'force-replaced':
        console.log(`  ${label} replaced legacy copy → ${p.path}`);
        break;
      case 'skipped-legacy':
        console.log(
          `  ${label} legacy copy detected at ${p.path}. Re-run with --force to convert to a symlink.`
        );
        break;
      case 'skipped-no-project-dir':
        console.log(`  ${label} skipped (Cursor requires --project-dir)`);
        break;
      default:
        console.log(`  ${label} ${p.result}`);
    }
  }
}

async function installKit(kit, options) {
  const { target, projectDir, force } = options;

  console.log(`Installing kit "${kit.name}" (${kit.skills.length} skills)...\n`);

  const sharedContents = {};
  for (const sharedPath of kit.shared_files || []) {
    const url = registry.rawUrl(sharedPath);
    try {
      sharedContents[path.basename(sharedPath)] = await registry.fetch(url);
    } catch (err) {
      console.error(`  [WARN] Could not fetch shared file ${sharedPath}: ${err.message}`);
    }
  }

  const agents = resolveAgents({ target, projectDir });

  for (const subSkill of kit.skills) {
    const canonical = installTargets.canonicalDir(subSkill.slug);
    const isRegistry = subSkill.source === 'registry';
    const sourceLabel = isRegistry ? `${subSkill.slug} (registry)` : subSkill.slug;
    console.log(`  ${sourceLabel} → ${canonical}`);
    fs.mkdirSync(canonical, { recursive: true });

    await downloadSkillFiles(subSkill, canonical);

    if (!isRegistry) {
      for (const [filename, content] of Object.entries(sharedContents)) {
        fs.writeFileSync(path.join(canonical, filename), content);
        console.log(`    ${filename} (shared)`);
      }
    }

    const placements = placeForAgents(subSkill.slug, agents, { force, projectDir });
    printPlacementSummary(subSkill.slug, placements);
  }

  console.log(`\nInstalled ${kit.skills.length} skills from kit "${kit.name}".`);
}

async function installSkill(options) {
  const { slug, target, projectDir, force } = options;
  const index = await fetchIndexOrDie();

  const kit = (index.kits || []).find((p) => p.slug === slug);
  if (kit) {
    return installKit(kit, options);
  }

  const skill = index.skills.find((s) => s.slug === slug);

  if (!skill) {
    console.error(`Skill "${slug}" not found.`);
    console.error(`Run "npx moatt search <query>" or "npx moatt list" to find skills.`);
    process.exit(1);
  }

  const agents = resolveAgents({ target, projectDir });

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
      const depCanonical = installTargets.canonicalDir(depSlug);
      if (fs.existsSync(path.join(depCanonical, 'SKILL.md'))) {
        console.log(`  ${depSlug} — already installed`);
        installedDeps.push(depSlug);
      } else {
        console.log(`  ${depSlug} → ${depCanonical}`);
        fs.mkdirSync(depCanonical, { recursive: true });
        await downloadSkillFiles(depSkill, depCanonical);
        installedDeps.push(depSlug);
      }
      const depPlacements = placeForAgents(depSlug, agents, { force, projectDir });
      printPlacementSummary(depSlug, depPlacements);
    }
    console.log('');
  }

  const canonical = installTargets.canonicalDir(slug);
  console.log(`Installing ${skill.name} to ${canonical}...`);
  fs.mkdirSync(canonical, { recursive: true });

  const downloaded = await downloadSkillFiles(skill, canonical);

  console.log(`\nInstalled ${downloaded}/${skill.files.length} files.`);
  if (installedDeps.length > 0) {
    console.log(`Dependencies installed: ${installedDeps.join(', ')}`);
  }
  console.log(`Canonical: ${canonical}`);

  console.log('');
  const placements = placeForAgents(slug, agents, { force, projectDir });
  printPlacementSummary(slug, placements);
}

async function listSkills() {
  const index = await fetchIndexOrDie();
  const kits = index.kits || [];

  console.log(`Available skills (${index.skills.length}) and kits (${kits.length}):\n`);

  if (kits.length > 0) {
    console.log(`  KITS (${kits.length})`);
    for (const kit of kits) {
      const desc =
        kit.description.length > 70 ? kit.description.slice(0, 67) + '...' : kit.description;
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
      const desc =
        skill.description.length > 70 ? skill.description.slice(0, 67) + '...' : skill.description;
      console.log(`    ${skill.slug.padEnd(35)} ${desc}`);
    }
    console.log('');
  }

  console.log(`Install: npx moatt install <slug>`);
}

async function showInfo(slug) {
  const index = await fetchIndexOrDie();
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
      const desc = s.description.length > 60 ? s.description.slice(0, 57) + '...' : s.description;
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

function die(err) {
  console.error(err.message || err);
  process.exit(1);
}

const [, , command, ...args] = process.argv;

switch (command) {
  case 'install':
    try {
      const options = parseInstallOptions(args);
      installSkill(options).catch(die);
    } catch (err) {
      console.error(err.message);
      console.error(
        'Usage: npx moatt install <slug> [--claude|--codex|--cursor] [--project-dir <path>] [--force]'
      );
      process.exit(1);
    }
    break;
  case 'list':
    listSkills().catch(die);
    break;
  case 'info':
    if (!args[0]) {
      console.error('Usage: npx moatt info <slug>');
      process.exit(1);
    }
    showInfo(args[0]).catch(die);
    break;
  case 'search': {

    const queryParts = [];
    let limit = 20;
    let human = false;
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === '--human') {
        human = true;
        continue;
      }
      if (a === '--limit') {
        const n = parseInt(args[i + 1], 10);
        if (Number.isFinite(n) && n > 0) limit = n;
        i++;
        continue;
      }
      queryParts.push(a);
    }
    const query = queryParts.join(' ');
    search({ query, limit, human }).catch(die);
    break;
  }
  case 'update': {

    const specificSlug = args.find((a) => !a.startsWith('--')) || null;
    update({ specificSlug }).catch(die);
    break;
  }
  case 'login':
    login().catch(die);
    break;
  case 'logout': {
    const all = args.includes('--all');
    auth.logout({ all }).catch(die);
    break;
  }
  case 'whoami':
    auth.whoami();
    break;
  case 'status':
    auth.status().catch(die);
    break;
  case 'credits':
    auth.credits({ human: args.includes('--human') }).catch(die);
    break;
  case 'switch':
    auth.switchProject(args[0]);
    break;
  case 'projects': {
    const sub = args[0] || 'list';
    if (sub === 'list') {
      auth.projectsList();
    } else {
      console.error(`Unknown projects subcommand: ${sub}`);
      console.error('Usage: npx moatt projects list');
      process.exit(1);
    }
    break;
  }
  default:
    console.log('moatt — GTM skills for Claude Code, Cursor, and Codex\n');
    console.log('Auth:');
    console.log('  login              Authenticate via browser, pick a project');
    console.log('  logout [--all]     Clear local credentials (--all also revokes the key)');
    console.log('  whoami             Show current user and project');
    console.log('  status             whoami + credit balance + last-used');
    console.log('  credits [--human]  Print credit balance (JSON by default)');
    console.log('  switch <slug>      Change the current project (local, no browser)');
    console.log('  projects list      List all projects available to your CLI');
    console.log('');
    console.log('Skills:');
    console.log('  search "<query>"   Find skills (JSON output for agents)');
    console.log('                     --human for table form, --limit N to cap results');
    console.log('  install <slug>     Install a skill or kit');
    console.log('                     --claude / --codex / --cursor to target one agent');
    console.log('                     --force to convert legacy copies to symlinks');
    console.log('  update [<slug>]    Refresh installed skills against the registry');
    console.log('  list               List available skills and kits');
    console.log('  info <slug>        Show skill or kit details');
    console.log('');
    console.log('Examples:');
    console.log('  npx moatt login');
    console.log('  npx moatt search "reddit competitor" --human');
    console.log('  npx moatt install reddit-post-finder');
    console.log('  npx moatt update                              # refresh everything');
    console.log('  npx moatt install reddit-post-finder --cursor --project-dir .');
    console.log('  npx moatt install lead-gen-devtools           # install a kit');
    break;
}
