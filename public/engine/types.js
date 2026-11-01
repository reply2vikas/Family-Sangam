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
 * @typedef {object} Adjust  small patches merged into the season by the "ways to close the gap" fixes
 * @property {Record<string, string>} shifted  payment id to the later ISO date it is paid on
 * @property {string[]} trimmed                budget line keys ("eventId:lineId") skipped
 * @property {string[]} reserve                event ids whose contingency reserve is held back
 */

/**
 * @typedef {object} Season
 * @property {string} name
 * @property {string} startDate   ISO date
 * @property {number} startBalance  whole rupees
 * @property {Income[]} incomes
 * @property {CelebrationEvent[]} events
 * @property {number} [priceUpPct]  percent added to every budget by the "Vendor prices rise" scenario
 * @property {Adjust} [adjust]
 */

/**
 * @typedef {object} BudgetLine
 * @property {string} key       "eventId:lineId"
 * @property {string} id
 * @property {string} label
 * @property {boolean} must     a must-have: never cut by a fix
 * @property {string | null} vendor
 * @property {boolean} reserve  the contingency line
 * @property {boolean} perGuest
 * @property {number} amount
 * @property {'estimate' | 'you'} source  "you" when the family typed the amount
 * @property {boolean} trimmed
 */

/**
 * @typedef {object} Payment
 * @property {string} id
 * @property {string} eventId
 * @property {string} lineKey
 * @property {string} label
 * @property {'advance' | 'balance'} kind
 * @property {number} amount
 * @property {string} date             when it is paid now
 * @property {string} original         the date before any fix moved it
 * @property {string} earliest
 * @property {string} latest           the last date a fix may move it to
 * @property {string | null} refundableUntil
 * @property {boolean} overdue         due before the season starts
 */

/**
 * @typedef {object} DayBalance
 * @property {string} date
 * @property {number} balance
 */

/**
 * @typedef {object} CashCalendar
 * @property {DayBalance[]} days
 * @property {DayBalance} lowest              the worst day of the season
 * @property {DayBalance | null} shortfall    the first day the balance goes below zero, or null
 * @property {number} needed                  extra cash the worst day would have needed
 */

/**
 * @typedef {object} Fix
 * @property {string} id
 * @property {'move' | 'reserve' | 'trim'} type
 * @property {string} label
 * @property {string} detail
 * @property {Partial<Adjust>} patch
 * @property {boolean} resolved      closes the gap by itself
 * @property {string | null} shortfallAfter  first short day after the fix, or null
 * @property {number} lowestAfter    the worst balance after the fix
 * @property {number} gain           how much the worst day improves
 */

export {};
