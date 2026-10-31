// The ask-first setup form: opening money, income dates and events.

import { h, clear } from './h.js';
import { TYPE_IDS, EVENT_TYPES } from '../engine/templates.js';

const $ = (id) => document.getElementById(id);

function removeButton(row, label) {
  return h('button', { type: 'button', class: 'danger', 'aria-label': `Remove ${label}`, onclick: () => row.remove() }, 'Remove');
}

let counter = 0;
const uid = (p) => `${p}-${(counter += 1)}`;

export function addIncomeRow(v = {}) {
  const [a, b, c] = [uid('il'), uid('id'), uid('ia')];
  const row = h('div', { class: 'grid-row', 'data-row': 'income' },
    h('div', {}, h('label', { for: a }, 'What is it'), h('input', { id: a, 'data-k': 'label', value: v.label ?? '', maxlength: 60, placeholder: 'Salary' })),
    h('div', {}, h('label', { for: b }, 'Arrives on'), h('input', { id: b, 'data-k': 'date', type: 'date', value: v.date ?? '' })),
    h('div', {}, h('label', { for: c }, 'Amount (₹)'), h('input', { id: c, 'data-k': 'amount', type: 'number', min: 1, step: 1000, inputmode: 'numeric', value: v.amount ?? '' })));
  row.append(removeButton(row, 'this income'));
  $('incomes').append(row);
}

export function addEventRow(v = {}) {
  const ids = Array.from({ length: 5 }, () => uid('ev'));
  const row = h('div', { class: 'grid-row', 'data-row': 'event' },
    h('div', {}, h('label', { for: ids[0] }, 'Type'),
      h('select', { id: ids[0], 'data-k': 'type' }, TYPE_IDS.map((t) => h('option', { value: t, selected: v.type === t }, EVENT_TYPES[t].label)))),
    h('div', {}, h('label', { for: ids[1] }, 'Name'), h('input', { id: ids[1], 'data-k': 'name', value: v.name ?? '', maxlength: 60, placeholder: 'Riya\'s wedding' })),
    h('div', {}, h('label', { for: ids[2] }, 'Date'), h('input', { id: ids[2], 'data-k': 'date', type: 'date', value: v.date ?? '' })),
    h('div', {}, h('label', { for: ids[3] }, 'Guests'), h('input', { id: ids[3], 'data-k': 'guests', type: 'number', min: 1, max: 5000, inputmode: 'numeric', value: v.guests ?? '' })),
    h('div', {}, h('label', { for: ids[4] }, 'Budget (₹)'), h('input', { id: ids[4], 'data-k': 'budget', type: 'number', min: 1000, step: 5000, inputmode: 'numeric', value: v.budget ?? '' })));
  row.append(removeButton(row, 'this event'));
  $('events').append(row);
}

function readRow(row) {
  const out = {};
  for (const input of row.querySelectorAll('[data-k]')) {
    const k = input.dataset.k;
    out[k] = input.type === 'number' ? (input.value === '' ? NaN : Number(input.value)) : input.value;
  }
  return out;
}

/** Read the form into a raw season object (validated later by normalizeSeason). */
export function readForm() {
  return {
    startDate: $('s-start').value,
    startBalance: $('s-balance').value === '' ? NaN : Number($('s-balance').value),
    incomes: [...document.querySelectorAll('[data-row="income"]')].map(readRow),
    events: [...document.querySelectorAll('[data-row="event"]')].map(readRow),
  };
}

export function fillForm(season) {
  $('s-start').value = season.startDate;
  $('s-balance').value = season.startBalance;
  clear($('incomes'));
  clear($('events'));
  season.incomes.forEach(addIncomeRow);
  season.events.forEach(addEventRow);
}

export function showErrors(errors) {
  const list = clear($('errors'));
  errors.forEach((e) => list.append(h('li', {}, e)));
}
