// Minimal Gemini client: structured JSON output, model failover and short cooldowns.
// The API key is sent in a header (never in the URL) and only ever read on the server.

export const MODELS = ['gemini-flash-lite-latest', 'gemini-flash-latest'];
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const COOLDOWN_MS = 60_000;

const cooldown = new Map();

export class GeminiError extends Error {
  constructor(code, cause) {
    super(code);
    this.code = code;
    this.cause = cause;
  }
}

/** Remove characters that could close or fake our data tags inside a prompt. */
export function fence(text, max = 800) {
  return String(text ?? '').replace(/[<>]/g, ' ').slice(0, max);
}

/**
 * Ask Gemini for JSON that matches `schema`.
 * Tries each model in turn; models that rate-limit or fail are skipped for a minute.
 * @returns {Promise<{data: object, model: string}>}
 */
export async function generateJSON({
  system, user, schema, apiKey, fetchImpl = fetch, now = Date.now, models = MODELS, timeoutMs = 25_000,
}) {
  if (!apiKey) throw new GeminiError('no-key');
  let last = null;
  for (const model of models) {
    if ((cooldown.get(model) || 0) > now()) continue;
    try {
      const res = await fetchImpl(`${BASE}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.4 },
        }),
      });
      if (res.status === 429 || res.status >= 500) {
        cooldown.set(model, now() + COOLDOWN_MS);
        last = new Error(`status ${res.status}`);
        continue;
      }
      if (!res.ok) { last = new Error(`status ${res.status}`); continue; }
      const body = await res.json();
      const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text !== 'string') { last = new Error('empty answer'); continue; }
      return { data: JSON.parse(text), model };
    } catch (err) {
      last = err;
    }
  }
  const failure = new GeminiError('unavailable', last);
  failure.reason = last?.message || 'unknown';
  // Visible in the hosting provider's logs (never includes the key or any user text).
  if (!process.env.NODE_TEST_CONTEXT) console.error(`gemini unavailable: ${failure.reason}`);
  throw failure;
}

/** Test helper: forget cooldowns. */
export function resetCooldowns() {
  cooldown.clear();
}
