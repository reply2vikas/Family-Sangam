import { checkHealth } from './_lib/health.js';

export default async function handler(req, res) {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end('{"error":"Use GET."}');
  }
  res.statusCode = 200;
  return res.end(JSON.stringify(await checkHealth(process.env)));
}
