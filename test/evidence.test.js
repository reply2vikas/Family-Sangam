// Tests that check the claims made in the README and docs against the actual files.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { files, lintSource } from '../scripts/lint.mjs';
import { progressCases } from './progress.cases.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const shipped = ['public', 'api'].flatMap((d) => files(new URL(`../${d}`, import.meta.url).pathname));

test('no shipped file breaks the lint rules (no innerHTML, eval, var, console.log, keys, long files)', () => {
  const problems = [...shipped, 'scripts/lint.mjs'].flatMap((f) => lintSource(f.replace(/^.*\/(public|api|scripts)\//, '$1/'), readFileSync(f.startsWith('/') ? f : new URL(`../${f}`, import.meta.url), 'utf8')));
  assert.deepEqual(problems, []);
});

test('the linter really catches each rule', () => {
  const bad = 'el.innerHTML = 1;\neval(x);\nvar a;\nconsole.log(1);\nconst k = "AIza' + 'A'.repeat(30) + '";';
  assert.equal(lintSource('public/x.js', bad).length, 5);
  assert.equal(lintSource('public/x.js', 'x\n'.repeat(300)).length, 1);
  assert.deepEqual(lintSource('scripts/x.mjs', 'console.log(1)'), []);
});

test('Content-Security-Policy forbids inline scripts and styles and outside connections', () => {
  const csp = JSON.stringify(JSON.parse(read('vercel.json')).headers);
  for (const part of ["default-src 'self'", "script-src 'self'", "style-src 'self'", "object-src 'none'", "frame-ancestors 'none'"]) assert.ok(csp.includes(part), part);
  assert.ok(!/unsafe-inline|unsafe-eval/.test(csp));
});

test('the page has the basics screen-reader and keyboard users need', () => {
  const html = read('public/index.html');
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<title>[^<]{10,}<\/title>/);
  assert.match(html, /class="skip" href="#main"/);
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
  assert.ok(!/<script(?![^>]*src=)/.test(html), 'no inline script');
  assert.ok(!/ style=/.test(html), 'no inline style attributes');
  assert.match(html, /aria-live="polite"/);
  for (const id of html.match(/<input[^>]*id="([^"]+)"/g) || []) assert.ok(html.includes(`for="${id.match(/id="([^"]+)"/)[1]}"`), id);
});

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('text colour pairs in styles.css meet WCAG AA (4.5:1)', () => {
  const css = read('public/styles.css');
  const v = Object.fromEntries([...css.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6});/g)].map((m) => [m[1], m[2]]));
  const pairs = [['ink', 'bg'], ['ink', 'card'], ['muted', 'bg'], ['muted', 'card'], ['brand-ink', 'brand'], ['accent-ink', 'accent'], ['accent', 'card'], ['accent', 'bg'],
    ['warn', 'warn-bg'], ['ok', 'ok-bg'], ['amber', 'amber-bg'], ['warn', 'card'], ['focus', 'bg']];
  for (const [fg, bg] of pairs) assert.ok(ratio(v[fg], v[bg]) >= 4.5, `${fg} on ${bg}: ${ratio(v[fg], v[bg]).toFixed(2)}`);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media print/);
});

test('the API key is only read on the server and never appears in browser code', () => {
  for (const f of shipped.filter((p) => p.includes('/public/'))) assert.ok(!/GEMINI|process\.env/.test(readFileSync(f, 'utf8')), f);
  assert.ok(!/AIza[0-9A-Za-z_-]{20,}/.test(read('README.md') + read('.env.example')));
  assert.ok(existsSync(new URL('../.env.example', import.meta.url)));
  assert.match(read('.gitignore'), /^\.env$/m);
});

test('the project has zero runtime dependencies', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(Object.keys(pkg.dependencies || {}).length, 0);
  assert.equal(Object.keys(pkg.devDependencies || {}).length, 0);
});

test('the docs promised in the README exist and are not empty', () => {
  for (const f of ['README.md', 'docs/ARCHITECTURE.md', 'docs/GENAI.md', 'docs/SECURITY.md', 'docs/ACCESSIBILITY.md', 'docs/TESTING.md', 'LICENSE']) {
    assert.ok(read(f).length > 400, f);
  }
  const readme = read('README.md');
  for (const link of readme.match(/docs\/[A-Z]+\.md/g) || []) assert.ok(existsSync(new URL(`../${link}`, import.meta.url)), link);
});

test('saved-progress cleaning drops malformed entries', progressCases);
