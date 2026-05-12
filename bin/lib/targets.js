/**
 * Per-agent install adapters.
 *
 * Each supported coding agent has a different layout convention for where
 * skills live on disk. This module turns a single skill directory into the
 * shape each target expects — a copy under the agent's skills root for
 * Claude/Codex, or a synthesised .cursor rule for Cursor.
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse the positional + flag arguments handed to `moatt install`.
 *
 * Returns `{ slug, target, projectDir }`. Throws with a usage hint on any
 * malformed input — the CLI catches and prints those.
 */
function parseInstallOptions(args) {
  if (!args[0] || args[0].startsWith('--')) {
    throw new Error('Usage: npx moatt install <slug> [--claude|--codex|--cursor] [--project-dir <path>]');
  }

  const slug = args[0];
  let target = 'claude';
  let projectDir = null;
  const targetFlags = [];

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--claude' || arg === '--codex' || arg === '--cursor') {
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
    throw new Error(`Unknown option: ${arg}`);
  }

  if (targetFlags.length > 1) {
    throw new Error('Pick at most one of --claude, --codex, --cursor.');
  }

  if (targetFlags.length === 1) {
    target = targetFlags[0].replace(/^--/, '');
  }

  if (target === 'cursor' && !projectDir) {
    throw new Error('--cursor needs a --project-dir <path> to know where to write the rule.');
  }

  return { slug, target, projectDir };
}

/**
 * Wrap a SKILL.md body in the Cursor rule envelope (frontmatter + a single
 * always-on instruction). Cursor reads `.cursor/rules/*.mdc` files at the
 * project root and surfaces them as agent-readable rules.
 */
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

/**
 * Drop a skill directory into the Codex skills root by recursive copy.
 * Refuses to clobber an existing destination — the caller can blow it away
 * and retry if they actually want to overwrite.
 */
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

/**
 * Materialise a skill as a Cursor rule under <project>/.cursor/rules/.
 * The rule filename is namespaced with a `moatt-` prefix to avoid clashes
 * with rules the user wrote themselves — except when the slug already
 * carries the prefix, in which case we'd otherwise emit `moatt-moatt-foo`.
 */
function placeForCursor(sourceSkillDir, projectDir) {
  const slug = path.basename(sourceSkillDir);
  const skillPath = path.join(sourceSkillDir, 'SKILL.md');
  if (!fs.existsSync(skillPath)) {
    throw new Error(`Missing SKILL.md at ${skillPath}`);
  }

  const rulesDir = path.join(projectDir, '.cursor', 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  // Slugs already prefixed with "moatt-" don't need a second prefix.
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
