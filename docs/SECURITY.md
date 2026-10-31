# Security

| Risk | What is done | Where |
|---|---|---|
| API key leak | Key is read only in `api/` from `process.env`, sent in the `x-goog-api-key` header (never a URL), and never present in browser code. A test scans `public/` for it. | `api/_lib/gemini.js`, `test/evidence.test.js` |
| Script injection | No `innerHTML`, `eval` or HTML parsing anywhere. DOM is built with `createElement` and text nodes. The linter and a test enforce it. | `public/ui/h.js`, `scripts/lint.mjs` |
| CSP | `default-src 'self'`, no `unsafe-inline`, no `unsafe-eval`, `object-src 'none'`, `frame-ancestors 'none'`. The page has no inline script or style attributes. | `vercel.json` |
| Prompt injection | Rules in the system instruction; user text in `<data>` tags with angle brackets removed; model output is validated by code before it is used; AI output can only fill a form or propose a change the person must confirm. | `api/_lib/tasks.js` |
| Bad input | Every boundary goes through `normalizeSeason` / `validateChange` / `cleanIdeas`: types, ranges, real dates, list limits, unknown fields dropped. Saved state is re-validated on load. | `public/engine/schema.js` |
| Abuse | POST only, 16 KB body limit, 20 requests per minute per IP, 60 second function limit. The in-memory limiter is best-effort per instance. | `api/_lib/http.js` |
| Error leaks | Unexpected errors return a generic message; details are not sent to the client. | `api/_lib/http.js` |
| Other headers | `X-Content-Type-Options`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, HSTS. | `vercel.json` |
| Privacy | The plan is stored only in the browser. Text sent to Gemini is the description, change request or ideas request the person typed. No accounts, no database, no analytics. | |

Pasted quotes and message notes go through the same fence and size limits as every other input. Quote text is capped at 2,500 characters, and the model's answer is validated before anything is shown.

Savings and summary routes receive the whole season but rebuild the plan on the server from validated input, so the model can only be shown numbers the code computed. Summaries are checked number by number before they are displayed.

Known limits: the rate limiter is not shared between serverless instances, so a determined abuser could exceed it. A production version would use a shared store.
