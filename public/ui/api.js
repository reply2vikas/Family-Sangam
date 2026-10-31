// Calls our own server routes. The browser never sees an API key.

export async function postJSON(path, body) {
  let res;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(50_000),
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  let data = {};
  try { data = await res.json(); } catch { /* non-JSON error page */ }
  if (!res.ok) throw new Error(data.error || 'That did not work. Please try again.');
  return data;
}
