import { copyFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'AGENTS.md');
const target = resolve(root, 'CLAUDE.md');
const checkOnly = process.argv.includes('--check');
const sourceText = readFileSync(source, 'utf8');
const targetText = readFileSync(target, 'utf8');

if (sourceText === targetText) {
  console.log('Agent guides are synchronized.');
} else if (checkOnly) {
  console.error('Agent guides differ. Update AGENTS.md, then run: node scripts/sync-agent-guides.mjs');
  process.exit(1);
} else {
  copyFileSync(source, target);
  console.log('Copied AGENTS.md to CLAUDE.md.');
}
