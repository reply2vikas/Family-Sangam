// Pure helpers that turn engine results into drawing instructions and sentences, so the
// browser code stays thin and this logic can be tested.

import { formatINR } from './money.js';
import { formatDate } from './dates.js';

/**
 * Points for the cash chart in a width x height box with padding.
 * @returns {{points: string, zeroY: number, min: number, max: number, marks: object[]}}
 */
export function chartGeometry(days, width, height, pad = 12) {
  const values = days.map((d) => d.balance);
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const span = max - min;
  const x = (i) => pad + (days.length > 1 ? (i * (width - 2 * pad)) / (days.length - 1) : 0);
  const y = (v) => pad + ((max - v) * (height - 2 * pad)) / span;
  return {
    points: days.map((d, i) => `${x(i).toFixed(1)},${y(d.balance).toFixed(1)}`).join(' '),
    zeroY: Number(y(0).toFixed(1)),
    min, max,
    marks: days.map((d, i) => ({ date: d.date, x: Number(x(i).toFixed(1)), y: Number(y(d.balance).toFixed(1)), negative: d.balance < 0 })),
  };
}

/** One sentence that tells the person where they stand. */
export function cashHeadline(cal) {
  if (cal.shortfall) {
    return `You run short on ${formatDate(cal.shortfall.date)}. The worst day needs ${formatINR(cal.needed)} more.`;
  }
  return `You stay above zero all season. The lowest balance is ${formatINR(cal.lowest.balance)} on ${formatDate(cal.lowest.date)}.`;
}

/** Group payments by month for the printable schedule. */
export function paymentsByMonth(payments) {
  const groups = new Map();
  for (const p of payments) {
    const key = p.date.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  return [...groups.entries()].map(([month, items]) => ({
    month, total: items.reduce((a, p) => a + p.amount, 0), items,
  }));
}
