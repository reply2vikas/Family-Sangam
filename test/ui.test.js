// Tests for the browser-side helpers using a tiny fake DOM, so no browser is needed.
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

let saved;
beforeEach(() => {
  saved = { document: globalThis.document, Node: globalThis.Node };
  globalThis.Node = FakeNode;
  globalThis.document = { createElement: (t) => new FakeEl(t), createElementNS: (ns, t) => new FakeEl(t, ns), createTextNode: (t) => new FakeText(t) };
});
afterEach(() => { globalThis.document = saved.document; globalThis.Node = saved.Node; });

const { h, clear, field, svgEl } = await import('../public/ui/h.js');
const { loadState, saveState, clearState } = await import('../public/ui/state.js');
const { postJSON } = await import('../public/ui/api.js');
const { sampleSeason } = await import('../public/engine/sample.js');

test('h builds elements, text nodes and listeners, and skips empty values', () => {
  const click = () => {};
  const el = h('button', { class: 'x', disabled: true, hidden: false, title: null, onclick: click, 'aria-label': 5 }, 'Hi ', 3, null, false, ['a', h('b', {}, 'b')]);
  assert.equal(el.attrs.class, 'x');
  assert.equal(el.attrs.disabled, '');
  assert.equal(el.attrs['aria-label'], '5');
  assert.ok(!('hidden' in el.attrs) && !('title' in el.attrs));
  assert.equal(el.listeners.click, click);
  assert.equal(el.textContent, 'Hi 3ab');
});

test('h never turns text into markup: angle brackets stay text', () => {
  const el = h('p', {}, '<img src=x onerror=alert(1)>');
  assert.equal(el.children.length, 1);
  assert.ok(el.children[0] instanceof FakeText);
  assert.equal(el.tag, 'p');
});

test('h creates SVG elements in the SVG namespace', () => {
  const s = svgEl('circle', { r: 5 });
  assert.equal(s.ns, 'http://www.w3.org/2000/svg');
  assert.equal(h('svg', {}).ns, 'http://www.w3.org/2000/svg');
  assert.ok(!('svg' in s.attrs));
});

test('clear empties an element; field returns a label and an input', () => {
  const el = h('div', {}, 'x');
  assert.equal(clear(el).children.length, 0);
  const [label, input] = field('Name', 'n1', { type: 'text' });
  assert.equal(label.attrs.for, 'n1');
  assert.equal(input.attrs.id, 'n1');
});

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; }, removeItem: (k) => { delete data[k]; }, data };
}

test('state: save then load round-trips, and progress is cleaned', () => {
  globalThis.localStorage = fakeStorage();
  saveState({ season: sampleSeason('2026-11-01'), progress: { done: { 'e1:date': true, '??': true }, vendors: {} } });
  const back = loadState();
  assert.equal(back.season.events.length, 3);
  assert.deepEqual(back.progress.done, { 'e1:date': true });
  clearState();
  assert.equal(loadState(), null);
});

test('state: corrupt, invalid or unavailable storage never throws', () => {
  globalThis.localStorage = fakeStorage({ 'family-sangam:v1': '{not json' });
  assert.equal(loadState(), null);
  globalThis.localStorage = fakeStorage({ 'family-sangam:v1': JSON.stringify({ season: { startDate: 'bad' } }) });
  assert.equal(loadState(), null);
  globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); }, removeItem() { throw new Error('blocked'); } };
  assert.equal(loadState(), null);
  assert.doesNotThrow(() => saveState({ season: {}, progress: {} }));
  assert.doesNotThrow(() => clearState());
});

test('postJSON: sends JSON, returns data, and turns failures into readable errors', async () => {
  const realFetch = globalThis.fetch;
  try {
    let seen;
    globalThis.fetch = async (url, init) => { seen = { url, init }; return { ok: true, json: async () => ({ ok: 1 }) }; };
    assert.deepEqual(await postJSON('/api/x', { a: 1 }), { ok: 1 });
    assert.equal(seen.init.method, 'POST');
    assert.equal(seen.init.headers['content-type'], 'application/json');
    assert.equal(seen.init.body, '{"a":1}');
    globalThis.fetch = async () => ({ ok: false, json: async () => ({ error: 'Too many requests.' }) });
    await assert.rejects(postJSON('/api/x', {}), /Too many requests/);
    globalThis.fetch = async () => ({ ok: false, json: async () => { throw new Error('html'); } });
    await assert.rejects(postJSON('/api/x', {}), /did not work/);
    globalThis.fetch = async () => { throw new Error('offline'); };
    await assert.rejects(postJSON('/api/x', {}), /Could not reach the server/);
  } finally { globalThis.fetch = realFetch; }
});

function find(el, pred) {
  if (pred(el)) return el;
  for (const c of el.children || []) { const hit = c instanceof FakeEl ? find(c, pred) : null; if (hit) return hit; }
  return null;
}

test('More help card: a result with no confirmed guests shows no stray "false" and no button', async () => {
  const { helpersCard } = await import('../public/ui/helpers.js');
  const ev = { id: 'e1', type: 'wedding', name: 'W', date: '2026-12-20', guests: 100 };
  const ctx = { season: {}, commit() {}, ask: async () => ({ source: 'gemini', replies: [{ name: 'Guest', response: 'unclear', party: 1 }], totals: { yes: 0, maybe: 0, no: 0, unclear: 1 } }) };
  const card = helpersCard(ev, ctx);
  const select = find(card, (e) => e.tag === 'select');
  const box = find(card, (e) => e.tag === 'textarea');
  const go = find(card, (e) => e.tag === 'button');
  select.value = 'rsvp';
  box.value = 'hello';
  await go.listeners.click();
  const text = card.textContent;
  assert.match(text, /Unclear: 1/);
  assert.ok(!/false|undefined|null/.test(text), text);
  assert.equal(find(card, (e) => e.tag === 'button' && /Set guests/.test(e.textContent)), null);
});

test('More help card: with confirmed guests the "Set guests" button appears and applies the count', async () => {
  const { helpersCard } = await import('../public/ui/helpers.js');
  const { normalizeSeason } = await import('../public/engine/schema.js');
  const season = normalizeSeason(sampleSeason('2026-11-01')).season;
  let committed;
  const ctx = { season, commit: (next, note) => { committed = { next, note }; }, ask: async () => ({ source: 'gemini', replies: [], totals: { yes: 3, maybe: 0, no: 0, unclear: 0 } }) };
  const card = helpersCard({ ...season.events[0], id: 'e1' }, ctx);
  find(card, (e) => e.tag === 'select').value = 'rsvp';
  find(card, (e) => e.tag === 'textarea').value = 'Amit: yes';
  await find(card, (e) => e.tag === 'button').listeners.click();
  const apply = find(card, (e) => e.tag === 'button' && /Set guests to 3/.test(e.textContent));
  assert.ok(apply);
  apply.listeners.click();
  assert.equal(committed.next.events[0].guests, 3);
});
