#!/usr/bin/env node
// Phase 1 bridge Google Sheet -> repo workspace.
//   1. In the "Orders" sheet: File > Download > Comma-separated values (.csv)
//   2. node scripts/orders-import.mjs ~/Downloads/Website\ Factory\ -\ Orders\ -\ Orders.csv
// Writes .orders/<ORDER_ID>.json for every build-ready order (payment VERIFIED + status APPROVED/REVISION),
// containing ONLY allowlisted fields, plus .orders/_queue.json. .orders/ is gitignored.
// Author/watermark: abdullah fayyaz
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { csvToObjects } from './lib/csv.mjs';
import { isBuildReady, toOrderRecord } from './lib/orders.mjs';
import { ROOT } from './lib/tenants.mjs';

const [csvPath] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!csvPath) { console.error('Usage: node scripts/orders-import.mjs <orders.csv>'); process.exit(2); }

const rows = csvToObjects(readFileSync(csvPath, 'utf8'));
if (!rows.length || !('order_id' in rows[0])) {
  console.error('This does not look like the Orders sheet (no order_id column). Export the "Orders" tab, not another tab.');
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
