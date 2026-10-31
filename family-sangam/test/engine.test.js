import test from 'node:test';
import assert from 'node:assert/strict';
import { allocate, formatINR, pct } from '../public/engine/money.js';
import { isISODate, addDays, daysBetween, maxDate, minDate, formatDate, todayISO } from '../public/engine/dates.js';
import { buildPlan, taskStatuses } from '../public/engine/plan.js';
import { cashCalendar } from '../public/engine/cash.js';
import { suggestFixes, applyAdjust } from '../public/engine/fixes.js';
import { SCENARIOS, runScenario } from '../public/engine/whatif.js';
import { sampleSeason } from '../public/engine/sample.js';
import { EVENT_TYPES } from '../public/engine/templates.js';
import { rng, int, randomSeason, TODAY } from './helpers.js';

test('allocate: parts add up exactly and stay within one rupee of the exact share', () => {
  const r = rng(7);
  for (let n = 0; n < 500; n += 1) {
    const weights = Array.from({ length: int(r, 1, 12) }, () => int(r, 0, 40));
    if (weights.every((w) => w === 0)) weights[0] = 1;
    const total = int(r, 0, 5_000_000);
    const parts = allocate(total, weights);
    const sum = weights.reduce((a, b) => a + b, 0);
    assert.equal(parts.reduce((a, b) => a + b, 0), total);
    parts.forEach((p, i) => assert.ok(Math.abs(p - (total * weights[i]) / sum) < 1));
  }
});

test('allocate: known split and ties go to the earlier line', () => {
  assert.deepEqual(allocate(10, [6, 6, 2]), [4, 4, 2]);
  assert.deepEqual(allocate(100, [1, 1, 1]), [34, 33, 33]);
});

test('allocate is NOT monotone in the total (Alabama paradox): a line can lose a rupee', () => {
  // Documented on purpose. 6:6:2 gives 4/4/2 at 10 but 5/5/1 at 11, so the third line shrinks.
  assert.deepEqual(allocate(11, [6, 6, 2]), [5, 5, 1]);
});

test('allocate rejects bad input', () => {
  assert.throws(() => allocate(-1, [1]), RangeError);
  assert.throws(() => allocate(1.5, [1]), RangeError);
  assert.throws(() => allocate(10, []), RangeError);
  assert.throws(() => allocate(10, [1, -1]), RangeError);
  assert.throws(() => allocate(10, [0, 0]), RangeError);
});

test('formatINR uses Indian grouping and handles negatives and junk', () => {
  assert.equal(formatINR(1234567), '₹12,34,567');
  assert.equal(formatINR(-5000), '-₹5,000');
  assert.equal(formatINR(undefined), '₹0');
  assert.equal(pct(1, 4), 25);
  assert.equal(pct(1, 0), 0);
});

test('dates: validation, arithmetic across month ends and leap years', () => {
  assert.ok(isISODate('2028-02-29'));
  assert.ok(!isISODate('2027-02-29'));
  assert.ok(!isISODate('2026-13-01'));
  assert.ok(!isISODate(20260101));
  assert.ok(!isISODate('2026-1-1'));
  assert.equal(addDays('2026-01-31', 1), '2026-02-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(daysBetween('2026-03-01', '2026-03-31'), 30);
  assert.equal(daysBetween('2026-03-31', '2026-03-01'), -30);
  assert.equal(maxDate('2026-01-02', '2026-01-01'), '2026-01-02');
  assert.equal(minDate('2026-01-02', '2026-01-01'), '2026-01-01');
  assert.equal(formatDate('2026-12-05'), '5 Dec');
  assert.equal(todayISO(new Date(2026, 0, 9)), '2026-01-09');
  assert.throws(() => addDays('nope', 1), RangeError);
});

test('plan: every event line total equals its budget, for random seasons', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const plan = buildPlan(randomSeason(seed));
    for (const ev of plan.events) {
      assert.equal(ev.lines.reduce((a, l) => a + l.amount, 0), ev.budget, `seed ${seed}`);
    }
  }
});

test('plan: payments add up to the line amounts and never go negative', () => {
  const plan = buildPlan(sampleSeason(TODAY));
  for (const ev of plan.events) {
    for (const l of ev.lines) {
      const paid = ev.payments.filter((p) => p.lineKey === l.key).reduce((a, p) => a + p.amount, 0);
      assert.equal(paid, l.amount);
    }
    assert.ok(ev.payments.every((p) => p.amount > 0 && p.earliest <= p.latest));
  }
});

test('plan: hand-entered amounts are kept and the rest is re-split', () => {
  const s = sampleSeason(TODAY);
  s.events[0].overrides = { venue: 400000 };
  const ev = buildPlan(s).events[0];
  const venue = ev.lines.find((l) => l.id === 'venue');
  assert.equal(venue.amount, 400000);
  assert.equal(venue.source, 'you');
  assert.equal(ev.lines.filter((l) => l.source === 'estimate').length, ev.lines.length - 1);
  assert.equal(ev.lines.reduce((a, l) => a + l.amount, 0), ev.budget);
});

test('plan: more guests move money toward per-guest lines', () => {
  const s = sampleSeason(TODAY);
  const food = (guests) => buildPlan({ ...s, events: [{ ...s.events[0], guests }] }).events[0].lines.find((l) => l.id === 'food').amount;
  assert.ok(food(400) > food(100));
});

test('plan: overrides that use up the whole budget leave nothing for the rest', () => {
  const s = sampleSeason(TODAY);
  const ev = s.events[1];
  ev.overrides = Object.fromEntries(EVENT_TYPES.birthday.lines.map((l) => [l.id, 1000]));
  const built = buildPlan(s).events[1];
  assert.ok(built.lines.every((l) => l.amount === 1000));
});

test('tasks: late, blocked and at-risk are reported', () => {
  const tasks = [
    { key: 'a', due: '2026-11-01', after: [] },
    { key: 'b', due: '2026-12-01', after: ['a'] },
    { key: 'c', due: '2026-10-01', after: [] },
    { key: 'd', due: '2026-12-05', after: ['zzz'] },
  ];
  const out = Object.fromEntries(taskStatuses(tasks, { c: true }, '2026-11-10').map((t) => [t.key, t]));
  assert.ok(out.a.late);
  assert.ok(out.b.atRisk && out.b.waitingOn[0] === 'a');
  assert.ok(out.c.finished && !out.c.late);
  assert.deepEqual(out.d.waitingOn, []);
});

test('cash: sample season has a small gap on a known day', () => {
  const cal = cashCalendar(sampleSeason(TODAY));
  assert.equal(cal.shortfall.date, '2027-01-30');
  assert.equal(cal.needed, 70000);
  assert.equal(cal.days[0].date, TODAY);
});

test('cash: income before the start date counts on day one', () => {
  const s = { ...sampleSeason(TODAY), incomes: [{ id: 'i1', label: 'x', date: '2020-01-01', amount: 5 }], startBalance: 10 };
  assert.equal(cashCalendar(s).days[0].balance, 15 - buildPlan(s).payments.filter((p) => p.date <= TODAY).reduce((a, p) => a + p.amount, 0));
});

test('fixes: only optional lines are trimmed and every fix helps', () => {
  const s = sampleSeason(TODAY);
  const base = cashCalendar(s);
  const fixes = suggestFixes(s, 10);
  assert.ok(fixes.length >= 2);
  for (const f of fixes) {
    assert.ok(f.resolved || f.gain > 0);
    assert.ok(f.lowestAfter > base.lowest.balance);
    for (const key of f.patch.trimmed || []) {
      const line = buildPlan(s).events.flatMap((e) => e.lines).find((l) => l.key === key);
      assert.ok(!line.must && !line.reserve, `${key} is a must-have`);
    }
  }
  assert.equal(new Set(fixes.map((f) => f.id)).size, fixes.length);
});

test('fixes: applying the top fix on random seasons never makes things worse and never cuts must-haves', () => {
  for (let seed = 1; seed <= 150; seed += 1) {
    const s = randomSeason(seed);
    const before = cashCalendar(s);
    const [fix] = suggestFixes(s);
    if (!before.shortfall) { assert.deepEqual(suggestFixes(s), []); continue; }
    if (!fix) continue;
    const after = cashCalendar(applyAdjust(s, fix.patch));
    assert.ok(after.lowest.balance >= before.lowest.balance, `seed ${seed}`);
    const kept = buildPlan(applyAdjust(s, fix.patch)).events.flatMap((e) => e.lines).filter((l) => l.must);
    assert.ok(kept.every((l) => !l.trimmed));
  }
});

test('fixes: applyAdjust merges and does not repeat entries', () => {
  const s = applyAdjust(applyAdjust(sampleSeason(TODAY), { trimmed: ['e1:photo'] }), { trimmed: ['e1:photo'], reserve: ['e1'], shifted: { 'e1:venue:adv': '2026-12-01' } });
  assert.deepEqual(s.adjust.trimmed, ['e1:photo']);
  assert.deepEqual(s.adjust.reserve, ['e1']);
  assert.equal(s.adjust.shifted['e1:venue:adv'], '2026-12-01');
});

test('fixes: a shifted payment outside its window is ignored', () => {
  const s = applyAdjust(sampleSeason(TODAY), { shifted: { 'e1:venue:adv': '2030-01-01' } });
  const pay = buildPlan(s).payments.find((p) => p.id === 'e1:venue:adv');
  assert.equal(pay.date, pay.original);
});

test('what-if properties (seeded): later income, higher income, later payments', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const s = randomSeason(seed);
    const lowest = (x) => cashCalendar(x).lowest.balance;
    const base = lowest(s);
    const days = int(rng(seed), 1, 30);
    assert.ok(lowest({ ...s, incomes: s.incomes.map((i) => ({ ...i, date: addDays(i.date, days) })) }) <= base, `late income, seed ${seed}`);
    assert.ok(lowest({ ...s, startBalance: s.startBalance + 1000 }) >= base, `more cash, seed ${seed}`);
    const pay = buildPlan(s).payments.find((p) => p.date < p.latest);
    if (pay) assert.ok(lowest(applyAdjust(s, { shifted: { [pay.id]: pay.latest } })) >= base, `later payment, seed ${seed}`);
  }
});

test('what-if scenarios run, explain themselves and never touch the original', () => {
  const s = sampleSeason(TODAY);
  const copy = JSON.stringify(s);
  for (const sc of SCENARIOS) {
    const r = runScenario(s, sc.id);
    assert.ok(r.text.length > 10);
    assert.ok(r.after.days.length > 0);
  }
  assert.equal(JSON.stringify(s), copy);
  assert.ok(runScenario(s, 'income-late').after.lowest.balance <= runScenario(s, 'income-late').before.lowest.balance);
  assert.throws(() => runScenario(s, 'nope'), RangeError);
});

test('what-if: a comfortable season reads as fine, and "earlier" never goes before the start', () => {
  const rich = { ...sampleSeason(TODAY), startBalance: 9_000_000 };
  assert.match(runScenario(rich, 'prices-up').text, /Still fine/);
  const soon = { ...sampleSeason(TODAY), events: [{ ...sampleSeason(TODAY).events[0], date: addDays(TODAY, 5) }] };
  assert.ok(runScenario(soon, 'first-earlier').after.days.length >= 1);
});
