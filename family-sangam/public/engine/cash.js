// The season cash calendar: day-by-day balance from income dates and payment dates.

import { buildPlan } from './plan.js';
import { addDays, daysBetween } from './dates.js';

const MAX_DAYS = 800;

/**
 * @returns {{days: {date: string, balance: number}[], lowest: {date: string, balance: number},
 *   shortfall: null | {date: string, balance: number}, needed: number}}
 * `shortfall` is the first day the balance goes below zero. `needed` is how much extra
 * cash would have been required on the worst day.
 */
export function cashCalendar(season, plan = buildPlan(season)) {
  const start = season.startDate;
  const delta = new Map();
  const add = (date, value) => {
    const key = date < start ? start : date;
    delta.set(key, (delta.get(key) || 0) + value);
  };
  add(start, season.startBalance);
  for (const inc of season.incomes) add(inc.date, inc.amount);
  for (const p of plan.payments) add(p.date, -p.amount);

  // The horizon is set by payments only, so moving income around never changes the window.
  const last = plan.payments.reduce((m, p) => (p.date > m ? p.date : m), start);
  const length = Math.min(MAX_DAYS, daysBetween(start, last)) + 1;

  const days = [];
  let balance = 0;
  let shortfall = null;
  let lowest = null;
  for (let i = 0; i < length; i += 1) {
    const date = addDays(start, i);
    balance += delta.get(date) || 0;
    days.push({ date, balance });
    if (!lowest || balance < lowest.balance) lowest = { date, balance };
    if (!shortfall && balance < 0) shortfall = { date, balance };
  }
  return { days, lowest, shortfall, needed: Math.max(0, -lowest.balance) };
}
