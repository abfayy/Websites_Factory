#!/usr/bin/env node
// Which real (non-sample) tenants changed between two git refs? Prints a JSON array of folder names.
// Used by the deploy workflow to build a matrix: only changed customers are redeployed.
// Usage: node scripts/changed-tenants.mjs <base-ref> [head-ref=HEAD] [--include-engine]
//   --include-engine : if engine/ or schema/ changed, return ALL tenants (re-deploy everyone)
// Author/watermark: abdullah fayyaz
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { listTenantDirs, isSample } from './lib/tenants.mjs';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

/** Pure function (unit-tested): changed file paths + existing folders -> tenant folders to deploy. */
export function tenantsFromPaths(paths, existing, { includeEngine = false } = {}) {
  // only folder names that are valid slugs are ever handed to the deploy matrix (shell/injection safety)
  const real = existing.filter((d) => !isSample(d) && SLUG_RE.test(d));
  const touched = new Set();
  let engine = false;
  for (const p of paths) {
    const m = /^tenants\/([^/]+)\//.exec(p);
    if (m) touched.add(m[1]);
    else if (/^(engine|schema)\//.test(p)) engine = true;
  }
  if (includeEngine && engine) return real;
  return real.filter((d) => touched.has(d));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const includeEngine = process.argv.includes('--include-engine');
  const [base, head = 'HEAD'] = args;
  if (!base) { console.error('Usage: changed-tenants.mjs <base-ref> [head-ref] [--include-engine]'); process.exit(2); }
  // an all-zero base (first push of a branch) or unknown base => treat everything as changed
  let paths;
  try {
    if (/^0+$/.test(base)) throw new Error('no base');
    paths = execFileSync('git', ['diff', '--name-only', `${base}`, head], { encoding: 'utf8' }).split('\n').filter(Boolean);
  } catch {
    paths = listTenantDirs().map((d) => `tenants/${d}/tenant.json`);
  }
  console.log(JSON.stringify(tenantsFromPaths(paths, listTenantDirs(), { includeEngine })));
}
