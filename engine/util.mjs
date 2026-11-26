// Small, dependency-free helpers shared by the engine, QA and scripts.
// Author/watermark: abdullah fayyaz

/** Marks a string as already-safe HTML. Everything else interpolated into html`` is escaped. */
export class Raw {
  constructor(s) { this.s = String(s); }
  toString() { return this.s; }
}
export const raw = (s) => new Raw(s);

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
}

function part(v) {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(part).join('');
  return esc(v);
}

/**
 * Tagged template: every interpolated value is HTML-escaped unless it is a Raw (output of another html``)
 * or an array of those. Customer text can therefore never inject markup.
 */
export function html(strings, ...vals) {
  let out = strings[0];
  for (let i = 0; i < vals.length; i++) out += part(vals[i]) + strings[i + 1];
  return new Raw(out);
}

/** Pakistani / international phone -> digits with country code, e.g. 03001234567 -> 923001234567. null if unusable. */
export function waNumber(input) {
  let d = String(input ?? '').replace(/[^\d]/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0') && d.length === 11) d = '92' + d.slice(1);       // 03XXXXXXXXX
  else if (d.length === 10 && d.startsWith('3')) d = '92' + d;           // 3XXXXXXXXX
  if (d.length < 10 || d.length > 15) return null;
  return d;
}

export function prettyPhone(input) {
  const d = waNumber(input);
  if (!d) return '';
  if (d.startsWith('92') && d.length === 12) return `+92 ${d.slice(2, 5)} ${d.slice(5)}`;
  return '+' + d;
}

export function slugify(s) {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ---- colour maths (WCAG 2.x) ----
export function hexToRgb(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error('bad hex colour: ' + hex);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Recursively visit every string in a JSON value: cb(string, path). */
export function walkStrings(v, cb, path = '') {
  if (typeof v === 'string') cb(v, path);
  else if (Array.isArray(v)) v.forEach((x, i) => walkStrings(x, cb, `${path}[${i}]`));
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) walkStrings(v[k], cb, path ? `${path}.${k}` : k);
}
