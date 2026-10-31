// Local dev server: serves /public and runs the /api functions. Usage: GEMINI_API_KEY=... node scripts/dev.mjs
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };
const port = Number(process.env.PORT) || 3000;

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.slice(5).replace(/[^a-z]/g, '');
    let raw = '';
    for await (const chunk of req) raw += chunk;
    try { req.body = raw ? JSON.parse(raw) : null; } catch { req.body = null; }
    try { return (await import(pathToFileURL(join(root, 'api', `${name}.js`)))).default(req, res); } catch { res.statusCode = 404; return res.end('{}'); }
  }
  const rel = normalize(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^(\.\.[/\\])+/, '');
  try {
    const body = await readFile(join(root, 'public', rel));
    res.setHeader('content-type', types[extname(rel)] || 'application/octet-stream');
    res.end(body);
  } catch { res.statusCode = 404; res.end('Not found'); }
}).listen(port, () => console.log(`http://localhost:${port}`));
