// Wires the form, the engine and the server routes together.

import { normalizeSeason } from './engine/schema.js';
import { buildPlan } from './engine/plan.js';
import { cashCalendar } from './engine/cash.js';
import { suggestFixes, applyAdjust } from './engine/fixes.js';
import { sampleSeason } from './engine/sample.js';
import { todayISO } from './engine/dates.js';
import { cleanProgress, VENDOR_STATUS } from './engine/progress.js';
import { loadState, saveState, clearState } from './ui/state.js';
import { postJSON } from './ui/api.js';
import { addIncomeRow, addEventRow, readForm, fillForm, showErrors } from './ui/setup.js';
import { renderOverview } from './ui/overview.js';
import { renderEvents } from './ui/events.js';

const $ = (id) => document.getElementById(id);
const today = todayISO();
const ideaCache = {};
let state = loadState();
let history = [];

function say(message, bad = false) {
  const el = $('status');
  el.textContent = message;
  el.classList.toggle('bad', bad);
}

function persist() {
  saveState(state);
  $('undo').disabled = history.length === 0;
}

function context() {
  const { season } = state;
  const plan = buildPlan(season);
  return {
    season, plan, today, progress: state.progress, ideaCache,
    cal: cashCalendar(season, plan), fixes: suggestFixes(season),
    say,
    applyFix: (fix) => commit(applyAdjust(season, fix.patch), `Done: ${fix.label}`),
    commit,
    requestChange: (text) => postJSON('/api/change', { text, season }),
    fetchIdeas: async (ev, city, vibe) => {
      const r = await postJSON('/api/ideas', { type: ev.type, guests: ev.guests, budget: ev.budget, city, vibe });
      ideaCache[ev.id] = r;
      return r;
    },
    setOverride: (eventId, lineId, value) => {
      const events = season.events.map((e) => {
        if (e.id !== eventId) return e;
        if (lineId === null) { const { overrides, ...rest } = e; return rest; }
        const overrides = { ...(e.overrides || {}) };
        if (value === null || !Number.isFinite(value)) delete overrides[lineId]; else overrides[lineId] = Math.round(value);
        return { ...e, overrides };
      });
      commit({ ...season, events }, 'Amount updated. The other lines re-balanced to fit the budget.');
    },
    toggleTask: (key) => {
      state.progress.done[key] = !state.progress.done[key];
      if (!state.progress.done[key]) delete state.progress.done[key];
      persist();
      renderEvents($('event-list'), context());
    },
    setVendor: (key, patch) => {
      const cur = state.progress.vendors[key] || { status: VENDOR_STATUS[0], name: '' };
      state.progress = cleanProgress({ ...state.progress, vendors: { ...state.progress.vendors, [key]: { ...cur, ...patch } } });
      persist();
    },
  };
}

function render() {
  $('start').hidden = true;
  $('plan').hidden = false;
  const ctx = context();
  renderOverview($('overview'), ctx);
  renderEvents($('event-list'), ctx);
  $('undo').disabled = history.length === 0;
}

function commit(season, note) {
  const checked = normalizeSeason(season);
  if (!checked.ok) { say(checked.errors[0], true); return; }
  history.push(state.season);
  state = { ...state, season: checked.season };
  persist();
  render();
  say(note);
}

function startFrom(season) {
  const checked = normalizeSeason(season);
  if (!checked.ok) { showErrors(checked.errors); say('Please fix the points listed in the form.', true); return; }
  showErrors([]);
  history = [];
  state = { season: checked.season, progress: { done: {}, vendors: {} } };
  persist();
  render();
  say('Your season is ready.');
  $('main').focus();
}

async function buildWithAI() {
  const text = $('brief').value.trim();
  if (!text) { say('Write a few sentences about your events first.', true); return; }
  $('build-ai').disabled = true;
  say('Gemini is reading your description…');
  try {
    const { season } = await postJSON('/api/brief', { text, today });
    fillForm(season);
    say('Gemini filled the form. Please check every number, then press "Plan my season".');
    $('setup').scrollIntoView({ behavior: 'smooth' });
  } catch (err) { say(err.message, true); } finally { $('build-ai').disabled = false; }
}

$('add-income').addEventListener('click', () => addIncomeRow());
$('add-event').addEventListener('click', () => addEventRow());
$('build-ai').addEventListener('click', buildWithAI);
$('sample').addEventListener('click', () => startFrom(sampleSeason(today)));
$('setup').addEventListener('submit', (e) => { e.preventDefault(); startFrom({ ...readForm(), name: 'Our celebration season' }); });
$('print').addEventListener('click', () => window.print());
$('undo').addEventListener('click', () => {
  if (!history.length) return;
  state = { ...state, season: history.pop() };
  persist();
  render();
  say('Last change undone.');
});
$('reset').addEventListener('click', () => {
  clearState();
  state = null;
  history = [];
  $('plan').hidden = true;
  $('start').hidden = false;
  fillForm({ startDate: today, startBalance: '', incomes: [], events: [] });
  addEventRow();
  say('Cleared. Start a new season.');
});

if (state) { fillForm(state.season); render(); } else {
  $('s-start').value = today;
  addIncomeRow();
  addEventRow();
}
