// Messages a family sends: invitations and vendor notes. Gemini writes them in the chosen
// language; this file holds the allowed choices, the clean-up and an English offline template.

import { formatDate, isISODate } from './dates.js';

export const KINDS = {
  invitation: 'Invitation to guests',
  vendor_followup: 'Follow-up to a vendor',
  move_advance: 'Ask a vendor to pay the advance later',
  thanks: 'Thank-you note after the event',
};
export const LANGUAGES = ['English', 'Hindi', 'Hinglish'];

/** Keep line breaks, drop markup characters and control characters. */
export function cleanBody(value, max = 900) {
  return String(value ?? '').replace(/[<>]/g, ' ').replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ')
    .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
}

export function cleanMessage(raw) {
  const body = cleanBody(raw?.body);
  if (!body) return null;
  return { subject: cleanBody(raw?.subject, 100).replace(/\n/g, ' '), body };
}

/** English fallback used when Gemini is not reachable. */
export function offlineMessage(kind, { name = 'our celebration', date, vendor } = {}) {
  const hello = vendor ? `Hello ${vendor},` : 'Hello,';
  const when = isISODate(date) ? formatDate(date) : 'the planned date';
  const templates = {
    invitation: [`Invitation: ${name}`, `Namaste! We would be delighted to have you with us for ${name} on ${when}. Please let us know if you can come, so we can plan for everyone.`],
    vendor_followup: [`Following up: ${name}`, `${hello} I am writing about ${name} on ${when}. Could you please confirm the booking, the final price and what is included? Thank you.`],
    move_advance: [`Request about the advance for ${name}`, `${hello} for ${name} on ${when}, could we pay the advance a few days later than planned? We are happy to confirm the booking in writing today. Please let us know what works.`],
    thanks: [`Thank you for ${name}`, `Thank you for being part of ${name}. Your presence meant a lot to our family.`],
  };
  const [subject, body] = templates[kind] || templates.invitation;
  return { subject, body };
}
