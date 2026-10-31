// Validation for everything that crosses a trust boundary: the setup form, saved state,
// and anything an AI model returns. Unknown fields are dropped, numbers are range-checked.

import { isISODate } from './dates.js';
import { TYPE_IDS } from './templates.js';

export const LIMITS = {
  events: 6, incomes: 12, guests: [1, 5000], budget: [1000, 100000000],
  balance: [0, 1000000000], name: 60,
};

const isInt = (v) => Number.isSafeInteger(v);
const inRange = (v, [lo, hi]) => isInt(v) && v >= lo && v <= hi;

export function cleanText(value, max = LIMITS.name) {
  return String(value ?? '').replace(/[<>\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanIncomes(list, errors, startDate) {
  const out = [];
  for (const [i, raw] of (Array.isArray(list) ? list : []).slice(0, LIMITS.incomes).entries()) {
    const label = cleanText(raw?.label) || `Income ${i + 1}`;
    if (!isISODate(raw?.date)) { errors.push(`${label}: date is not a valid date`); continue; }
    if (!inRange(raw?.amount, [1, LIMITS.balance[1]])) { errors.push(`${label}: amount must be a whole number of rupees`); continue; }
    out.push({ id: `i${out.length + 1}`, label, date: raw.date < startDate ? startDate : raw.date, amount: raw.amount });
  }
  return out;
}

function cleanEvents(list, errors, startDate) {
  const out = [];
  for (const raw of (Array.isArray(list) ? list : []).slice(0, LIMITS.events)) {
    const name = cleanText(raw?.name) || 'Event';
    if (!TYPE_IDS.includes(raw?.type)) { errors.push(`${name}: type must be one of ${TYPE_IDS.join(', ')}`); continue; }
    if (!isISODate(raw?.date)) { errors.push(`${name}: date is not a valid date`); continue; }
    if (raw.date < startDate) { errors.push(`${name}: date is before the season starts`); continue; }
    if (!inRange(raw?.guests, LIMITS.guests)) { errors.push(`${name}: guests must be between 1 and 5000`); continue; }
    if (!inRange(raw?.budget, LIMITS.budget)) { errors.push(`${name}: budget must be a whole number of rupees (at least 1,000)`); continue; }
    const event = { id: `e${out.length + 1}`, type: raw.type, name, date: raw.date, guests: raw.guests, budget: raw.budget };
    const overrides = {};
    for (const [k, v] of Object.entries(raw.overrides || {})) if (isInt(v) && v >= 0 && v <= event.budget) overrides[cleanText(k, 20)] = v;
    if (Object.keys(overrides).length) event.overrides = overrides;
    out.push(event);
  }
  return out;
}

function cleanAdjust(adjust, events) {
  if (!adjust || typeof adjust !== 'object') return undefined;
  const ids = new Set(events.map((e) => e.id));
  const ok = (key) => ids.has(String(key).split(':')[0]);
  const shifted = {};
  for (const [k, v] of Object.entries(adjust.shifted || {})) if (ok(k) && isISODate(v)) shifted[k] = v;
  return {
    shifted,
    trimmed: (Array.isArray(adjust.trimmed) ? adjust.trimmed : []).filter((k) => typeof k === 'string' && ok(k)),
    reserve: (Array.isArray(adjust.reserve) ? adjust.reserve : []).filter((id) => ids.has(id)),
  };
}

/**
 * @returns {{ok: true, season: object} | {ok: false, errors: string[]}}
 */
export function normalizeSeason(input) {
  const errors = [];
  if (!input || typeof input !== 'object') return { ok: false, errors: ['Season is missing.'] };
  if (!isISODate(input.startDate)) return { ok: false, errors: ['Start date is not a valid date.'] };
  if (!inRange(input.startBalance, LIMITS.balance)) errors.push('Opening balance must be a whole number of rupees.');
  const events = cleanEvents(input.events, errors, input.startDate);
  if (events.length === 0) errors.push('Add at least one valid event.');
  const incomes = cleanIncomes(input.incomes, errors, input.startDate);
  if (errors.length) return { ok: false, errors };
  const season = {
    name: cleanText(input.name, 80) || 'Our celebration season',
    startDate: input.startDate, startBalance: input.startBalance, incomes, events,
  };
  const adjust = cleanAdjust(input.adjust, events);
  if (adjust) season.adjust = adjust;
  return { ok: true, season };
}
