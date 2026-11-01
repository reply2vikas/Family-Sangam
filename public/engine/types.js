// Shared shapes, written as JSDoc so editors can check them (`// @ts-check` works on any file that uses them).
// This file has no runtime code. Every value that crosses a trust boundary is first cleaned by schema.js.

/**
 * @typedef {'wedding' | 'birthday' | 'community'} EventType
 */

/**
 * @typedef {object} Income
 * @property {string} id
 * @property {string} label
 * @property {string} date    ISO date, YYYY-MM-DD
 * @property {number} amount  whole rupees
 */

/**
 * @typedef {object} CelebrationEvent
 * @property {string} id
 * @property {EventType} type
 * @property {string} name
 * @property {string} date      ISO date
 * @property {number} guests    whole number, at least 1
 * @property {number} budget    whole rupees
 * @property {Record<string, number>} [overrides]  amounts the family typed over, by line id
 */

/**
 * @typedef {object} Adjust
 * @property {Record<string, number>} [shifted]  payment id to days later
 * @property {string[]} [trimmed]                optional line ids skipped
 * @property {string[]} [reserve]                event ids whose contingency is held back
 */

/**
 * @typedef {object} Season
 * @property {string} name
 * @property {string} startDate   ISO date
 * @property {number} startBalance  whole rupees
 * @property {Income[]} incomes
 * @property {CelebrationEvent[]} events
 * @property {Adjust} [adjust]
 */

/**
 * @typedef {object} BudgetLine
 * @property {string} id
 * @property {string} label
 * @property {number} amount
 * @property {boolean} mustHave
 * @property {'estimate' | 'you entered'} source
 */

/**
 * @typedef {object} Payment
 * @property {string} id
 * @property {string} eventId
 * @property {string} lineId
 * @property {string} date
 * @property {number} amount
 * @property {boolean} [overdue]  due before the season starts
 */

/**
 * @typedef {object} CalendarDay
 * @property {string} date
 * @property {number} balance
 */

/**
 * @typedef {object} CashCalendar
 * @property {CalendarDay[]} days
 * @property {boolean} shortfall
 * @property {string | null} firstShortDate
 * @property {number} lowest   the worst balance in the season
 */

/**
 * @typedef {object} Fix
 * @property {string} label
 * @property {string} detail
 * @property {Adjust} patch
 * @property {boolean} resolved   closes the gap by itself
 * @property {number} lowestAfter
 */

export {};
