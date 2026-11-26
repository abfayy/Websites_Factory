#!/usr/bin/env node
// Build one tenant and serve it locally with the same security headers Cloudflare will send.
// Usage: node scripts/preview.mjs <folder> [port]      then open http://localhost:4173/
// Author/watermark: abdullah fayyaz
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { buildTenant } from './lib/build.mjs';
import { DIST_DIR } from './lib/tenants.mjs';

const [dir, portArg] = process.argv.slice(2);
if (!dir) { console.error('Usage: node scripts/preview.mjs <tenant-folder> [port]'); process.exit(2); }
const r = buildTenant(dir);
if (!r.ok) { for (const e of r.errors) console.error('error:', e); process.exit(1); }

const root = path.join(DIST_DIR, dir);
const headersFile = readFileSync(path.join(root, '_headers'), 'utf8');
const globalHeaders = {};
for (const line of headersFile.split('\n').slice(1)) {
  if (!line.startsWith('  ')) break;
  const i = line.indexOf(':');
  globalHeaders[line.slice(2, i).trim()] = line.slice(i + 1).trim();
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.xml': 'application/xml' };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(root, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile() || path.basename(file) === '_headers') {
    res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', ...globalHeaders });
  res.end(readFileSync(file));
}).listen(Number(portArg) || 4173, () => console.log(`Preview of ${dir}: http://localhost:${Number(portArg) || 4173}/  (Ctrl+C to stop)`));
