// What the family has ticked off: tasks done and vendor status. Kept apart from the season
// itself so changing a date or a budget never loses this progress.

export const VENDOR_STATUS = ['to contact', 'quote received', 'booked'];

const KEY_PATTERN = /^e\d{1,2}:[a-z]{2,12}$/;

/** Keep only well-formed progress entries from saved or imported data. */
export function cleanProgress(raw) {
  const done = {};
  const vendors = {};
  for (const [k, v] of Object.entries(raw?.done || {})) if (KEY_PATTERN.test(k) && v === true) done[k] = true;
  for (const [k, v] of Object.entries(raw?.vendors || {})) {
    if (!KEY_PATTERN.test(k)) continue;
    vendors[k] = {
      status: VENDOR_STATUS.includes(v?.status) ? v.status : VENDOR_STATUS[0],
      name: String(v?.name ?? '').replace(/[<>]/g, ' ').slice(0, 60),
    };
  }
  return { done, vendors };
}
