// Schema + semantic validation tests.
// Author/watermark: abdullah fayyaz
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateTenant, validateSchema, RESERVED_SLUGS } from '../engine/validate.mjs';

const sample = () => JSON.parse(readFileSync(new URL('../tenants/_example-al-noor-bakery/tenant.json', import.meta.url), 'utf8'));
const errs = (t, dir) => validateTenant(t, dir).errors;

test('the sample tenant is valid', () => {
  const r = validateTenant(sample(), '_example-al-noor-bakery');
  assert.deepEqual(r.errors, []);
});

test('required fields are enforced', () => {
  const t = sample();
  delete t.hero;
  delete t.seo;
  const e = validateSchema(t);
  assert.ok(e.some((m) => m.startsWith('hero')));
  assert.ok(e.some((m) => m.startsWith('seo')));
});

test('unknown fields are rejected (agent cannot smuggle extra data in)', () => {
  const t = sample();
  t.payment = { tid: '123' };
  t.brand.secret = 'x';
  const e = validateSchema(t);
  assert.ok(e.some((m) => m.includes('payment: unknown field')));
  assert.ok(e.some((m) => m.includes('brand.secret: unknown field')));
});

test('slug rules', () => {
  for (const bad of ['A', 'ab', '-abc', 'abc-', 'has space', 'UPPER', 'a'.repeat(31), 'ünï']) {
    const t = sample(); t.slug = bad;
    assert.ok(validateSchema(t).some((m) => m.startsWith('slug')), `slug "${bad}" should be rejected`);
  }
  for (const reserved of RESERVED_SLUGS) {
    if (reserved.length < 3) continue;
    const t = sample(); t.slug = reserved;
    assert.ok(errs(t, reserved).some((m) => /reserved/.test(m)), `${reserved} should be reserved`);
  }
});

test('folder name must match the slug (real tenants) - samples may use _example- prefix', () => {
  const t = sample();
  assert.ok(errs(t, 'someone-else').some((m) => /does not match slug/.test(m)));
  assert.deepEqual(errs(t, 'al-noor-bakery'), []);
  assert.deepEqual(errs(t, '_example-al-noor-bakery'), []);
});

test('orderId format', () => {
  for (const bad of ['', 'WEB-1', 'web-0001', 'WEB-00a1', '0001']) {
    const t = sample(); t.orderId = bad;
    assert.ok(validateSchema(t).some((m) => m.startsWith('orderId')), bad);
  }
});

test('only https URLs are accepted for map and social links', () => {
  const t = sample();
  t.contact.mapUrl = 'http://maps.example';
  t.contact.social = { instagram: 'javascript:alert(1)' };
  const e = validateSchema(t);
  assert.ok(e.some((m) => m.startsWith('contact.mapUrl')));
  assert.ok(e.some((m) => m.startsWith('contact.social.instagram')));
});

test('liveUrl must be a *.pages.dev address (or empty)', () => {
  const t = sample();
  t.liveUrl = 'https://evil.example/';
  assert.ok(validateSchema(t).some((m) => m.startsWith('liveUrl')));
  t.liveUrl = '';
  assert.deepEqual(validateSchema(t), []);
});

test('asset paths must be assets/<file> with an image extension', () => {
  for (const bad of ['../secret.png', 'assets/../x.png', '/etc/passwd', 'assets/a/b.png', 'assets/x.exe', 'http://x/y.png']) {
    const t = sample(); t.hero.image = bad;
    assert.ok(validateSchema(t).some((m) => m.startsWith('hero.image')), bad);
  }
  const t = sample(); t.hero.image = 'assets/hero.webp';
  assert.deepEqual(validateSchema(t), []);
});

test('HTML-like markup in text is rejected', () => {
  const t = sample();
  t.about.paragraphs[0] = 'Visit us <b>today</b> for the best cakes in town, always fresh.';
  assert.ok(errs(t).some((m) => /markup/.test(m)));
});

test('script-style URLs inside text are rejected', () => {
  const t = sample();
  t.hero.subheadline = 'Click javascript:alert(1) now';
  assert.ok(errs(t).some((m) => /script URL/.test(m)));
});

test('testimonials must be marked as supplied by the customer', () => {
  const t = sample();
  t.testimonials[0].source = 'generated';
  assert.ok(validateSchema(t).some((m) => m.includes('testimonials[0].source')));
});

test('contact.show must be backed by real contact data', () => {
  const t = sample();
  t.contact.whatsapp = '';
  assert.ok(errs(t).some((m) => /whatsapp/.test(m)));
  const u = sample(); u.contact.mapUrl = '';
  assert.ok(errs(u).some((m) => /mapUrl/.test(m)));
  const v = sample(); v.contact.show = ['email']; v.contact.email = '';
  assert.ok(errs(v).some((m) => /email/.test(m)));
});

test('length limits protect the layout', () => {
  const t = sample();
  t.hero.headline = 'x'.repeat(91);
  t.seo.description = 'too short';
  t.services.items = [];
  const e = validateSchema(t);
  assert.ok(e.some((m) => m.startsWith('hero.headline')));
  assert.ok(e.some((m) => m.startsWith('seo.description')));
  assert.ok(e.some((m) => m.startsWith('services.items')));
});

test('Urdu text length is counted in characters, not bytes', () => {
  const t = sample();
  t.hero.headline = 'ہماری تازہ بیکری';
  assert.deepEqual(validateSchema(t), []);
});
