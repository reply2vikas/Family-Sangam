// Integration tests: render the real screens (overview and event cards) with a tiny fake DOM.
import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

class FakeNode {}
class FakeText extends FakeNode { constructor(t) { super(); this.text = t; } }
class FakeEl extends FakeNode {
  constructor(tag, ns) { super(); this.tag = tag; this.ns = ns; this.attrs = {}; this.children = []; this.listeners = {}; }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener(t, fn) { this.listeners[t] = fn; }
  append(...kids) { this.children.push(...kids); }
  replaceChildren(...kids) { this.children = kids; }
  get textContent() { return this.children.map((c) => (c instanceof FakeText ? c.text : c.textContent)).join(''); }
}
const walk = (el, out = []) => { out.push(el); if (el.children) el.children.forEach((c) => c instanceof FakeEl && walk(c, out)); return out; };

let saved;
beforeEach(() => {
  saved = { document: globalThis.document, Node: globalThis.Node };
  globalThis.Node = FakeNode;
  globalThis.document = { createElement: (t) => new FakeEl(t), createElementNS: (ns, t) => new FakeEl(t, ns), createTextNode: (t) => new FakeText(t) };
});
afterEach(() => { globalThis.document = saved.document; globalThis.Node = saved.Node; });

const { renderOverview } = await import('../public/ui/overview.js');
const { renderEvents } = await import('../public/ui/events.js');
const { sampleSeason } = await import('../public/engine/sample.js');
const { buildPlan } = await import('../public/engine/plan.js');
const { cashCalendar } = await import('../public/engine/cash.js');
const { suggestFixes } = await import('../public/engine/fixes.js');

const TODAY = '2026-11-01';
function context(season, overrides = {}) {
  const plan = buildPlan(season);
  const calls = [];
  const ctx = {
    season, plan, today: TODAY, progress: { done: {}, vendors: {} }, ideaCache: {},
    cal: cashCalendar(season, plan), fixes: suggestFixes(season),
    say: (m) => calls.push(['say', m]), applyFix: (f) => calls.push(['fix', f.label]), commit: (s) => calls.push(['commit', s]),
    requestChange: async () => ({}), fetchIdeas: async () => ({}), ask: async () => ({}), readQuote: async () => ({}), draftMessage: async () => ({}),
    copy: async () => {}, setOverride: (...a) => calls.push(['override', ...a]), toggleTask: (k) => calls.push(['task', k]), setVendor: () => {},
    ...overrides,
  };
  return { ctx, calls };
}

test('a season with a wedding, a birthday and a community event renders all three event cards', () => {
  const season = sampleSeason(TODAY);
  const { ctx } = context(season);
  const root = new FakeEl('div');
  renderEvents(root, ctx);
  const text = root.textContent;
  for (const e of season.events) assert.ok(text.includes(e.name), e.name);
  assert.ok(text.includes('Budget') && text.includes('Timeline') && text.includes('Vendor checklist'));
});

test('the overview shows the first short day, a chart with a text label, and a table twin', () => {
  const { ctx } = context(sampleSeason(TODAY));
  const root = new FakeEl('div');
  renderOverview(root, ctx);
  const text = root.textContent;
  assert.match(text, /You run short on/);
  assert.ok(text.includes('Show the same information as a table'));
  const svg = walk(root).find((n) => n.tag === 'svg');
  assert.equal(svg.attrs.role, 'img');
  assert.match(svg.attrs['aria-label'], /Cash balance/);
});

test('pressing "Use this fix" hands the chosen fix to the app, and "Test a bad day" changes nothing', () => {
  const { ctx, calls } = context(sampleSeason(TODAY));
  const root = new FakeEl('div');
  renderOverview(root, ctx);
  const buttons = walk(root).filter((n) => n.tag === 'button');
  buttons.find((b) => b.textContent === 'Use this fix').listeners.click();
  assert.equal(calls.filter((c) => c[0] === 'fix').length, 1);
  const before = JSON.stringify(ctx.season);
  buttons.find((b) => b.textContent.startsWith('Income arrives')).listeners.click();
  assert.equal(JSON.stringify(ctx.season), before);
  assert.ok(walk(root).some((n) => n.textContent.includes('Income arrives')));
});

test('a season with no shortfall shows the "no gap" message and no fixes', () => {
  const rich = { ...sampleSeason(TODAY), startBalance: 90_000_000 };
  const { ctx } = context(rich);
  const root = new FakeEl('div');
  renderOverview(root, ctx);
  const text = root.textContent;
  assert.ok(!text.includes('You run short'));
  assert.ok(text.includes('No gap to fix'));
});

test('empty changes are refused before any request is sent', async () => {
  let asked = 0;
  const { ctx, calls } = context(sampleSeason(TODAY), { requestChange: async () => { asked += 1; return {}; } });
  const root = new FakeEl('div');
  renderOverview(root, ctx);
  walk(root).find((n) => n.tag === 'textarea').value = '   ';
  const check = walk(root).find((n) => n.tag === 'button' && n.textContent === 'Check this change');
  await check.listeners.click();
  assert.equal(asked, 0);
  assert.deepEqual(calls.at(-1), ['say', 'Type the change first.']);
});
