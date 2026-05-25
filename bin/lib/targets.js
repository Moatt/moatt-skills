

const fs = require('fs');
const path = require('path');

function parseInstallOptions(args) {
  if (!args[0] || args[0].startsWith('--')) {
    throw new Error('Usage: npx moatt install <slug> [--claude|--codex|--openclaw|--cursor] [--project-dir <path>] [--force]');
  }

  const slug = args[0];

  let target = null;
  let projectDir = null;
  let force = false;
  const targetFlags = [];

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--claude' || arg === '--codex' || arg === '--openclaw' || arg === '--cursor') {
      targetFlags.push(arg);
      continue;
    }
    if (arg === '--project-dir') {
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('Flag --project-dir needs a path argument.');
      }
      projectDir = path.resolve(next);
      i++;
      continue;
    }
    if (arg === '--force') {
      force = true;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  if (targetFlags.length > 1) {
    throw new Error('Pick at most one of --claude, --codex, --openclaw, --cursor.');
  }

  if (targetFlags.length === 1) {
    target = targetFlags[0].replace(/^--/, '');
  }

  if (target === 'cursor' && !projectDir) {
    throw new Error('--cursor needs a --project-dir <path> to know where to write the rule.');
  }

  return { slug, target, projectDir, force };
}

function renderCursorRule(slug, skillContent) {
  return [
    '---',
    `description: Moatt skill instructions for ${slug}`,
    'alwaysApply: false',
    '---',
    '',
    'Always apply this rule when the user requests this Moatt skill workflow.',
    '',
    skillContent.trim(),
    '',
  ].join('\n');
}

function placeForCodex(sourceSkillDir, codexSkillsRoot) {
  const slug = path.basename(sourceSkillDir);
  const destinationDir = path.join(codexSkillsRoot, slug);
  if (fs.existsSync(destinationDir)) {
    throw new Error(`Codex slot already taken: ${destinationDir}`);
  }
  fs.mkdirSync(codexSkillsRoot, { recursive: true });
  fs.cpSync(sourceSkillDir, destinationDir, { recursive: true });
  return destinationDir;
}

function placeForCursor(sourceSkillDir, projectDir) {
  const slug = path.basename(sourceSkillDir);
  const skillPath = path.join(sourceSkillDir, 'SKILL.md');
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

module.exports = {
  parseInstallOptions,
  renderCursorRule,
  placeForCodex,
  placeForCursor,
};
