import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const runtimeDir = resolve(root, '.ai-team', 'runtime');
const statePath = resolve(runtimeDir, 'coordination.json');
const lockPath = resolve(runtimeDir, '.lock');
const command = process.argv[2];
const args = parseArgs(process.argv.slice(3));

function parseArgs(tokens) {
  const values = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith('--')) fail(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    const value = tokens[index + 1];
    if (!value || value.startsWith('--')) fail(`Missing value for --${key}`);
    values[key] = value;
    index += 1;
  }
  return values;
}

function fail(message) {
  console.error(`agent-coord: ${message}`);
  process.exit(1);
}

function required(name) {
  if (!args[name]?.trim()) fail(`--${name} is required`);
  return args[name].trim();
}

function normalizePath(value) {
  const absolute = resolve(root, value);
  const pathFromRoot = relative(root, absolute).replaceAll('\\', '/');
  if (!pathFromRoot || pathFromRoot === '..' || pathFromRoot.startsWith('../')) fail(`Path must be inside the repository: ${value}`);
  return pathFromRoot.replace(/^\/+|\/+$/g, '');
}

function parseFiles() {
  const raw = required('files');
  const files = raw.split(',').map((item) => normalizePath(item.trim())).filter(Boolean);
  if (!files.length) fail('--files must contain at least one repository path');
  return [...new Set(files)];
}

function overlaps(left, right) {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

function defaultState() {
  return { version: 1, claims: [], handoffs: [], notes: [], updatedAt: null };
}

function loadState() {
  try {
    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    return { ...defaultState(), ...state };
  } catch (error) {
    if (error.code === 'ENOENT') return defaultState();
    fail(`Cannot read coordination state: ${error.message}`);
  }
}

function withLock(action) {
  mkdirSync(runtimeDir, { recursive: true });
  const deadline = Date.now() + 5000;
  while (true) {
    try {
      mkdirSync(lockPath);
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') fail(`Cannot acquire state lock: ${error.message}`);
      if (Date.now() > deadline) fail('State is busy. Try again in a few seconds.');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 80);
    }
  }
  try {
    const state = loadState();
    const result = action(state);
    state.updatedAt = new Date().toISOString();
    const tempPath = resolve(dirname(statePath), `coordination-${process.pid}.tmp`);
    writeFileSync(tempPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    renameSync(tempPath, statePath);
    return result;
  } finally {
    rmSync(lockPath, { recursive: true, force: true });
  }
}

function showStatus(state) {
  console.log('Active claims:');
  if (!state.claims.length) console.log('  (none)');
  for (const claim of state.claims) {
    console.log(`  ${claim.agent} | ${claim.task} | ${claim.files.join(', ')}`);
    console.log(`    ${claim.summary} (${claim.claimedAt})`);
  }
  console.log('\nRecent handoffs:');
  const handoffs = state.handoffs.slice(-5).reverse();
  if (!handoffs.length) console.log('  (none)');
  for (const handoff of handoffs) console.log(`  ${handoff.from} → ${handoff.to} | ${handoff.task}: ${handoff.summary} (${handoff.at})`);
}

if (command === 'status') {
  mkdirSync(runtimeDir, { recursive: true });
  showStatus(loadState());
} else if (command === 'claim') {
  const agent = required('agent');
  const task = required('task');
  const files = parseFiles();
  const summary = required('summary');
  withLock((state) => {
    if (state.claims.some((claim) => claim.agent === agent && claim.task === task)) fail(`${agent} already has claim ${task}; release it before claiming again`);
    const conflicts = state.claims.filter((claim) => claim.files.some((owned) => files.some((requested) => overlaps(owned, requested))));
    if (conflicts.length) fail(`Path conflict with ${conflicts.map((claim) => `${claim.agent}/${claim.task} [${claim.files.join(', ')}]`).join('; ')}`);
    state.claims.push({ agent, task, files, summary, claimedAt: new Date().toISOString() });
  });
  console.log(`Claimed ${task} for ${agent}.`);
} else if (command === 'release') {
  const agent = required('agent');
  const task = required('task');
  const summary = required('summary');
  withLock((state) => {
    const before = state.claims.length;
    state.claims = state.claims.filter((claim) => !(claim.agent === agent && claim.task === task));
    if (state.claims.length === before) fail(`No active claim found for ${agent}/${task}`);
    state.notes.push({ agent, task, summary: `Released: ${summary}`, at: new Date().toISOString() });
    state.notes = state.notes.slice(-20);
  });
  console.log(`Released ${task} for ${agent}.`);
} else if (command === 'handoff') {
  const from = required('from');
  const to = required('to');
  const task = required('task');
  const summary = required('summary');
  withLock((state) => {
    state.handoffs.push({ from, to, task, summary, at: new Date().toISOString() });
    state.handoffs = state.handoffs.slice(-20);
  });
  console.log(`Handed off ${task} from ${from} to ${to}.`);
} else if (command === 'note') {
  const agent = required('agent');
  const task = required('task');
  const summary = required('summary');
  withLock((state) => {
    state.notes.push({ agent, task, summary, at: new Date().toISOString() });
    state.notes = state.notes.slice(-20);
  });
  console.log(`Recorded note for ${agent}/${task}.`);
} else {
  fail('Use one of: status, claim, release, handoff, note');
}
