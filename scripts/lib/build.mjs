// Build one tenant folder -> dist/<folder>/ (validated first; refuses to build invalid data).
// Author/watermark: abdullah fayyaz
import { mkdirSync, writeFileSync, copyFileSync, existsSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { renderSite } from '../../engine/render.mjs';
import { validateTenant, collectAssets } from '../../engine/validate.mjs';
import { TENANTS_DIR, DIST_DIR, loadTenant } from './tenants.mjs';

export const MAX_ASSET_BYTES = 1_000_000;

/** Validate + check asset files. Returns { tenant, errors, warnings }. */
export function checkTenant(dirName) {
  const tenant = loadTenant(dirName);
  const { errors, warnings } = validateTenant(tenant, dirName);
  if (!errors.length) {
    for (const a of collectAssets(tenant)) {
      const file = path.join(TENANTS_DIR, dirName, a);
      if (!existsSync(file)) { errors.push(`asset missing: ${a}`); continue; }
      const size = statSync(file).size;
      if (size > MAX_ASSET_BYTES) errors.push(`asset too large (${Math.round(size / 1024)} KB > ${MAX_ASSET_BYTES / 1000} KB): ${a} - compress it`);
      else if (size > 400_000) warnings.push(`asset is big (${Math.round(size / 1024)} KB): ${a}`);
    }
  }
  return { tenant, errors, warnings };
}

export function buildTenant(dirName, { year } = {}) {
  const { tenant, errors, warnings } = checkTenant(dirName);
  if (errors.length) return { ok: false, errors, warnings };
  const out = path.join(DIST_DIR, dirName);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const { files, meta } = renderSite(tenant, year ? { year } : {});
  for (const [name, body] of Object.entries(files)) writeFileSync(path.join(out, name), body);
  for (const a of new Set(collectAssets(tenant))) {
    mkdirSync(path.join(out, 'assets'), { recursive: true });
    copyFileSync(path.join(TENANTS_DIR, dirName, a), path.join(out, a));
  }
  return { ok: true, out, errors, warnings, tenant, meta, files: Object.keys(files) };
}
