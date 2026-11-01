import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { checkHealth, resetHealth } from '../api/_lib/health.js';
import { resetCooldowns } from '../api/_lib/gemini.js';
import healthHandler from '../api/health.js';

beforeEach(() => { resetHealth(); resetCooldowns(); });
const good = async () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }) });
const KEY = `AIza${'a'.repeat(35)}`;

test('health: no key is reported plainly', async () => {
  const r = await checkHealth({});
  assert.equal(r.keyPresent, false);
  assert.match(r.gemini, /not set/);
});
test('health: a working key is reported as working and the key itself is never returned', async () => {
  const r = await checkHealth({ GEMINI_API_KEY: KEY }, { fetchImpl: good });
  assert.equal(r.gemini, 'working');
  assert.ok(r.keyLooksValid);
  assert.ok(!JSON.stringify(r).includes(KEY));
});
test('health: a failing key shows the reason, and a malformed key is flagged', async () => {
  const r = await checkHealth({ GEMINI_API_KEY: 'short' }, { fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({}) }) });
  assert.equal(r.keyLooksValid, false);
  assert.equal(r.gemini, 'failed: status 403');
});
test('health: odd answers are described and results are cached for a minute', async () => {
  let calls = 0;
  const odd = async () => { calls += 1; return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"ok":false}' }] } }] }) }; };
  const a = await checkHealth({ GEMINI_API_KEY: KEY }, { fetchImpl: odd, now: () => 1000 });
  assert.equal(a.gemini, 'answered but unexpected');
  const b = await checkHealth({ GEMINI_API_KEY: KEY }, { fetchImpl: odd, now: () => 30000 });
  assert.equal(b.cached, true);
  assert.equal(calls, 1);
  await checkHealth({ GEMINI_API_KEY: KEY }, { fetchImpl: odd, now: () => 90000 });
  assert.equal(calls, 2);
});
test('health route: GET works, other methods are refused', async () => {
  const mk = () => { const r = { headers: {}, body: '' }; r.setHeader = (k, v) => { r.headers[k] = v; }; r.end = (b) => { r.body = b; }; return r; };
  const bad = mk(); await healthHandler({ method: 'POST' }, bad); assert.equal(bad.statusCode, 405);
  const ok = mk(); await healthHandler({ method: 'GET' }, ok);
  assert.equal(ok.statusCode, 200);
  assert.equal(JSON.parse(ok.body).keyPresent, Boolean(process.env.GEMINI_API_KEY));
});
