// A tiny self-check so the owner can see whether Gemini is reachable. It never returns the key.

import { generateJSON, GeminiError } from './gemini.js';

const TTL_MS = 60_000;
let cached = null;

export function resetHealth() {
  cached = null;
}

export async function checkHealth(env, deps = {}) {
  const now = (deps.now || Date.now)();
  if (cached && now - cached.at < TTL_MS) return { ...cached.body, cached: true };
  const key = env.GEMINI_API_KEY || '';
  const body = { keyPresent: key.length > 0, keyLooksValid: /^AIza[0-9A-Za-z_-]{30,}$/.test(key), gemini: 'not tested' };
  if (body.keyPresent) {
    try {
      const r = await generateJSON({
        system: 'Reply with JSON only.', user: 'Return {"ok": true}.', apiKey: key,
        schema: { type: 'OBJECT', properties: { ok: { type: 'BOOLEAN' } } }, timeoutMs: 15_000, ...deps,
      });
      body.gemini = r.data?.ok === true ? 'working' : 'answered but unexpected';
      body.model = r.model;
    } catch (err) {
      body.gemini = err instanceof GeminiError ? `failed: ${err.reason || err.code}` : 'failed';
    }
  } else {
    body.gemini = 'GEMINI_API_KEY is not set for this deployment';
  }
  cached = { at: now, body };
  return body;
}
