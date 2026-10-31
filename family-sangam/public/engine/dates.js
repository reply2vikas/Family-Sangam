// Calendar-date helpers on ISO strings (YYYY-MM-DD). Everything is done in UTC so
// results do not depend on the machine's time zone or daylight-saving rules.

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY = 86400000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** True only for real calendar dates, e.g. "2026-02-30" is false. */
export function isISODate(s) {
  if (typeof s !== 'string') return false;
  const m = ISO.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function toMs(s) {
  if (!isISODate(s)) throw new RangeError(`not a date: ${s}`);
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(s, n) {
  return new Date(toMs(s) + n * DAY).toISOString().slice(0, 10);
}

/** Whole days from a to b (negative when b is earlier). */
export function daysBetween(a, b) {
  return Math.round((toMs(b) - toMs(a)) / DAY);
}

export function maxDate(a, b) {
  return a >= b ? a : b;
}

export function minDate(a, b) {
  return a <= b ? a : b;
}

/** "7 Nov" style label. */
export function formatDate(s) {
  const [, m, d] = s.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/** Today's date in the user's local calendar, as ISO. */
export function todayISO(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}
