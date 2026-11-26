#!/usr/bin/env node
// QA gate on the BUILT output in dist/. Usage: node scripts/qa.mjs --all | --slug a,b | <folder>
// Writes reports/qa.json (gitignored) and exits 1 if any site has errors.
// Author/watermark: abdullah fayyaz
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { selectTenants, loadTenant, DIST_DIR, ROOT } from './lib/tenants.mjs';
import { qaSite } from '../engine/qa.mjs';

const dirs = selectTenants(process.argv);
const report = {};
let failed = 0;
for (const dir of dirs) {
  const dist = path.join(DIST_DIR, dir);
  if (!existsSync(dist)) { console.log(`FAIL  ${dir}\n        error: dist/${dir} not found - run the build first`); failed++; continue; }
  const { errors, warnings } = qaSite(dist, loadTenant(dir));
  report[dir] = { ok: errors.length === 0, errors, warnings };
  console.log(`${errors.length ? 'FAIL' : 'ok  '}  ${dir}`);
  for (const e of errors) console.log(`        error: ${e}`);
  for (const w of warnings) console.log(`        warn:  ${w}`);
  if (errors.length) failed++;
}
mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
writeFileSync(path.join(ROOT, 'reports', 'qa.json'), JSON.stringify(report, null, 2));
console.log(`\n${dirs.length - failed}/${dirs.length} passed QA`);
process.exit(failed ? 1 : 0);
