// Cleaners for three Gemini helpers: extra checklist items, a day-of schedule and savings ideas.
// Each one accepts only well-formed items, caps sizes, and (for savings) caps amounts by code.

import { cleanText } from './schema.js';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMinutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

/** Extra checklist items: title, how many days before the event, and why. */
export function cleanChecklist(raw) {
  const items = Array.isArray(raw?.items) ? raw.items : [];
  return items.slice(0, 8).map((i) => ({
    title: cleanText(i?.title, 80),
    daysBefore: Number.isSafeInteger(i?.daysBefore) && i.daysBefore >= 0 && i.daysBefore <= 365 ? i.daysBefore : null,
    why: cleanText(i?.why, 120),
  })).filter((i) => i.title && i.daysBefore !== null);
}

/** Day-of schedule: valid 24-hour times only, sorted, at most 14 rows. */
export function cleanRunshow(raw) {
  const rows = Array.isArray(raw?.schedule) ? raw.schedule : [];
  return rows.map((r) => ({ time: String(r?.time ?? '').trim(), activity: cleanText(r?.activity, 100), owner: cleanText(r?.owner, 40) }))
    .filter((r) => HHMM.test(r.time) && r.activity)
    .sort((a, b) => toMinutes(a.time) - toMinutes(b.time))
    .slice(0, 14);
}

/**
 * Savings ideas. `lines` are the plan's budget lines. An idea must name a real line, and the
 * amount it claims to save can never exceed what that line is worth. Must-have lines may be
 * trimmed by suggestion but a single idea cannot claim more than half of one.
 */
export function cleanSavings(raw, lines) {
  const byId = new Map(lines.map((l) => [l.id, l]));
  const ideas = Array.isArray(raw?.ideas) ? raw.ideas : [];
  const out = [];
  for (const i of ideas.slice(0, 10)) {
    const line = byId.get(i?.lineId);
    const idea = cleanText(i?.idea, 160);
    if (!line || !idea || !Number.isSafeInteger(i?.saveAmount) || i.saveAmount <= 0) continue;
    const cap = line.must ? Math.floor(line.amount / 2) : line.amount;
    out.push({ lineId: line.id, lineLabel: line.label, idea, saveAmount: Math.min(i.saveAmount, cap) });
  }
  return out.slice(0, 6);
}

/** Rule-based savings used when Gemini is not reachable: simplify optional lines by 20%. */
export function offlineSavings(lines) {
  return lines.filter((l) => !l.must && !l.reserve && l.amount > 0 && !l.trimmed).slice(0, 5)
    .map((l) => ({ lineId: l.id, lineLabel: l.label, idea: `Keep "${l.label}" simpler or get two quotes and ask for a bundle price.`, saveAmount: Math.round(l.amount * 0.2) }));
}

const GENERIC_CHECKLIST = {
  wedding: [['Arrange drinking water, parking and a helpdesk', 14, 'Guests notice these first'], ['Plan stay for elders close to the venue', 30, 'Avoids long travel'], ['Nominate one family point person per vendor', 20, 'One voice, fewer mix-ups']],
  birthday: [['Confirm any food allergies among guests', 7, 'Avoids last-minute changes'], ['Plan a quiet corner for elders and toddlers', 5, 'Keeps everyone comfortable']],
  community: [['Arrange first-aid kit and a lost-and-found desk', 5, 'Basic safety'], ['Keep a rain plan for outdoor areas', 7, 'Weather can change the day']],
};

export function offlineChecklist(type) {
  return (GENERIC_CHECKLIST[type] || GENERIC_CHECKLIST.wedding).map(([title, daysBefore, why]) => ({ title, daysBefore, why }));
}

const GENERIC_RUNSHOW = {
  wedding: [['07:00', 'Decor and sound check complete', 'Decorator'], ['10:00', 'Family and vendors arrive', 'Point person'], ['12:30', 'Main ceremony', 'Priest'], ['13:30', 'Lunch service begins', 'Caterer'], ['16:00', 'Photos with family', 'Photographer']],
  birthday: [['16:00', 'Venue and decor ready', 'Decorator'], ['17:00', 'Guests arrive', 'Host'], ['18:00', 'Cake cutting', 'Host'], ['18:30', 'Games and food', 'Entertainer']],
  community: [['07:00', 'Volunteers brief and set up', 'Lead volunteer'], ['09:00', 'Gates open', 'Gate team'], ['12:00', 'Main programme', 'Compere'], ['14:00', 'Food service', 'Caterer'], ['17:00', 'Clean-up', 'Volunteers']],
};

export function offlineRunshow(type) {
  return (GENERIC_RUNSHOW[type] || GENERIC_RUNSHOW.wedding).map(([time, activity, owner]) => ({ time, activity, owner }));
}
