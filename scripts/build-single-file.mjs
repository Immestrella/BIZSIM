import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

const rootDir = resolve(new URL('..', import.meta.url).pathname);
const outputArg = process.argv.find((arg) => arg.startsWith('--out='));
const outputPath = resolve(rootDir, outputArg ? outputArg.slice(6) : 'dist/bizsim.single.js');

const moduleOrder = [
  'src/utils/object.js',
  'src/utils/stCompat.js',
  'src/config/constants.js',
  'src/config/defaultData.js',
  'src/config/defaultPrompts.js',
  'src/config/prompts.js',
  'src/core/BizSimEngine.context.js',
  'src/core/BizSimEngine.simulation.js',
  'src/core/BizSimEngine.audit.js',
  'src/core/BizSimEngine.methods.js',
  'src/core/BizSimEngine.prompt.js',
  'src/core/BizSimEngine.validation.js',
  'src/core/BizSimEngine.js',
  'src/ui/templates.js',
  'src/ui/BizSimUI.worldbook.js',
  'src/ui/BizSimUI.prompts.js',
  'src/ui/BizSimUI.render.js',
  'src/ui/BizSimUI.settings.js',
  'src/ui/BizSimUI.operations.js',
  'src/config/promptModules.js',
  'src/core/BizSimEngine.scaffold.js',
  'src/ui/BizSimUI.scaffoldEditor.js',
  'src/ui/BizSimUI.userPreferences.js',
  'src/ui/BizSimUI.presets.js',
  'src/ui/BizSimUI.integration.js',
  'src/ui/BizSimUI.actions.js',
  'src/ui/BizSimUI.js',
  'src/index.js',
  'main.dev.js',
];

function stripModuleSyntax(source) {
  return source
    .replace(/^import\s+[^;]+;\s*$/gm, '')
    .replace(/^export\s*\{[^}]+\}\s*from\s*['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^export\s+(?=(async\s+)?(class|function|const|let|var)\b)/gm, '')
    .replace(/^export\s*\{[^}]+\};?\s*$/gm, '')
    .replace(/^export\s+default\s+/gm, '');
}

async function main() {
  const parts = [];

  for (const relativePath of moduleOrder) {
    const filePath = resolve(rootDir, relativePath);
    const source = await readFile(filePath, 'utf8');
    parts.push(`// ---- ${relativePath} ----\n${stripModuleSyntax(source).trim()}\n`);
  }

  const output = parts.join('\n');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output, 'utf8');
  console.log(`BizSim single-file build written to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
