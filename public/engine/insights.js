// Plain-words season summary (with a number check) and RSVP counting.

import { formatINR } from './money.js';
import { formatDate } from './dates.js';
import { cleanText } from './schema.js';

/** Facts computed by code. The model may only talk about these. */
export function buildFacts(plan, cal, fixes = []) {
  const numbers = new Set();
  const lines = [];
  const add = (text, ...nums) => { lines.push(text); nums.forEach((n) => numbers.add(Math.abs(n))); };
  for (const ev of plan.events) {
    add(`${ev.name} (${ev.type}) on ${formatDate(ev.date)}: ${ev.guests} guests, budget ${formatINR(ev.budget)}, about ${formatINR(ev.perGuest)} per guest.`, ev.guests, ev.budget, ev.perGuest);
  }
  if (cal.shortfall) add(`Cash runs short on ${formatDate(cal.shortfall.date)}. The worst day needs ${formatINR(cal.needed)} more.`, cal.needed);
  else add(`Cash stays above zero. The lowest balance is ${formatINR(cal.lowest.balance)} on ${formatDate(cal.lowest.date)}.`, cal.lowest.balance);
  for (const f of fixes.slice(0, 3)) add(`Possible fix: ${f.label}. ${f.resolved ? 'This closes the gap.' : 'This helps but does not close the gap.'}`);
  return { lines, numbers };
}

/** Every number in `text` must be small (0 to 100, like dates or percentages), a year, or in `allowed`. */
export function verifyNumbers(text, allowed) {
  const unknown = [];
  for (const m of String(text).matchAll(/\d[\d,]*/g)) {
    const n = Number(m[0].replace(/,/g, ''));
    if (!Number.isFinite(n) || n <= 100 || (n >= 2020 && n <= 2100) || allowed.has(n)) continue;
    unknown.push(n);
  }
  return { ok: unknown.length === 0, unknown };
}

/** Code-written summary used when the model is unreachable or quotes a number it was not given. */
export function offlineExplain(facts) {
  return facts.lines.join(' ');
}

const RESPONSES = ['yes', 'no', 'maybe', 'unclear'];

/** Clean RSVP rows from the model and add up the totals by code. */
export function cleanRsvp(raw) {
  const rows = (Array.isArray(raw?.replies) ? raw.replies : []).slice(0, 200).map((r) => ({
    name: cleanText(r?.name, 40) || 'Guest',
    response: RESPONSES.includes(r?.response) ? r.response : 'unclear',
    party: Number.isSafeInteger(r?.party) && r.party >= 1 && r.party <= 20 ? r.party : 1,
  }));
  return { replies: rows, totals: totalRsvp(rows) };
}

export function totalRsvp(rows) {
  const t = { yes: 0, no: 0, maybe: 0, unclear: 0, repliesCounted: rows.length };
  for (const r of rows) t[r.response] += r.response === 'no' ? 1 : r.party;
  return t;
}

const YES = /\b(yes|yep|yeah|coming|will come|will be there|confirmed?|count (me|us) in|sure|haan|aa(ye)?nge|aayenge)\b/i;
const NO = /\b(no|nope|can'?t|cannot|won'?t|unable|not (able|coming)|sorry|nahi|nahin)\b/i;
const MAYBE = /\b(maybe|might|not sure|will try|try to|let you know|shayad)\b/i;

/** Offline reader: one reply per line, in the form "Name: message". */
export function offlineRsvp(text) {
  const replies = [];
  for (const line of String(text || '').split('\n').slice(0, 200)) {
    const t = line.trim();
    if (!t) continue;
    const [first, ...rest] = t.split(':');
    const hasName = rest.length > 0 && first.length <= 40;
    const body = hasName ? rest.join(':') : t;
    let response = 'unclear';
    if (MAYBE.test(body)) response = 'maybe';
    else if (NO.test(body) && !YES.test(body)) response = 'no';
    else if (YES.test(body)) response = 'yes';
    const plus = /(?:\+|with|plus|and)\s*(\d{1,2})\b/i.exec(body);
    replies.push({ name: hasName ? cleanText(first, 40) : 'Guest', response, party: plus ? Math.min(20, 1 + Number(plus[1])) : 1 });
  }
  return { replies, totals: totalRsvp(replies) };
}
