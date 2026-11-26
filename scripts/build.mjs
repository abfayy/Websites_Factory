#!/usr/bin/env node
// Build tenants into dist/<folder>/ . Usage: node scripts/build.mjs --all | --slug a,b | <folder>
// BUILD_YEAR env pins the footer year (reproducible builds).
// Author/watermark: abdullah fayyaz
import { selectTenants } from './lib/tenants.mjs';
import { buildTenant } from './lib/build.mjs';

const year = process.env.BUILD_YEAR ? Number(process.env.BUILD_YEAR) : undefined;
const dirs = selectTenants(process.argv);
let failed = 0;
for (const dir of dirs) {
  const r = buildTenant(dir, { year });
  if (!r.ok) {
    failed++;
    console.log(`FAIL  ${dir}`);
    for (const e of r.errors) console.log(`        error: ${e}`);
    continue;
  }
  console.log(`built ${dir} -> dist/${dir}/  (${r.files.join(', ')}; sections: ${r.meta.sections.join(', ')})`);
  for (const w of r.warnings) console.log(`        warn:  ${w}`);
}
console.log(`\n${dirs.length - failed}/${dirs.length} built`);
process.exit(failed ? 1 : 0);
