#!/usr/bin/env node
// Bridge Google Sheet -> repo workspace. Two input modes, same privacy allowlist:
//   CSV (manual):   node scripts/orders-import.mjs <orders.csv>
//   Rows (cloud):   node scripts/orders-import.mjs --rows <rows.json>
//                   rows.json = JSON 2-D array, header row first (what the Sheets connector returns for the
//                   "Build_Queue" tab; see docs/AUTOMATION.md). The file must live OUTSIDE the repo (e.g. /tmp).
// Writes .orders/<ORDER_ID>.json for every build-ready order (payment VERIFIED + status APPROVED/REVISION),
// containing ONLY allowlisted fields, plus .orders/_queue.json. .orders/ is gitignored.
// Author/watermark: abdullah fayyaz
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { csvToObjects, rowsToObjects } from './lib/csv.mjs';
import { isBuildReady, toOrderRecord } from './lib/orders.mjs';
import { ROOT } from './lib/tenants.mjs';

const args = process.argv.slice(2);
const rowsMode = args.includes('--rows');
const [input] = args.filter((a) => !a.startsWith('--'));
if (!input) {
  console.error('Usage: node scripts/orders-import.mjs <orders.csv>\n       node scripts/orders-import.mjs --rows <rows.json>');
  process.exit(2);
}

let rows;
try {
  const text = readFileSync(input, 'utf8');
  rows = rowsMode ? rowsToObjects(JSON.parse(text)) : csvToObjects(text);
} catch (e) {
  console.error(`Could not read ${input}: ${e.message}`);
  process.exit(1);
}
if (!rows.length) {
  console.log('Queue is empty: nothing to build.');
  mkdirSync(path.join(ROOT, '.orders'), { recursive: true });
  writeFileSync(path.join(ROOT, '.orders', '_queue.json'), '[]');
  process.exit(0);
}
if (!('order_id' in rows[0])) {
  console.error('This does not look like the Orders / Build_Queue sheet (no order_id column).');
  process.exit(1);
}

const out = path.join(ROOT, '.orders');
mkdirSync(out, { recursive: true });
const queue = [];
const skipped = [];
for (const row of rows) {
  if (!/^WEB-[0-9]{4,}$/.test(row.order_id)) continue;
  if (!isBuildReady(row)) { skipped.push(`${row.order_id} (${row.status}/${row.payment_status})`); continue; }
  writeFileSync(path.join(out, `${row.order_id}.json`), JSON.stringify(toOrderRecord(row), null, 2));
  queue.push({ order_id: row.order_id, status: row.status, brand_name: row.brand_name, subdomain: row.subdomain || row.preferred_subdomain || '' });
}
writeFileSync(path.join(out, '_queue.json'), JSON.stringify(queue, null, 2));
console.log(`Ready to build: ${queue.length}`);
for (const q of queue) console.log(`  ${q.order_id}  ${q.brand_name}  [${q.status}]`);
if (skipped.length) console.log(`Not ready (payment not VERIFIED or status not APPROVED/REVISION): ${skipped.length}\n  ${skipped.join('\n  ')}`);
