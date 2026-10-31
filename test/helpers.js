import { addDays } from '../public/engine/dates.js';
import { TYPE_IDS } from '../public/engine/templates.js';

/** Small seeded random generator so property tests are repeatable. */
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

export const TODAY = '2026-11-01';

/** A random but valid season. */
export function randomSeason(seed) {
  const r = rng(seed);
  const count = int(r, 1, 4);
  return {
    name: 'Random', startDate: TODAY, startBalance: int(r, 0, 800000),
    incomes: Array.from({ length: int(r, 0, 4) }, (_, i) => ({
      id: `i${i + 1}`, label: `Inc ${i}`, date: addDays(TODAY, int(r, 0, 120)), amount: int(r, 10000, 600000),
    })),
    events: Array.from({ length: count }, (_, i) => ({
      id: `e${i + 1}`, type: TYPE_IDS[int(r, 0, TYPE_IDS.length - 1)], name: `Event ${i + 1}`,
      date: addDays(TODAY, int(r, 15, 150)), guests: int(r, 10, 400), budget: int(r, 50000, 2000000),
    })),
  };
}
