# Testing

823 test cases at the time of writing. Run `npm test` for the suites or `npm run check` for lint plus the coverage gate (95% lines, 90% branches, 95% functions over `public/engine` and `api`). Built-in `node:test` only; nothing to install.

| Suite | What it proves |
|---|---|
| `engine.test.js` | Money splits add up exactly and stay within one rupee of the exact share; date maths across month ends and leap years; line items always equal the budget (200 random seasons); payments add up to lines; the sample season has its known gap on a known day |
| Property tests (seeded) | Later income never raises the lowest balance; more cash never lowers it; paying an advance later within its window never lowers it; the top fix never makes things worse and never cuts a must-have |
| `change.test.js` | Validation rejects bad dates, ranges and unknown fields; a change touches only its target event and keeps progress; the "what changed" text; the offline parser handles the example sentence |
| `api.test.js` | Gemini client sends the key in a header, fails over between models, cools down rate-limited ones, and turns every failure into one error; routes enforce method, size and rate limits; each AI task validates output and falls back honestly; user text cannot break out of the prompt fence |
| `writing.test.js` | Quote reader and message writer: 12 wording cases for code-side warnings, 8 amount formats (lakh, k, Rs, INR, ₹), price-comparison verdict boundaries, the 10% line, all message kinds and languages, offline fallbacks, prompt-fence test |
| `ui.test.js` | Browser helpers run against a small fake DOM: the element builder never turns text into markup, saved state survives corrupt or blocked storage, the fetch helper turns failures into readable errors |
| `cases.test.js` | Table-driven cases: money formatting, calendar maths, 17 plain-words change phrasings, all three event types at 8 guest counts from 1 to 5000, applied changes always give a valid season, the cash shape is the same wherever the season starts |
| `extras.test.js` | Checklist, day-of schedule and savings: 18 valid and invalid time cases, 14 checklist-item cases, 14 savings cases (unknown lines, zero, negative, fractional, over-cap, must-have half cap), offline fallbacks for every event type, and the three API tasks with a fake Gemini |
| `insights.test.js` | The number check (accepts only numbers that were given, 12 amounts both ways, 16 small/year/other cases), 30 RSVP phrasings in English, Hindi and Hinglish, RSVP totals, 100 seeded random seasons where the code-written summary passes its own number check, and the explain and RSVP tasks including an invented-number rejection |
| `grid.test.js` | 90 grid cases (3 event types × 6 guest counts × 5 budgets), 150 seeded random seasons, 60 calendar round-trips across month ends and leap days, 54 money splits |
| `screens.test.js` | The real overview and event-card screens render against a fake DOM: all three event types appear with Budget, Timeline and Vendor checklist; the red-day banner, chart label and table twin; "Use this fix" hands the fix to the app; "Test a bad day" changes nothing; the no-gap message; an empty change is refused before any request |
| `evidence.test.js` | Checks the README claims against the files and that the JSDoc shapes in `types.js` match what the engine really returns (fields compared both ways); lint rules (including unused imports), CSP, no key in browser code, no runtime dependencies, docs exist, accessibility basics, colour contrast |

## How the count is made up

About 400 of the cases are one rule checked across many inputs (table-driven, grid or seeded random). That is a deliberate way to get breadth, and the README says so rather than presenting them as 823 different behaviours. The behaviour list above is what each suite proves.

## Things deliberately not asserted

Some tempting properties are false, so they are not tested as rules:

- "Allocation is monotone in the total." It is not: the largest-remainder method can give a line one rupee less when the total goes up (the Alabama paradox). The suite documents this with a known example and tests only the exact sum and the within-one-rupee bound.
- "A higher budget never lowers a single payment" fails for the same reason.

## Not covered by the coverage gate

`public/app.js` (the wiring that talks to the browser, storage and the network) and the screen-building files in `public/ui/` (`overview.js`, `events.js`, `tools.js`, `setup.js`, `helpers.js`) are outside the percentage gate. `screens.test.js` and `ui.test.js` render the main screens and helpers against a fake DOM, and the evidence tests check for no HTML injection, labels and CSP. The rest is checked by hand in desktop and phone-sized browsers. This is stated openly rather than hidden by the coverage number.
