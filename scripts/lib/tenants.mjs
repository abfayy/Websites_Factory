// Shared helpers for the CLI scripts: find tenants, load them, parse the common flags.
// Author/watermark: abdullah fayyaz
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const TENANTS_DIR = path.join(ROOT, 'tenants');
export const DIST_DIR = path.join(ROOT, 'dist');

/** Folder names under tenants/. Folders starting with "_" are samples: built and tested, never deployed. */
export function listTenantDirs() {
  if (!existsSync(TENANTS_DIR)) return [];
  return readdirSync(TENANTS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
}
export const isSample = (dirName) => dirName.startsWith('_');

export function loadTenant(dirName) {
  const file = path.join(TENANTS_DIR, dirName, 'tenant.json');
  if (!existsSync(file)) throw new Error(`tenants/${dirName}/tenant.json not found`);
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`tenants/${dirName}/tenant.json is not valid JSON: ${e.message}`);
  }
}

/** --all | --slug a,b | positional folder names. Returns folder names. */
export function selectTenants(argv) {
  const args = argv.slice(2);
  const all = listTenantDirs();
  if (args.includes('--all')) return all;
  const names = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--slug') { names.push(...String(args[++i] || '').split(',').filter(Boolean)); continue; }
    if (!args[i].startsWith('--')) names.push(args[i]);
  }
  if (!names.length) {
    console.error('Usage: <script> --all | --slug a,b | <folder> ...');
    process.exit(2);
  }
  for (const n of names) if (!all.includes(n)) { console.error(`Unknown tenant folder: ${n}`); process.exit(2); }
  return names;
}
