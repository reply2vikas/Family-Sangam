# Architecture

Family Sangam is a static front end plus a thin serverless layer: eleven small route files in `api/` (ten Gemini features and a health check) that share three orchestration modules and one Gemini client. There is no framework, no bundler and no runtime dependency, which keeps the code easy to read and the attack surface small.

## Data flow

```
form / Gemini brief  ->  normalizeSeason (validate)  ->  season
season -> buildPlan -> lines, payments, tasks
plan   -> cashCalendar -> daily balance, first negative day
season+calendar -> suggestFixes -> ranked fixes (patches to season.adjust)
text -> /api/change (Gemini or offline parser) -> validateChange -> applyChange -> describeChange
```

A **season** is: start date, money in hand, income dates, and up to six events. Everything shown on screen is derived from it by pure functions, so the same season always gives the same screen.

## Modules (`public/engine`)

| File | Job |
|---|---|
| `money.js` | Largest-remainder split in whole rupees, Indian digit grouping |
| `dates.js` | Calendar-date maths in UTC, month ends and leap years handled |
| `templates.js` | Data for each event type: budget weights, must-haves, payment terms, tasks |
| `plan.js` | Season to lines, payments and tasks; task late/blocked status |
| `cash.js` | Day-by-day balance, shortfall day, worst day |
| `fixes.js` | Candidate fixes, each scored by re-running the calendar; ranking |
| `whatif.js` | One-click bad-day scenarios |
| `change.js` | Validate, apply and explain a change; offline parser |
| `schema.js` | Validation and clean-up for everything crossing a trust boundary |
| `extras.js`, `insights.js` | Checklist, schedule and savings clean-up (savings capped by code); season facts, the number check and RSVP counting |
| `quote.js`, `message.js` | Vendor-quote clean-up, comparison and warnings; message kinds, languages and offline template |
| `ideas.js`, `progress.js`, `view.js`, `sample.js` | Ideas clean-up, saved progress, chart geometry, demo data |
| `types.js` | JSDoc shapes for `Season`, `CelebrationEvent`, `Payment`, `CashCalendar`, `Fix` (no runtime code) |

## Design decisions

- **Integers everywhere.** Money is whole rupees and shares use the largest-remainder method, so line items always add up to the budget exactly.
- **Fixes are data.** A fix is a small patch (`shifted`, `trimmed`, `reserve`) merged into `season.adjust`. Applying, ranking and undoing are all "merge and rebuild".
- **The server is thin.** `api/_lib/tasks.js`, `writing.js` and `more.js` build a fenced prompt, asks for JSON, then validates with the same code the browser uses.
- **Engine shared by both sides.** The functions live under `public/` so the browser can import them as modules; the API imports the same files (`includeFiles` in `vercel.json`).

## Server layout (`api/`)

| Piece | Job |
|---|---|
| `api/*.js` (11 files) | One route each: `brief`, `change`, `ideas`, `quote`, `message`, `checklist`, `runshow`, `savings`, `explain`, `rsvp`, `health`. Each is one line that wraps a function in `route(...)` |
| `api/_lib/http.js` | `route()`: POST only, 16 KB limit, 20 requests a minute per address, generic errors |
| `api/_lib/gemini.js` | The only file that talks to Gemini: JSON output, model failover, cooldowns, key from the environment |
| `api/_lib/tasks.js`, `writing.js`, `more.js` | The ten features: build the fenced prompt, call Gemini, validate with the engine, fall back and label the source |
| `api/_lib/health.js` | The `/api/health` self-check (never returns the key) |

## Performance

The cash calendar is one pass over at most 800 days. Ranking fixes re-runs it once per candidate (a few dozen). A typical season renders in a few milliseconds. Each AI feature is one model call.

## Deployment

Vercel serves `public/` and runs `api/*.js`. Set `GEMINI_API_KEY` in the project settings. `vercel.json` sets the security headers and a 60 second function limit.
