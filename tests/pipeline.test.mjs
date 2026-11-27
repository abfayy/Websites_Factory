// Pipeline tests: CSV import + privacy allowlist, changed-tenant detection, build + QA gate (incl. negative cases).
// Author/watermark: abdullah fayyaz
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { parseCsv, csvToObjects } from '../scripts/lib/csv.mjs';
import { ORDER_PUBLIC_FIELDS, ORDER_PRIVATE_FIELDS, isBuildReady, toOrderRecord } from '../scripts/lib/orders.mjs';
import { tenantsFromPaths } from '../scripts/changed-tenants.mjs';
import { buildTenant } from '../scripts/lib/build.mjs';
import { qaSite, visibleText } from '../engine/qa.mjs';
import { DIST_DIR, loadTenant } from '../scripts/lib/tenants.mjs';

// ---------- CSV ----------
test('csv: quotes, doubled quotes, embedded newlines, CRLF, BOM', () => {
  const text = '﻿a,b,c\r\n1,"x, y",3\r\n"multi\nline","say ""hi""",\r\n';
  assert.deepEqual(parseCsv(text), [['a', 'b', 'c'], ['1', 'x, y', '3'], ['multi\nline', 'say "hi"', '']]);
});

test('csv: objects keyed by header, short rows padded', () => {
  assert.deepEqual(csvToObjects('a,b\n1\n'), [{ a: '1', b: '' }]);
  assert.deepEqual(csvToObjects(''), []);
});

test('csv: Urdu and leading-zero phone numbers survive', () => {
  const [r] = csvToObjects('name,whatsapp\n"بیکری","03001234567"\n');
  assert.equal(r.name, 'بیکری');
  assert.equal(r.whatsapp, '03001234567');
});

// ---------- orders privacy ----------
test('orders: private columns can never be exported', () => {
  for (const k of ORDER_PRIVATE_FIELDS) assert.ok(!ORDER_PUBLIC_FIELDS.includes(k), `${k} is in the public allowlist`);
  const row = Object.fromEntries([...ORDER_PUBLIC_FIELDS, ...ORDER_PRIVATE_FIELDS].map((k) => [k, 'x']));
  const rec = toOrderRecord(row);
  for (const k of ORDER_PRIVATE_FIELDS) assert.ok(!(k in rec), `${k} leaked`);
  assert.equal(Object.keys(rec).length, ORDER_PUBLIC_FIELDS.length);
});

test('orders: only VERIFIED + APPROVED/REVISION orders are build-ready', () => {
  assert.ok(isBuildReady({ payment_status: 'VERIFIED', status: 'APPROVED' }));
  assert.ok(isBuildReady({ payment_status: 'verified', status: 'revision' }));
  assert.ok(!isBuildReady({ payment_status: 'PENDING', status: 'APPROVED' }));
  assert.ok(!isBuildReady({ payment_status: 'VERIFIED', status: 'NEW' }));
  assert.ok(!isBuildReady({ payment_status: 'DUPLICATE_TID', status: 'APPROVED' }));
  assert.ok(!isBuildReady({ payment_status: 'VERIFIED', status: 'DELIVERED' }));
});

// ---------- changed tenants ----------
test('changed-tenants: only real tenants whose files changed', () => {
  const existing = ['_example-al-noor-bakery', 'acme', 'zed'];
  assert.deepEqual(tenantsFromPaths(['tenants/acme/tenant.json', 'README.md'], existing), ['acme']);
  assert.deepEqual(tenantsFromPaths(['tenants/_example-al-noor-bakery/tenant.json'], existing), []);
  assert.deepEqual(tenantsFromPaths(['tenants/gone/tenant.json'], existing), []);
  assert.deepEqual(tenantsFromPaths(['engine/render.mjs'], existing), []);
  assert.deepEqual(tenantsFromPaths(['engine/render.mjs'], existing, { includeEngine: true }), ['acme', 'zed']);
  assert.deepEqual(tenantsFromPaths(['schema/tenant.schema.json', 'tenants/zed/assets/a.png'], existing, { includeEngine: true }), ['acme', 'zed']);
});

test('changed-tenants: folder names that are not valid slugs never reach the deploy matrix', () => {
  const existing = ['good-one', 'Bad Name', 'x;rm -rf', 'ab'];
  const paths = existing.map((d) => `tenants/${d}/tenant.json`);
  assert.deepEqual(tenantsFromPaths(paths, existing), ['good-one']);
});

// ---------- build + QA ----------
const SAMPLE = '_example-al-noor-bakery';

test('build + QA pass for the sample tenant', () => {
  const r = buildTenant(SAMPLE, { year: 2026 });
  assert.ok(r.ok, JSON.stringify(r.errors));
  const qa = qaSite(path.join(DIST_DIR, SAMPLE), loadTenant(SAMPLE));
  assert.deepEqual(qa.errors, []);
});

test('build fails loudly for an unknown tenant folder', () => {
  assert.throws(() => buildTenant('does-not-exist'), /not found/);
});

test('QA catches tampered output', () => {
  buildTenant(SAMPLE, { year: 2026 });
  const dist = path.join(DIST_DIR, SAMPLE);
  const tenant = loadTenant(SAMPLE);
  const original = readFileSync(path.join(dist, 'index.html'), 'utf8');
  const run = (mutate) => { writeFileSync(path.join(dist, 'index.html'), mutate(original)); return qaSite(dist, tenant).errors.join(' | '); };

  assert.match(run((h) => h.replace('</body>', '<script>alert(1)</script></body>')), /script/);
  assert.match(run((h) => h.replace('<h1>', '<h1 onclick="x()">')), /event handler/);
  assert.match(run((h) => h.replace('<body class=', '<body style="color:red" class=')), /style/);
  assert.match(run((h) => h.replace('</main>', '<p>Lorem ipsum dolor</p></main>')), /placeholder/);
  assert.match(run((h) => h.replace('</main>', '<a href="http://insecure.example">x</a></main>')), /disallowed href/);
  assert.match(run((h) => h.replace('</main>', '<img src="assets/missing.png" alt="x"></main>')), /missing file/);
  assert.match(run((h) => h.replace('</main>', '<img src="data:image/png;base64,AAAA">')), /alt|disallowed src/);
  assert.match(run((h) => h.replace('href="#faq"', 'href="#nowhere"')), /no target/);
  assert.match(run((h) => h.replace(/<style>[\s\S]*?<\/style>/, '<style>body{color:red}</style>')), /CSP style hash/);
  assert.match(run((h) => h.replace(/<h1>[\s\S]*?<\/h1>/, '')), /exactly one <h1>/);
  assert.match(run((h) => h.replace(/ dir="ltr"/, '')), /lang and dir/);

  // restore a clean build for any later test
  buildTenant(SAMPLE, { year: 2026 });
  assert.deepEqual(qaSite(dist, tenant).errors, []);
});

test('QA flags a missing _headers file', () => {
  buildTenant(SAMPLE, { year: 2026 });
  const dist = path.join(DIST_DIR, SAMPLE);
  const hdr = path.join(dist, '_headers');
  const keep = readFileSync(hdr, 'utf8');
  rmSync(hdr);
  assert.ok(qaSite(dist, loadTenant(SAMPLE)).errors.some((e) => /_headers missing/.test(e)));
  writeFileSync(hdr, keep);
  assert.ok(existsSync(hdr));
});

test('visibleText ignores style, script, comments and tags', () => {
  assert.equal(visibleText('<!-- c --><style>a{}</style><script>x()</script><p>Hello <b>&amp; bye</b></p>'), 'Hello & bye');
});

// ---------- Build_Queue formula + sheet-rows input ----------
import { rowsToObjects } from '../scripts/lib/csv.mjs';
import { ORDERS_SHEET_COLUMNS, buildQueueFormula, columnLetter, WRITEBACK_FIELDS, WRITEBACK_STATUSES } from '../scripts/lib/orders.mjs';

test('rowsToObjects: sheet API arrays behave like CSV rows', () => {
  assert.deepEqual(rowsToObjects([['order_id', 'whatsapp'], ['WEB-0001', '03001234567'], ['', '']]), [{ order_id: 'WEB-0001', whatsapp: '03001234567' }]);
  assert.deepEqual(rowsToObjects([]), []);
  assert.deepEqual(rowsToObjects([['a']]), []);
});

test('columnLetter', () => {
  assert.deepEqual([1, 26, 27, 52, 53, 59].map(columnLetter), ['A', 'Z', 'AA', 'AZ', 'BA', 'BG']);
});

test('ORDERS_SHEET_COLUMNS equals ORDER_COLUMNS of the Apps Script (cannot drift)', () => {
  const gs = readFileSync(new URL('../google/setup-form.gs', import.meta.url), 'utf8');
  const fields = gs.slice(gs.indexOf('const FIELDS'), gs.indexOf('const FIELD_KEYS'));
  const keys = [...fields.matchAll(/\{\s*key:\s*'([a-z_0-9]+)'/g)].map((m) => m[1]);
  const admin = [...gs.match(/const ADMIN_COLUMNS = \[([^\]]*)\]/)[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  assert.deepEqual(ORDERS_SHEET_COLUMNS, ['order_id', 'created_at', 'status', 'payment_status', ...keys, ...admin]);
});

test('Build_Queue formula selects only allowlisted columns and the VERIFIED/APPROVED filter', () => {
  const f = buildQueueFormula();
  const selected = /select (.*?) where/.exec(f)[1].split(', ').map((c) => ORDERS_SHEET_COLUMNS[Number(c.slice(3)) - 1]);
  assert.deepEqual(selected, ORDER_PUBLIC_FIELDS);
  for (const k of ORDER_PRIVATE_FIELDS) assert.ok(!selected.includes(k), `${k} would be exposed`);
  const st = ORDERS_SHEET_COLUMNS.indexOf('status') + 1, ps = ORDERS_SHEET_COLUMNS.indexOf('payment_status') + 1;
  assert.ok(f.includes(`Col${ps} = 'VERIFIED'`) && f.includes(`Col${st} = 'APPROVED'`) && f.includes(`Col${st} = 'REVISION'`));
  assert.ok(f.startsWith('=QUERY(Orders!A:BG,'));
});

test('write-back is limited to status/project_name/qa_notes and safe statuses', () => {
  assert.deepEqual(WRITEBACK_FIELDS, ['status', 'project_name', 'qa_notes']);
  for (const k of ORDER_PRIVATE_FIELDS) assert.ok(!WRITEBACK_FIELDS.includes(k));
  assert.ok(!WRITEBACK_STATUSES.includes('APPROVED') && !WRITEBACK_STATUSES.includes('DEPLOYED') && !WRITEBACK_STATUSES.includes('REJECTED'));
});

test('docs/AUTOMATION.md contains the current Build_Queue formula', () => {
  const doc = readFileSync(new URL('../docs/AUTOMATION.md', import.meta.url), 'utf8');
  assert.ok(doc.includes(buildQueueFormula()), 'run `npm run queue-formula` and update docs/AUTOMATION.md');
});
