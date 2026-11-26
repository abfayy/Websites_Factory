// Post-build QA gate: inspects the BUILT site in dist/<folder>/ (not the source) and fails the pipeline on
// anything that would embarrass a customer or weaken security. Pure Node, regex based, no dependencies.
// Author/watermark: abdullah fayyaz
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const MAX_HTML_BYTES = 150_000;
const MAX_SITE_BYTES = 5_000_000;

function walk(dir, base = dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, base));
    else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}

const decode = (s) => s.replace(/&(amp|lt|gt|quot|#39);/g, (_, k) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[k]));

export function visibleText(htmlSrc) {
  return decode(
    htmlSrc
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  ).replace(/\s+/g, ' ').trim();
}

/** Returns { errors, warnings } for one built site. `tenant` is the parsed tenant.json. */
export function qaSite(distDir, tenant) {
  const errors = [];
  const warnings = [];
  const file = (f) => path.join(distDir, f);
  if (!existsSync(file('index.html'))) return { errors: ['index.html missing'], warnings };

  const index = readFileSync(file('index.html'), 'utf8');
  const files = walk(distDir);
  const total = files.reduce((n, f) => n + statSync(file(f)).size, 0);
  if (index.length > MAX_HTML_BYTES) errors.push(`index.html is ${index.length} bytes (max ${MAX_HTML_BYTES})`);
  if (total > MAX_SITE_BYTES) errors.push(`site is ${total} bytes (max ${MAX_SITE_BYTES})`);
  if (files.length > 60) errors.push(`${files.length} files (max 60 for a Starter site)`);

  // --- structure & SEO ---
  const h1 = index.match(/<h1[\s>]/gi) || [];
  if (h1.length !== 1) errors.push(`needs exactly one <h1> (found ${h1.length})`);
  const title = (index.match(/<title>([\s\S]*?)<\/title>/i) || [])[1];
  if (!title || !title.trim()) errors.push('missing <title>');
  else if (decode(title).length > 70) warnings.push('<title> is longer than 70 characters');
  const desc = (index.match(/<meta name="description" content="([^"]*)"/i) || [])[1];
  if (!desc) errors.push('missing meta description');
  else if (decode(desc).length < 50 || decode(desc).length > 170) warnings.push('meta description should be 50-160 characters');
  if (!/<html lang="[^"]+" dir="(ltr|rtl)">/.test(index)) errors.push('<html> needs lang and dir');
  if (tenant.language === 'ur' && !/dir="rtl"/.test(index)) errors.push('Urdu site must be dir="rtl"');
  if (!/<meta name="viewport"/.test(index)) errors.push('missing viewport meta tag');

  // --- security: no scripts, no handlers, no inline styles, no mixed content ---
  const scripts = [...index.matchAll(/<script\b([^>]*)>/gi)];
  for (const s of scripts) if (!/type="application\/ld\+json"/i.test(s[1])) errors.push('a <script> other than JSON-LD is present');
  // look at tag skeletons only: blank out attribute values so customer text can't cause false positives
  const skeleton = index.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/="[^"]*"/g, '=""');
  if (/<[a-z][^>]*\son[a-z]+\s*=/i.test(skeleton)) errors.push('inline event handler attribute found');
  if (/<[a-z][^>]*\sstyle\s*=/i.test(skeleton)) errors.push('inline style="" attribute found (blocked by CSP)');
  if (/<iframe|<object|<embed|<form|<link[^>]+rel="stylesheet"/i.test(index)) errors.push('iframe/object/embed/form/external stylesheet is not allowed in a Starter site');

  // --- links and sources ---
  const refs = [...index.matchAll(/\s(href|src)="([^"]*)"/gi)].map((m) => ({ attr: m[1].toLowerCase(), url: decode(m[2]) }));
  for (const { attr, url } of refs) {
    if (url.startsWith('#')) {
      const id = url.slice(1);
      if (id && !new RegExp(`\\sid="${id.replace(/[^a-zA-Z0-9_-]/g, '')}"`).test(index)) errors.push(`anchor ${url} has no target`);
    } else if (/^https:\/\//i.test(url) || /^mailto:[^\s]+@[^\s]+$/i.test(url) || /^tel:\+[0-9]{8,15}$/.test(url)) {
      // ok
    } else if (/^data:image\/svg\+xml,/.test(url) && attr === 'href') {
      // inline favicon
    } else if (/^assets\/[a-zA-Z0-9._-]+$/.test(url)) {
      if (!existsSync(file(url))) errors.push(`${attr}="${url}" points to a missing file`);
    } else {
      errors.push(`disallowed ${attr}: ${url.slice(0, 80)}`);
    }
  }
  for (const m of index.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\salt="[^"]+"/.test(m[0])) errors.push('an <img> has no alt text');
  }

  // --- CSP must actually allow our inline CSS (the #1 way a locked-down site ends up unstyled) ---
  const css = (index.match(/<style>([\s\S]*?)<\/style>/i) || [])[1];
  const headers = existsSync(file('_headers')) ? readFileSync(file('_headers'), 'utf8') : '';
  if (!headers) errors.push('_headers missing (security headers would not be applied)');
  else if (css === undefined) errors.push('no inline <style> found');
  else {
    const hash = createHash('sha256').update(css).digest('base64');
    if (!headers.includes(`'sha256-${hash}'`)) errors.push('CSP style hash does not match the inline CSS (site would render unstyled)');
    if (/script-src/.test(headers) && !/script-src 'none'/.test(headers)) errors.push('CSP script-src must be none');
    if (/unsafe-inline|unsafe-eval/.test(headers)) errors.push("CSP must not contain 'unsafe-inline' or 'unsafe-eval'");
  }

  // --- content sanity ---
  const text = visibleText(index);
  if (/lorem ipsum|\bTODO\b|\bTBD\b|\bundefined\b|\[object|\{\{|\}\}|\bNaN\b/i.test(text)) errors.push('placeholder/debug text found in the page');
  if (!text.includes(tenant.brand.name)) errors.push('brand name is not visible on the page');
  if ((tenant.contact?.show || []).includes('whatsapp') && !/https:\/\/wa\.me\/[0-9]{10,15}/.test(index)) errors.push('WhatsApp requested but no valid wa.me link was rendered');
  for (const it of tenant.services?.items || []) if (!text.includes(it.name)) errors.push(`service "${it.name}" is missing from the page`);
  if (/jazzcash|easypaisa|sadapay|transaction id|\bTID\b/i.test(text)) warnings.push('page mentions payment wording - make sure it is meant for customers of THIS business');

  return { errors, warnings };
}
