// Engine tests: escaping/XSS, phone numbers, colour contrast for EVERY theme x colour, rendering rules.
// Run: npm test
// Author/watermark: abdullah fayyaz
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { html, esc, waNumber, prettyPhone, contrast, slugify } from '../engine/util.mjs';
import { resolveDesign, THEME_IDS, COLOR_IDS } from '../engine/themes.mjs';
import { LABELS } from '../engine/i18n.mjs';
import { renderSite } from '../engine/render.mjs';

const sample = () => JSON.parse(readFileSync(new URL('../tenants/_example-al-noor-bakery/tenant.json', import.meta.url), 'utf8'));

test('esc escapes the five dangerous characters', () => {
  assert.equal(esc(`<a href="x" onclick='y'>&`), '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;');
  assert.equal(esc(null), '');
});

test('html`` escapes interpolations but not nested html``', () => {
  const inner = html`<b>${'<i>'}</b>`;
  assert.equal(String(html`<p>${inner}${'<script>'}</p>`), '<p><b>&lt;i&gt;</b>&lt;script&gt;</p>');
});

test('customer text can never inject markup into the rendered page', () => {
  const t = sample();
  const evil = `"><script>alert(1)</script><img src=x onerror=alert(2)>`;
  t.brand.name = evil;
  t.hero.headline = evil;
  t.services.items[0].name = evil;
  t.testimonials[0].quote = evil;
  t.faq[0].q = evil;
  t.contact.email = 'a@b.co';
  t.contact.show.push('email');
  const { files } = renderSite(t, { year: 2026 });
  const page = files['index.html'];
  assert.ok(!page.includes('<script>alert'), 'raw <script> leaked');
  assert.ok(!/<img[^>]+onerror/i.test(page), 'raw onerror leaked');
  assert.equal((page.match(/<script/g) || []).length, 1, 'only the JSON-LD script may exist');
  assert.ok(page.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
});

test('JSON-LD cannot be broken out of with </script>', () => {
  const t = sample();
  t.brand.name = 'x</script><script>alert(1)</script>';
  const page = renderSite(t, { year: 2026 }).files['index.html'];
  assert.equal((page.match(/<\/script>/g) || []).length, 1);
});

test('URLs that are not https are never rendered as links', () => {
  const t = sample();
  t.contact.mapUrl = 'javascript:alert(1)';
  t.contact.social = { instagram: 'http://insecure.example', facebook: 'https://facebook.com/x' };
  t.contact.show = ['whatsapp', 'map', 'social'];
  const page = renderSite(t, { year: 2026 }).files['index.html'];
  assert.ok(!page.includes('javascript:'));
  assert.ok(!page.includes('http://insecure'));
  assert.ok(page.includes('https://facebook.com/x'));
});

test('waNumber / prettyPhone handle Pakistani formats', () => {
  assert.equal(waNumber('0300-1234567'), '923001234567');
  assert.equal(waNumber('+92 300 1234567'), '923001234567');
  assert.equal(waNumber('3001234567'), '923001234567');
  assert.equal(waNumber('0092 300 1234567'), '923001234567');
  assert.equal(waNumber('abc'), null);
  assert.equal(waNumber('123'), null);
  assert.equal(prettyPhone('03001234567'), '+92 300 1234567');
});

test('slugify', () => {
  assert.equal(slugify("Al-Noor  Bakery & Sons!"), 'al-noor-bakery-sons');
});

test('every theme x colour combination meets WCAG AA contrast', () => {
  const bad = [];
  for (const theme of THEME_IDS) {
    for (const color of COLOR_IDS) {
      const d = resolveDesign({ theme, color });
      const checks = {
        'text/bg': contrast(d.text, d.bg), 'text/surface': contrast(d.text, d.surface),
        'muted/bg': contrast(d.muted, d.bg), 'muted/surface': contrast(d.muted, d.surface),
        'btnText/btnBg': contrast(d.btnText, d.btnBg), 'link/bg': contrast(d.link, d.bg), 'link/surface': contrast(d.link, d.surface)
      };
      for (const [name, v] of Object.entries(checks)) if (v < 4.5) bad.push(`${theme}/${color} ${name} = ${v.toFixed(2)}`);
      if (contrast(d.btnBg, d.bg) < 3) bad.push(`${theme}/${color} button not visible against page (${contrast(d.btnBg, d.bg).toFixed(2)})`);
    }
  }
  assert.deepEqual(bad, []);
});

test('unknown colour falls back to the niche default; unknown theme to clean', () => {
  assert.equal(resolveDesign({ theme: 'nope', color: 'nope', niche: 'beauty' }).colorId, 'pink');
  assert.equal(resolveDesign({ theme: 'nope' }).themeId, 'clean');
});

test('all UI languages define exactly the same labels', () => {
  const keys = (o) => Object.keys(o).sort().join();
  assert.equal(keys(LABELS.ur), keys(LABELS.en));
  assert.equal(keys(LABELS['roman-ur']), keys(LABELS.en));
});

test('Urdu renders right-to-left; roman-ur stays left-to-right', () => {
  const t = sample();
  t.language = 'ur';
  assert.match(renderSite(t, { year: 2026 }).files['index.html'], /<html lang="ur" dir="rtl">/);
  t.language = 'roman-ur';
  assert.match(renderSite(t, { year: 2026 }).files['index.html'], /<html lang="ur-Latn" dir="ltr">/);
});

test('sections without content are skipped; order follows tenant.sections', () => {
  const t = sample();
  delete t.faq;
  t.sections = ['contact', 'about'];
  const { meta } = renderSite(t, { year: 2026 });
  assert.deepEqual(meta.sections, ['contact', 'about']);
});

test('rendering is deterministic', () => {
  const a = renderSite(sample(), { year: 2026 });
  const b = renderSite(sample(), { year: 2026 });
  assert.deepEqual(a.files, b.files);
});

test('no inline style attributes and the CSP hash matches the inline CSS', () => {
  const { files } = renderSite(sample(), { year: 2026 });
  const page = files['index.html'];
  assert.ok(!/<[a-z][^>]*\sstyle=/i.test(page));
  const css = /<style>([\s\S]*?)<\/style>/.exec(page)[1];
  const hash = createHash('sha256').update(css).digest('base64');
  assert.ok(files['_headers'].includes(`'sha256-${hash}'`));
  assert.ok(!/unsafe-inline|unsafe-eval/.test(files['_headers']));
});

test('WhatsApp link uses the international number', () => {
  const page = renderSite(sample(), { year: 2026 }).files['index.html'];
  assert.ok(page.includes('https://wa.me/923000000000'));
  assert.ok(page.includes('tel:+923000000000'));
});

test('sitemap and canonical only exist once liveUrl is known', () => {
  const t = sample();
  t.liveUrl = '';
  const { files } = renderSite(t, { year: 2026 });
  assert.ok(!('sitemap.xml' in files));
  assert.ok(!files['index.html'].includes('rel="canonical"'));
});
