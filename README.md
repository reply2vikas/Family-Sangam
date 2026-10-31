# Family Sangam

**Every celebration this season, one family budget.**

A GenAI planning assistant for weddings, birthdays and community events. Most planners treat each event on its own. Real families pay for several in the same few months out of one pool of money. Family Sangam plans them together and answers three questions:

1. **Will we run short, and on which day?** A cash calendar built from your income dates and vendor payment dates finds the first day the balance goes below zero.
2. **What should we change?** Ranked fixes (pay an advance later within its usual window, skip an optional line, hold back a reserve). Must-haves are never cut.
3. **What if something changes?** Type "50 more guests, smaller budget, event 2 weeks earlier". Gemini reads it, you confirm it, and the plan is revised in place with a "what changed" summary. Ticked tasks and your own amounts are kept.

Live app: https://family-sangam-planner-new.vercel.app/ (demo video and LinkedIn post are linked in the submission form).

## What you get for each event

| Brief asks for | Where it is in the app |
|---|---|
| Budgets | Budget card: every line is labelled **estimate** or **you entered**. Type over any amount and the rest re-balance. Per-guest cost is shown. |
| Timelines | Timeline card: tasks with due dates counted back from the event, "waiting on" links between tasks, **late** flags. |
| Vendor checklists | Vendor card: vendor type, name, status, first payment amount and date, and the usual refund window. |
| Personalised ideas | Ideas card: Gemini ideas shaped by city, style, guests and budget, with refine chips ("Cheaper", "More traditional"). |
| Weddings, birthdays, community events | Three event types with their own budget splits, payment terms and task lists. All three can sit in one season. |

## How the work is split: AI proposes, code decides

| Done by Gemini | Done by plain, tested code |
|---|---|
| Reads a free-text description of the season and fills the setup form | Splits money (largest-remainder, exact to the rupee) |
| Turns a change request into a small structured change | Validates that change, applies it, and explains the effect |
| Writes personalised ideas for one event | Dates, payments, the cash calendar, the shortfall day, ranked fixes |

Every AI answer is requested as structured JSON, then checked by the same validators the form uses. If Gemini is down or its answer does not validate, the app says so and falls back (sample ideas, an offline change parser) with the source labelled on screen. Details: [docs/GENAI.md](docs/GENAI.md).

## Run it

```bash
node -v            # 22 or newer, nothing to install
GEMINI_API_KEY=your-key npm start      # http://localhost:3000
npm run check      # lint + tests with coverage gates
```

No key? The app still works: "Try a sample season", the form, and offline fallbacks.

Deploy: import the repo in Vercel and set `GEMINI_API_KEY`. No build step. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Evaluation criteria

| Criterion | What was done | Proof |
|---|---|---|
| Code quality | Small pure modules, no framework, files under 260 lines, one job per file | `scripts/lint.mjs`, [architecture](docs/ARCHITECTURE.md) |
| Security | Strict CSP (no inline script or style), key only on the server and sent in a header, input validated and size-limited, rate limit, prompt data fenced, no `innerHTML` anywhere | [docs/SECURITY.md](docs/SECURITY.md), `test/evidence.test.js` |
| Efficiency | Zero runtime dependencies, no build, cash calendar is a single pass over at most 800 days, one AI call per action | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Testing | Unit tests, seeded property tests, API tests with a fake Gemini, tests that check this README's claims. Coverage gate in CI | [docs/TESTING.md](docs/TESTING.md) |
| Accessibility | Labelled controls, skip link, live regions, a table for the chart, colour contrast checked in tests, print layout, works on a phone | [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md) |
| Problem alignment | The brief's four outputs for three event types, plus the season-level cash view | table above |

## Assumptions and limits

- Budget splits, payment terms and refund windows are **typical planning assumptions, not vendor quotes**. The app says so on screen. Confirm everything in writing with each vendor.
- Money is whole rupees. Dates are calendar dates, so time zones and daylight saving do not matter.
- The plan lives in your browser (local storage). There are no accounts and no database.
- The change test edits one event at a time. Comparing two vendor quotes and a day-of runbook are not built.
- "Cash runs short" is computed from the income dates and amounts you enter. It is a planning aid, not financial advice.

## Layout

```
public/            the whole front end (no build)
  engine/          pure planning logic, shared by browser and server
  ui/              DOM code (builds elements, never HTML strings)
api/               three Vercel functions: ideas, change, brief
  _lib/            Gemini client, request handling, the three AI tasks
test/              node:test suites
docs/              architecture, GenAI, security, accessibility, testing
```

MIT licence.
