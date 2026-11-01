// Zero-dependency linter for the rules this project promises in its README.
// Run: node scripts/lint.mjs   (exits 1 when a rule is broken)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const MAX_LINES = 260;
const RULES = [
  [/\binnerHTML\b|\bouterHTML\b|insertAdjacentHTML|document\.write\(/, 'no HTML string injection'],
  [/\beval\(|new Function\(/, 'no eval'],
  [/\bvar\s/, 'use let/const'],
  [/console\.(log|debug)\(/, 'no console logging in shipped code'],
  [/AIza[0-9A-Za-z_-]{20,}/, 'no API keys in source'],
];

export function files(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.git'].includes(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) files(full, out);
    else if (['.js', '.mjs'].includes(extname(full))) out.push(full);
  }
  return out;
}

/** Names imported but never used again in the same file. */
export function unusedImports(text) {
  const unused = [];
  for (const m of text.matchAll(/^import\s+(?:(\w+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from/gm)) {
    const names = [m[1], ...(m[2] || '').split(',').map((s) => s.trim().split(/\s+as\s+/).pop())].filter(Boolean);
    for (const name of names) if ((text.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length < 2) unused.push(name);
  }
  return unused;
}

export function lintSource(path, text) {
  const problems = [];
  const lines = text.split('\n');
  if (lines.length > MAX_LINES) problems.push(`${path}: ${lines.length} lines (max ${MAX_LINES})`);
  for (const name of unusedImports(text)) problems.push(`${path}: "${name}" is imported but never used`);
  if (path.startsWith('scripts')) return problems;
  lines.forEach((line, i) => {
    for (const [re, why] of RULES) if (re.test(line)) problems.push(`${path}:${i + 1}: ${why}`);
  });
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = ['public', 'api', 'scripts'].flatMap((d) => files(d)).flatMap((f) => lintSource(f, readFileSync(f, 'utf8')));
  problems.forEach((p) => process.stderr.write(`${p}\n`));
  process.stdout.write(problems.length ? `${problems.length} problem(s)\n` : 'lint ok\n');
  process.exit(problems.length ? 1 : 0);
}
