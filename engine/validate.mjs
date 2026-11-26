// tenant.json validation: (1) a tiny JSON-Schema subset validator (no dependencies), (2) semantic rules the
// schema cannot express. Used by scripts/validate.mjs, scripts/build.mjs and the tests.
// Author/watermark: abdullah fayyaz
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { walkStrings } from './util.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SCHEMA = JSON.parse(readFileSync(path.join(here, '..', 'schema', 'tenant.schema.json'), 'utf8'));

export const RESERVED_SLUGS = ['www', 'admin', 'api', 'mail', 'app', 'dashboard', 'login', 'static', 'assets', 'cdn', 'sites', 'dev', 'staging', 'test', 'pages', 'cloudflare', 'factory'];

const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);
const typeOk = (v, t) => (t === 'number' ? typeof v === 'number' : t === 'integer' ? Number.isInteger(v) : typeOf(v) === t);
const strLen = (s) => Array.from(s).length;

/** Validate `value` against a JSON-Schema subset. Returns an array of "path: message" strings. */
export function validateSchema(value, schema = SCHEMA, p = '', errors = []) {
  const at = p || '(root)';
  if (schema.const !== undefined && value !== schema.const) { errors.push(`${at}: must be ${JSON.stringify(schema.const)}`); return errors; }
  if (schema.enum && !schema.enum.includes(value)) { errors.push(`${at}: must be one of ${schema.enum.join(', ')} (got ${JSON.stringify(value)})`); return errors; }
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => typeOk(value, t))) { errors.push(`${at}: expected ${types.join('|')}, got ${typeOf(value)}`); return errors; }
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && strLen(value) < schema.minLength) errors.push(`${at}: too short (${strLen(value)} < ${schema.minLength})`);
    if (schema.maxLength !== undefined && strLen(value) > schema.maxLength) errors.push(`${at}: too long (${strLen(value)} > ${schema.maxLength})`);
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) errors.push(`${at}: does not match pattern ${schema.pattern}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${at}: needs at least ${schema.minItems} item(s)`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${at}: at most ${schema.maxItems} item(s)`);
    if (schema.uniqueItems && new Set(value.map((x) => JSON.stringify(x))).size !== value.length) errors.push(`${at}: items must be unique`);
    if (schema.items) value.forEach((x, i) => validateSchema(x, schema.items, `${p}[${i}]`, errors));
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const k of schema.required || []) if (!(k in value)) errors.push(`${p ? p + '.' : ''}${k}: required`);
    const props = schema.properties || {};
    for (const k of Object.keys(value)) {
      if (props[k]) validateSchema(value[k], props[k], p ? `${p}.${k}` : k, errors);
      else if (schema.additionalProperties === false) errors.push(`${p ? p + '.' : ''}${k}: unknown field`);
    }
  }
  return errors;
}

const TAG = /<\s*\/?\s*[a-z!][^>]*>/i;
const SCRIPTY = /\b(?:javascript|vbscript):|data:text\/html/i;

/**
 * Semantic checks. `dirName` is the folder name under tenants/ (must equal the slug, or "_" + slug for samples).
 * Returns { errors, warnings }.
 */
export function semanticChecks(t, dirName) {
  const errors = [];
  const warnings = [];
  if (dirName !== undefined && dirName !== t.slug && dirName !== '_' + t.slug && !dirName.startsWith('_example-')) {
    errors.push(`folder "${dirName}" does not match slug "${t.slug}"`);
  }
  if (RESERVED_SLUGS.includes(t.slug)) errors.push(`slug "${t.slug}" is reserved`);

  walkStrings(t, (s, where) => {
    if (TAG.test(s)) errors.push(`${where}: contains HTML-like markup (plain text only)`);
    if (SCRIPTY.test(s)) errors.push(`${where}: looks like a script URL`);
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(s)) errors.push(`${where}: contains control characters`);
  });

  // every referenced asset must be a unique, declared path (files are checked in scripts/validate.mjs)
  const assets = collectAssets(t);
  if (new Set(assets).size !== assets.length) warnings.push('the same asset is referenced more than once');

  for (const [i, q] of (t.testimonials || []).entries()) {
    if (q.source !== 'customer') errors.push(`testimonials[${i}].source must be "customer" (never invent testimonials)`);
  }
  const show = new Set(t.contact?.show || []);
  if (show.has('whatsapp') && !t.contact.whatsapp) errors.push('contact.show has "whatsapp" but contact.whatsapp is empty');
  if (show.has('call') && !t.contact.phone && !t.contact.whatsapp) errors.push('contact.show has "call" but no phone/whatsapp number');
  if (show.has('email') && !t.contact.email) errors.push('contact.show has "email" but contact.email is empty');
  if (show.has('map') && !t.contact.mapUrl) errors.push('contact.show has "map" but contact.mapUrl is empty');
  if (show.size === 0) warnings.push('contact.show is empty: visitors get no way to contact the business');

  if (t.services?.showPrices === false && (t.services.items || []).some((i) => i.price)) warnings.push('services have prices but showPrices is false');
  if ((t.hero?.image || null) && !t.hero.imageAlt) warnings.push('hero.image has no hero.imageAlt');
  if (!(t.about?.paragraphs || []).length) warnings.push('about.paragraphs is empty: the About section will be skipped');
  return { errors, warnings };
}

export function collectAssets(t) {
  const out = [];
  if (t.brand?.logo) out.push(t.brand.logo);
  if (t.hero?.image) out.push(t.hero.image);
  for (const im of t.images || []) out.push(im.src);
  return out;
}

/** Full validation: schema + semantics. */
export function validateTenant(t, dirName) {
  const schemaErrors = validateSchema(t);
  if (schemaErrors.length) return { errors: schemaErrors, warnings: [] };
  return semanticChecks(t, dirName);
}
