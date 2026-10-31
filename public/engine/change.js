// The "change test": a plain-words change request becomes a small, validated change
// object. Gemini produces it on the server; the offline parser below produces the same
// shape without AI. Either way the same code checks it and applies it.

import { addDays, formatDate } from './dates.js';
import { buildPlan } from './plan.js';
import { cashCalendar } from './cash.js';
import { formatINR } from './money.js';
import { LIMITS } from './schema.js';

export const CHANGE_FIELDS = ['guestsDelta', 'budgetPct', 'dateShiftDays'];

const RANGES = { guestsDelta: [-2000, 2000], budgetPct: [-90, 200], dateShiftDays: [-180, 180] };

/**
 * Check a change object. Accepts only whole numbers inside sane ranges and at least one change.
 * @returns {{ok: true, change: object} | {ok: false, errors: string[]}}
 */
export function validateChange(raw, season) {
  const errors = [];
  if (!raw || typeof raw !== 'object') return { ok: false, errors: ['No change found.'] };
  const change = { eventId: null, assumptions: [] };
  if (raw.eventId != null) {
    if (!season.events.some((e) => e.id === raw.eventId)) errors.push('That event does not exist.');
    else change.eventId = raw.eventId;
  }
  for (const f of CHANGE_FIELDS) {
    const v = raw[f];
    if (v == null || v === 0) continue;
    const [lo, hi] = RANGES[f];
    if (!Number.isSafeInteger(v) || v < lo || v > hi) errors.push(`${f} must be a whole number from ${lo} to ${hi}.`);
    else change[f] = v;
  }
  if (Array.isArray(raw.assumptions)) {
    change.assumptions = raw.assumptions.slice(0, 4).map((a) => String(a).replace(/[<>]/g, ' ').slice(0, 140));
  }
  if (!errors.length && !CHANGE_FIELDS.some((f) => change[f])) errors.push('No guest, budget or date change was found.');
  return errors.length ? { ok: false, errors } : { ok: true, change };
}

function target(season, change) {
  if (change.eventId) return season.events.find((e) => e.id === change.eventId);
  return [...season.events].sort((a, b) => a.date.localeCompare(b.date))[0];
}

/** Apply a validated change to one event. Keeps everything else (and task progress) as is. */
export function applyChange(season, change) {
  const ev = target(season, change);
  const guests = Math.min(LIMITS.guests[1], Math.max(1, ev.guests + (change.guestsDelta || 0)));
  const budget = Math.min(LIMITS.budget[1], Math.max(LIMITS.budget[0],
    Math.round((ev.budget * (100 + (change.budgetPct || 0))) / 100)));
  let date = addDays(ev.date, change.dateShiftDays || 0);
  if (date < season.startDate) date = season.startDate;
  const next = { ...ev, guests, budget, date };
  if (ev.overrides) delete next.overrides; // fresh estimate: old hand-entered amounts no longer fit
  return { ...season, events: season.events.map((e) => (e.id === ev.id ? next : e)) };
}

/** Plain-language "what changed" lines comparing two versions of the season. */
export function describeChange(before, after) {
  const pb = buildPlan(before);
  const pa = buildPlan(after);
  const cb = cashCalendar(before, pb);
  const ca = cashCalendar(after, pa);
  const lines = [];
  for (const e1 of pb.events) {
    const e2 = pa.events.find((e) => e.id === e1.id);
    if (e1.guests !== e2.guests) lines.push(`${e1.name}: guests ${e1.guests} to ${e2.guests}`);
    if (e1.budget !== e2.budget) lines.push(`${e1.name}: budget ${formatINR(e1.budget)} to ${formatINR(e2.budget)}`);
    if (e1.date !== e2.date) lines.push(`${e1.name}: date ${formatDate(e1.date)} to ${formatDate(e2.date)}`);
    if (e1.perGuest !== e2.perGuest) lines.push(`${e1.name}: ${formatINR(e1.perGuest)} to ${formatINR(e2.perGuest)} per guest`);
  }
  lines.push(ca.shortfall
    ? `Cash now runs out on ${formatDate(ca.shortfall.date)} (short by ${formatINR(ca.needed)}).`
    : `Cash stays above zero. Lowest balance ${formatINR(ca.lowest.balance)}.`);
  if (!cb.shortfall && ca.shortfall) lines.push('This change creates a new cash gap.');
  if (cb.shortfall && !ca.shortfall) lines.push('This change closes the cash gap.');
  return lines;
}

const WORD_NUMBERS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, ten: 10, twenty: 20 };
const num = (s) => (WORD_NUMBERS[s.toLowerCase()] ?? Number(s));

/**
 * Offline parser for common phrasings such as "50 more guests, smaller budget, 2 weeks earlier".
 * It is deliberately small; the AI path handles free-form wording. Assumptions are listed so the
 * person can see (and reject) anything it guessed.
 */
export function fallbackParseChange(text) {
  const t = String(text || '').toLowerCase().slice(0, 500);
  const out = { eventId: null, assumptions: [] };
  const g = /(\d+|\w+)\s+(more|extra|additional|fewer|less)\s+(?:guests?|people|members)/.exec(t);
  if (g && Number.isFinite(num(g[1]))) out.guestsDelta = (/fewer|less/.test(g[2]) ? -1 : 1) * num(g[1]);
  const b = /budget\s+(?:by\s+)?(\d+)\s*%?\s*(smaller|less|lower|more|higher|bigger)/.exec(t)
    || /(\d+)\s*%\s*(smaller|less|lower|more|higher|bigger)\s+budget/.exec(t);
  if (b) out.budgetPct = (/smaller|less|lower/.test(b[2]) ? -1 : 1) * Number(b[1]);
  else if (/(smaller|lower|tighter|reduced)\s+budget/.test(t)) {
    out.budgetPct = -10;
    out.assumptions.push('No percentage given, so I assumed a 10% smaller budget.');
  } else if (/(bigger|higher|larger)\s+budget/.test(t)) {
    out.budgetPct = 10;
    out.assumptions.push('No percentage given, so I assumed a 10% bigger budget.');
  }
  const d = /(\d+|\w+)\s+(day|week)s?\s+(earlier|sooner|before|later|after)/.exec(t);
  if (d && Number.isFinite(num(d[1]))) {
    const days = num(d[1]) * (d[2] === 'week' ? 7 : 1);
    out.dateShiftDays = /earlier|sooner|before/.test(d[3]) ? -days : days;
  }
  return out;
}
