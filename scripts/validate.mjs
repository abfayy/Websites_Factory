#!/usr/bin/env node
// Validate tenants/*/tenant.json (schema + semantic rules + asset files). Exit 1 on any error.
// Usage: node scripts/validate.mjs --all | --slug a,b | <folder>
// Author/watermark: abdullah fayyaz
import { selectTenants, listTenantDirs } from './lib/tenants.mjs';
import { checkTenant } from './lib/build.mjs';

const dirs = selectTenants(process.argv);
let failed = 0;
const slugs = new Map();
const orders = new Map();

for (const dir of dirs) {
  let res;
  try { res = checkTenant(dir); } catch (e) { res = { tenant: null, errors: [e.message], warnings: [] }; }
  const { tenant, errors, warnings } = res;
  if (tenant) {
    if (slugs.has(tenant.slug)) errors.push(`slug "${tenant.slug}" is also used by ${slugs.get(tenant.slug)}`);
    slugs.set(tenant.slug, dir);
    if (orders.has(tenant.orderId)) errors.push(`orderId ${tenant.orderId} is also used by ${orders.get(tenant.orderId)}`);
    orders.set(tenant.orderId, dir);
  }
  const mark = errors.length ? 'FAIL' : 'ok  ';
  console.log(`${mark}  ${dir}`);
  for (const e of errors) console.log(`        error: ${e}`);
  for (const w of warnings) console.log(`        warn:  ${w}`);
  if (errors.length) failed++;
}

if (!dirs.length) console.log('(no tenants found)');
console.log(`\n${dirs.length - failed}/${dirs.length} tenant(s) valid (${listTenantDirs().length} folder(s) in tenants/)`);
process.exit(failed ? 1 : 0);
