// Shared request handling for the API routes: method check, size limit, rate limit, JSON replies.

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const MAX_BODY_BYTES = 16_000;

const hits = new Map();

export function resetRateLimit() {
  hits.clear();
}

function limited(ip, now) {
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // keep memory bounded on a long-lived instance
  return recent.length > MAX_PER_WINDOW;
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}

/**
 * Wrap a route. `run(body, env)` returns a JSON-able object or throws an Error with `.status`.
 */
export function route(run, { env = process.env, now = Date.now } = {}) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('allow', 'POST');
      return send(res, 405, { error: 'Use POST.' });
    }
    const ip = String(req.headers?.['x-forwarded-for'] || 'local').split(',')[0].trim();
    if (limited(ip, now())) return send(res, 429, { error: 'Too many requests. Try again in a minute.' });
    const body = req.body;
    if (!body || typeof body !== 'object' || JSON.stringify(body).length > MAX_BODY_BYTES) {
      return send(res, 400, { error: 'Send a small JSON body.' });
    }
    try {
      return send(res, 200, await run(body, env));
    } catch (err) {
      const status = Number.isInteger(err.status) ? err.status : 500;
      return send(res, status, { error: status === 500 ? 'Something went wrong.' : err.message });
    }
  };
}

export function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}
