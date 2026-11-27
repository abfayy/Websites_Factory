// tenant.json -> static site files. Pure function: same input => same output (except the copyright year,
// which tests pin). Every customer string goes through html`` (auto-escaped); URLs are https-only.
// Author/watermark: abdullah fayyaz
import { createHash } from 'node:crypto';
import { html, raw, esc, waNumber, prettyPhone } from './util.mjs';
import { resolveDesign } from './themes.mjs';
import { labelsFor } from './i18n.mjs';
import { buildCss } from './styles.mjs';

export const SECTION_ORDER = ['about', 'services', 'gallery', 'testimonials', 'faq', 'contact'];

const SCHEMA_ORG_TYPE = {
  restaurant: 'FoodEstablishment', beauty: 'BeautySalon', retail: 'Store', clinic: 'MedicalBusiness', fitness: 'HealthClub',
  education: 'EducationalOrganization', realestate: 'RealEstateAgent', services: 'HomeAndConstructionBusiness',
  events: 'ProfessionalService', freelancer: 'ProfessionalService', other: 'LocalBusiness'
};

const safeUrl = (u) => (typeof u === 'string' && /^https:\/\/[^\s<>"']+$/i.test(u) ? u : '');

function contactInfo(t) {
  const c = t.contact || {};
  const show = new Set(c.show || []);
  const wa = show.has('whatsapp') ? waNumber(c.whatsapp) : null;
  const tel = show.has('call') ? waNumber(c.phone || c.whatsapp) : null;
  const email = show.has('email') && c.email ? c.email : '';
  const map = show.has('map') ? safeUrl(c.mapUrl) : '';
  const social = show.has('social')
    ? Object.entries(c.social || {}).filter(([, u]) => safeUrl(u)).map(([k, u]) => [k, u])
    : [];
  return { wa, tel, email, map, social };
}

// Decorative inline icons (static constants, never customer data). Colour comes from CSS (currentColor).
const ICON_PATHS = {
  check: 'M20 6 9 17l-5-5',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',
  phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm18 2-10 7L2 6',
  pin: 'M12 22s-7-6.2-7-12a7 7 0 1 1 14 0c0 5.8-7 12-7 12zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-15v5l3 3',
  up: 'M12 19V5m-7 7 7-7 7 7'
};
const icon = (name) => raw(`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${ICON_PATHS[name]}"/></svg>`);

const SOCIAL_NAMES = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', linkedin: 'LinkedIn' };

function hasContent(t, id) {
  switch (id) {
    case 'about': return !!(t.about && ((t.about.paragraphs || []).length || (t.about.highlights || []).length));
    case 'services': return !!(t.services && (t.services.items || []).length);
    case 'gallery': return (t.images || []).length > 0;
    case 'testimonials': return (t.testimonials || []).length > 0;
    case 'faq': return (t.faq || []).length > 0;
    case 'contact': return true;
    default: return false;
  }
}

export function renderSite(t, { year = new Date().getFullYear() } = {}) {
  const L = labelsFor(t.language);
  const urdu = t.language === 'ur';
  const d = resolveDesign({ theme: t.design?.theme, color: t.design?.color, niche: t.brand?.niche });
  const css = buildCss(d, { urdu });
  const cssHash = createHash('sha256').update(css).digest('base64');
  const ci = contactInfo(t);
  const brand = t.brand;
  const ids = (t.sections && t.sections.length ? t.sections : SECTION_ORDER)
    .filter((id) => SECTION_ORDER.includes(id) && hasContent(t, id));
  const live = safeUrl(t.liveUrl);

  // primary call-to-action: WhatsApp > call > jump to contact
  const ctaHref = ci.wa ? `https://wa.me/${ci.wa}` : ci.tel ? `tel:+${ci.tel}` : '#contact';
  const ctaLabel = t.hero?.cta || (ci.wa ? L.whatsapp : ci.tel ? L.call : L.contact);

  const logo = brand.logo
    ? html`<img src="${brand.logo}" alt="${brand.name}">`
    : '';
  const initial = Array.from(String(brand.name).trim())[0] || '•';
  const favicon = 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='${d.btnBg}'/>` +
    `<text x='32' y='45' font-size='36' text-anchor='middle' fill='${d.btnText}' font-family='Arial,sans-serif'>${esc(initial)}</text></svg>`);

  // ---------- sections ----------
  const hero = html`
<section id="top" class="hero hero-${d.hero}">
  <div class="hero-bg" aria-hidden="true"><span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span></div>
  <div class="wrap">
    <div class="hero-copy">
      ${brand.tagline ? html`<p class="eyebrow rise">${brand.tagline}</p>` : ''}
      <h1>${t.hero.headline}</h1>
      ${t.hero.subheadline ? html`<p class="sub rise d2">${t.hero.subheadline}</p>` : ''}
      <ul class="chips rise d3">
        ${brand.city ? html`<li>${icon('pin')}${brand.city}</li>` : ''}
        ${brand.hours ? html`<li>${icon('clock')}${brand.hours}</li>` : ''}
      </ul>
      <div class="actions rise d4">
        <a class="btn" href="${ctaHref}">${ci.wa ? icon('chat') : ''}${ctaLabel}</a>
        ${ci.wa && ci.tel ? html`<a class="btn ghost" href="${'tel:+' + ci.tel}">${L.call}</a>` : ''}
      </div>
    </div>
    ${d.hero === 'split'
      ? (t.hero.image
        ? html`<img class="hero-art rise d2" src="${t.hero.image}" alt="${t.hero.imageAlt || brand.name}">`
        : html`<div class="hero-art rise d2" aria-hidden="true"><span>${brand.name}</span></div>`)
      : ''}
  </div>
</section>`;

  // custom section title -> show the standard label above it as a small eyebrow
  const head = (id, title) => title && title !== L[id]
    ? html`<div class="sec-head"><p class="eyebrow">${L[id]}</p><h2>${title}</h2></div>`
    : html`<div class="sec-head"><h2>${L[id]}</h2></div>`;

  const sectionHtml = {
    about: () => html`
${head('about', t.about.title)}
<div class="about-grid">
  <div class="lead">${(t.about.paragraphs || []).map((p) => html`<p>${p}</p>`)}</div>
  ${(t.about.highlights || []).length ? html`<ul class="features">${t.about.highlights.map((h) => html`<li>${icon('check')}<span>${h}</span></li>`)}</ul>` : ''}
</div>`,
    services: () => html`
${head('services', t.services.title)}
<div class="cards svc-cards">
  ${t.services.items.map((it) => html`
  <article class="card svc">
    <h3>${it.name}</h3>
    ${it.description ? html`<p>${it.description}</p>` : ''}
    ${t.services.showPrices && it.price ? html`<p class="price">${it.price}</p>` : ''}
  </article>`)}
</div>`,
    gallery: () => html`
${head('gallery')}
<div class="gallery">${t.images.map((im) => html`<img src="${im.src}" alt="${im.alt}" loading="lazy">`)}</div>`,
    testimonials: () => html`
${head('testimonials')}
<div class="cards">
  ${t.testimonials.map((q) => html`
  <blockquote class="card"><p>${q.quote}</p><cite>${q.author}</cite></blockquote>`)}
</div>`,
    faq: () => html`
${head('faq')}
<div class="faq-list">${t.faq.map((f) => html`<details><summary>${f.q}</summary><p>${f.a}</p></details>`)}</div>`,
    contact: () => html`
${head('contact')}
<div class="contact-grid">
  ${(ci.wa || ci.tel || ci.email) ? html`
  <div class="card">
    <div class="actions">
      ${ci.wa ? html`<a class="btn" href="${'https://wa.me/' + ci.wa}">${icon('chat')}${L.whatsapp}</a>` : ''}
      ${ci.tel ? html`<a class="btn ghost" href="${'tel:+' + ci.tel}">${icon('phone')}${L.call}</a>` : ''}
    </div>
    <ul class="info">
      ${ci.tel ? html`<li>${icon('phone')}<span><strong>${L.phone}:</strong> <span dir="ltr">${prettyPhone(ci.tel)}</span></span></li>` : ''}
      ${ci.email ? html`<li>${icon('mail')}<a href="${'mailto:' + ci.email}">${ci.email}</a></li>` : ''}
    </ul>
  </div>` : ''}
  ${(brand.address || ci.map || brand.hours) ? html`
  <div class="card">
    <ul class="info">
      ${brand.address ? html`<li>${icon('pin')}<span><strong>${L.address}</strong><br>${brand.address}</span></li>` : ''}
      ${brand.hours ? html`<li>${icon('clock')}<span><strong>${L.hours}</strong><br>${brand.hours}</span></li>` : ''}
    </ul>
    ${ci.map ? html`<p><a class="btn ghost small" href="${ci.map}" rel="noopener noreferrer">${icon('pin')}${L.map}</a></p>` : ''}
  </div>` : ''}
  ${ci.social.length ? html`
  <div class="card"><ul class="social">
    ${ci.social.map(([k, u]) => html`<li><a href="${u}" rel="noopener noreferrer">${SOCIAL_NAMES[k] || k}</a></li>`)}
  </ul></div>` : ''}
</div>`
  };

  const body = ids.map((id, i) => html`
<section id="${id}" class="${(i % 2 === 0 ? 'alt ' : '') + 'sec-' + id}"><div class="wrap reveal">${sectionHtml[id]()}</div></section>`);

  // moving strip of service names under the hero (decorative; real list is in the services section)
  const names = (t.services?.items || []).map((it) => it.name);
  const ticker = names.length >= 3 ? html`
<div class="ticker" aria-hidden="true"><div class="ticker-track">${[...names, ...names].map((n) => html`<span>${n}</span>`)}</div></div>` : '';

  const ctaBand = (ci.wa || ci.tel) ? html`
<section class="cta-band"><div class="wrap reveal">
  <h2>${L.ctaTitle}</h2>
  <p>${L.ctaText}</p>
  <div class="actions">
    ${ci.wa ? html`<a class="btn" href="${'https://wa.me/' + ci.wa}">${icon('chat')}${L.whatsapp}</a>` : ''}
    ${ci.tel ? html`<a class="btn ghost" href="${'tel:+' + ci.tel}">${icon('phone')}${L.call}</a>` : ''}
  </div>
</div></section>` : '';

  const nav = ids.map((id) => html`<a href="${'#' + id}">${L[id]}</a>`);

  // ---------- structured data (JSON-LD) ----------
  const ld = {
    '@context': 'https://schema.org',
    '@type': SCHEMA_ORG_TYPE[brand.niche] || 'LocalBusiness',
    name: brand.name,
    description: t.seo.description
  };
  if (live) ld.url = live;
  if (ci.tel) ld.telephone = '+' + ci.tel;
  else if (ci.wa) ld.telephone = '+' + ci.wa;
  if (ci.email) ld.email = ci.email;
  if (brand.address || brand.city) {
    ld.address = { '@type': 'PostalAddress', ...(brand.address ? { streetAddress: brand.address } : {}), ...(brand.city ? { addressLocality: brand.city } : {}), addressCountry: 'PK' };
  }
  if (ci.social.length) ld.sameAs = ci.social.map(([, u]) => u);
  const ldJson = JSON.stringify(ld).replace(/</g, '\\u003c');

  const page = html`<!doctype html>
<!-- Built with Websites Factory | abdullah fayyaz -->
<html lang="${L.htmlLang}" dir="${L.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t.seo.title}</title>
<meta name="description" content="${t.seo.description}">
<meta name="theme-color" content="${d.bg}">
${live ? html`<link rel="canonical" href="${live}">` : ''}
<meta property="og:type" content="website">
<meta property="og:title" content="${t.seo.title}">
<meta property="og:description" content="${t.seo.description}">
<meta property="og:site_name" content="${brand.name}">
${live ? html`<meta property="og:url" content="${live}">` : ''}
<link rel="icon" href="${favicon}">
<style>${raw(css)}</style>
<script type="application/ld+json">${raw(ldJson)}</script>
</head>
<body class="${ci.wa || ci.tel ? 'has-bar' : ''}">
<a class="skip" href="#main">${L.skip}</a>
<header class="top"><div class="wrap">
  <a class="brand" href="#top">${logo}<span>${brand.name}</span></a>
  <nav class="nav" aria-label="${L.menu}">${nav}</nav>
</div></header>
<main id="main">
${hero}
${ticker}
${body}
${ctaBand}
</main>
<footer><div class="wrap">
  <div class="foot-grid">
    <div><p class="foot-brand">${brand.name}</p>${brand.tagline ? html`<p>${brand.tagline}</p>` : ''}</div>
    <nav class="foot-nav" aria-label="${L.menu}">${nav}</nav>
  </div>
  <div class="copy"><span>&copy; ${year} ${brand.name}${brand.city ? ' · ' + brand.city : ''} · ${L.rights}</span><a href="#top">${icon('up')}${L.top}</a></div>
</div></footer>
${ci.wa ? html`<a class="fab" href="${'https://wa.me/' + ci.wa}" aria-label="${L.whatsapp}">${icon('chat')}</a>` : ''}
${ci.wa || ci.tel ? html`<div class="mobile-bar">
  ${ci.wa ? html`<a class="btn" href="${'https://wa.me/' + ci.wa}">${L.whatsapp}</a>` : ''}
  ${ci.tel ? html`<a class="btn ghost" href="${'tel:+' + ci.tel}">${L.call}</a>` : ''}
</div>` : ''}
</body>
</html>
`.toString();

  // Strict headers: no scripts at all, only our own images, inline CSS pinned by hash.
  const headers = `/*
  Content-Security-Policy: default-src 'none'; img-src 'self' data:; style-src 'sha256-${cssHash}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
/assets/*
  Cache-Control: public, max-age=31536000, immutable
`;

  const files = {
    'index.html': page,
    '_headers': headers,
    'robots.txt': `User-agent: *\nAllow: /\n${live ? `Sitemap: ${live.replace(/\/?$/, '/')}sitemap.xml\n` : ''}`
  };
  if (live) {
    files['sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${esc(live.replace(/\/?$/, '/'))}</loc></url></urlset>\n`;
  }
  return { files, meta: { cssHash, sections: ids, design: d } };
}
