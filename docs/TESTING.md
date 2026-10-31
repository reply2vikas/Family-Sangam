# Testing

Run `npm test` for the suites or `npm run check` for lint plus the coverage gate (95% lines, 90% branches, 95% functions over `public/engine` and `api`). Built-in `node:test` only; nothing to install.

| Suite | What it proves |
|---|---|
| `engine.test.js` | Money splits add up exactly and stay within one rupee of the exact share; date maths across month ends and leap years; line items always equal the budget (200 random seasons); payments add up to lines; the sample season has its known gap on a known day |
| Property tests (seeded) | Later income never raises the lowest balance; more cash never lowers it; paying an advance later within its window never lowers it; the top fix never makes things worse and never cuts a must-have |
| `change.test.js` | Validation rejects bad dates, ranges and unknown fields; a change touches only its target event and keeps progress; the "what changed" text; the offline parser handles the example sentence |
| `api.test.js` | Gemini client sends the key in a header, fails over between models, cools down rate-limited ones, and turns every failure into one error; routes enforce method, size and rate limits; each AI task validates output and falls back honestly; user text cannot break out of the prompt fence |
| `evidence.test.js` | Checks the README's claims against the files: lint rules, CSP, no key in browser code, no runtime dependencies, docs exist, accessibility basics, colour contrast |

## Things deliberately not asserted

Some tempting properties are false, so they are not tested as rules:

- "Allocation is monotone in the total." It is not: the largest-remainder method can give a line one rupee less when the total goes up (the Alabama paradox). The suite documents this with a known example and tests only the exact sum and the within-one-rupee bound.
- "A higher budget never lowers a single payment" fails for the same reason.

## Not covered by the coverage gate

`public/app.js` and `public/ui/*` build the screen from the tested engine. They are checked by hand in desktop and phone-sized browsers and by the evidence tests (no HTML injection, labels, CSP), not by unit tests. This is stated openly rather than hidden by the coverage number.
