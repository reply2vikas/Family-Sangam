// "More help" card per event (checklist ideas, day-of schedule, savings, RSVP count)
// and the plain-words season summary.

import { h, clear } from './h.js';
import { formatINR } from '../engine/money.js';
import { applyChange } from '../engine/change.js';
import { LANGUAGES } from '../engine/message.js';

const badge = (source, aiText) => h('span', { class: `badge ${source === 'gemini' ? 'ai' : 'est'}` }, source === 'gemini' ? aiText : 'built-in fallback');

const VIEWS = {
  checklist: {
    label: 'Extra checklist items', path: '/api/checklist', needsText: false,
    body: (r) => h('ul', {}, r.items.map((i) => h('li', {}, `${i.title} (${i.daysBefore} days before). ${i.why}`))),
  },
  runshow: {
    label: 'Day-of schedule', path: '/api/runshow', needsText: false,
    body: (r) => h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, ['Time', 'What happens', 'Who'].map((c) => h('th', { scope: 'col' }, c)))),
      h('tbody', {}, r.schedule.map((s) => h('tr', {}, h('td', {}, s.time), h('td', {}, s.activity), h('td', {}, s.owner || '')))))),
  },
  savings: {
    label: 'Where can we save?', path: '/api/savings', needsText: false,
    body: (r) => [h('ul', {}, r.ideas.map((i) => h('li', {}, `${i.lineLabel}: ${i.idea} Saves about ${formatINR(i.saveAmount)}.`))),
      h('p', { class: 'small' }, `Together about ${formatINR(r.totalSaving)}. Ideas only: nothing in your budget changes.`)],
  },
  rsvp: {
    label: 'Count RSVP replies', path: '/api/rsvp', needsText: true,
    body: (r, ev, ctx) => {
      const t = r.totals;
      const next = () => ctx.commit(applyChange(ctx.season, { eventId: ev.id, guestsDelta: Math.max(-2000, Math.min(2000, t.yes - ev.guests)), assumptions: [] }), `Guest count set to ${t.yes}.`);
      return [h('p', {}, `Yes: ${t.yes}. Maybe: ${t.maybe}. No: ${t.no}. Unclear: ${t.unclear}.`),
        h('ul', {}, r.replies.slice(0, 12).map((x) => h('li', {}, `${x.name}: ${x.response}${x.party > 1 ? ` (${x.party} people)` : ''}`))),
        t.yes > 0 && h('button', { type: 'button', class: 'ghost', onclick: next }, `Set guests to ${t.yes} (confirmed yes)`)];
    },
  },
};

export function helpersCard(ev, ctx) {
  const pick = h('select', { id: `hk-${ev.id}` }, Object.entries(VIEWS).map(([k, v]) => h('option', { value: k }, v.label)));
  const text = h('textarea', { id: `ht-${ev.id}`, rows: 3, maxlength: 2500, placeholder: 'Optional note. For RSVP: paste the replies, one per line, like "Amit: yes, coming with 2".' });
  const out = h('div', { 'aria-live': 'polite' });
  const go = h('button', { type: 'button', class: 'primary', onclick: async () => {
    const view = VIEWS[pick.value];
    if (view.needsText && !text.value.trim()) { clear(out).append(h('p', { class: 'errors' }, 'Paste the replies first.')); return; }
    go.disabled = true;
    clear(out).append(h('p', { class: 'small' }, 'Working…'));
    try {
      const r = await ctx.ask(view.path, view.needsText ? { text: text.value } : { event: { type: ev.type, name: ev.name, date: ev.date, guests: ev.guests }, eventId: ev.id, season: ctx.season, note: text.value });
      clear(out).append(h('p', { class: 'small' }, badge(r.source, 'by Gemini'), r.note ? ` ${r.note}` : ''), ...[view.body(r, ev, ctx)].flat().filter(Boolean));
    } catch (err) { clear(out).append(h('p', { class: 'errors' }, err.message)); } finally { go.disabled = false; }
  } }, 'Help me');
  return h('div', { class: 'card no-print' }, h('h3', {}, 'More help'),
    h('label', { for: pick.id }, 'What do you need'), pick, h('label', { for: text.id }, 'Note or replies'), text, h('div', { class: 'row' }, go), out);
}

export function explainPanel(ctx) {
  const lang = h('select', { id: 'explain-lang' }, LANGUAGES.map((l) => h('option', { value: l }, l)));
  const out = h('div', { 'aria-live': 'polite' });
  const go = h('button', { type: 'button', class: 'ghost', onclick: async () => {
    go.disabled = true;
    clear(out).append(h('p', { class: 'small' }, 'Writing…'));
    try {
      const r = await ctx.ask('/api/explain', { season: ctx.season, language: lang.value });
      clear(out).append(h('p', { class: 'small' }, badge(r.source, `written by Gemini in ${r.language}`), r.note ? ` ${r.note}` : ''), h('p', {}, r.summary));
    } catch (err) { clear(out).append(h('p', { class: 'errors' }, err.message)); } finally { go.disabled = false; }
  } }, 'Explain my season');
  return h('div', {}, h('h3', {}, 'Explain it to the family'), h('p', { class: 'small' }, 'A short summary for relatives who do not like spreadsheets. Every number in it is checked against your plan.'),
    h('label', { for: lang.id }, 'Language'), lang, h('div', { class: 'row' }, go), out);
}
