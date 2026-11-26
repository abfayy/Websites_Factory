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
  <div class="wrap">
    <div>
      <h1>${t.hero.headline}</h1>
      ${t.hero.subheadline ? html`<p class="sub">${t.hero.subheadline}</p>` : ''}
      <ul class="chips">
        ${brand.city ? html`<li>${brand.city}</li>` : ''}
        ${brand.hours ? html`<li>${brand.hours}</li>` : ''}
      </ul>
      <div class="actions">
        <a class="btn" href="${ctaHref}">${ctaLabel}</a>
        ${ci.wa && ci.tel ? html`<a class="btn ghost" href="${'tel:+' + ci.tel}">${L.call}</a>` : ''}
      </div>
    </div>
    ${d.hero === 'split'
      ? (t.hero.image
        ? html`<img class="hero-art" src="${t.hero.image}" alt="${t.hero.imageAlt || brand.name}">`
        : html`<div class="hero-art" aria-hidden="true">${brand.name}</div>`)
      : ''}
  </div>
</section>`;

  const sectionHtml = {
    about: () => html`
<h2>${t.about.title || L.about}</h2>
<div class="lead">${(t.about.paragraphs || []).map((p) => html`<p>${p}</p>`)}</div>
${(t.about.highlights || []).length ? html`<ul class="chips">${t.about.highlights.map((h) => html`<li>${h}</li>`)}</ul>` : ''}`,
    services: () => html`
<h2>${t.services.title || L.services}</h2>
<div class="cards">
  ${t.services.items.map((it) => html`
  <article class="card">
    <h3>${it.name}</h3>
    ${it.description ? html`<p>${it.description}</p>` : ''}
    ${t.services.showPrices && it.price ? html`<p class="price">${it.price}</p>` : ''}
  </article>`)}
</div>`,
    gallery: () => html`
<h2>${L.gallery}</h2>
<div class="gallery">${t.images.map((im) => html`<img src="${im.src}" alt="${im.alt}" loading="lazy">`)}</div>`,
    testimonials: () => html`
<h2>${L.testimonials}</h2>
<div class="cards">
  ${t.testimonials.map((q) => html`
  <blockquote class="card"><p>${q.quote}</p><cite>${q.author}</cite></blockquote>`)}
</div>`,
    faq: () => html`
<h2>${L.faq}</h2>
${t.faq.map((f) => html`<details><summary>${f.q}</summary><p>${f.a}</p></details>`)}`,
    contact: () => html`
<h2>${L.contact}</h2>
<div class="contact-grid">
  ${(ci.wa || ci.tel || ci.email) ? html`
  <div class="card">
    <div class="actions">
      ${ci.wa ? html`<a class="btn" href="${'https://wa.me/' + ci.wa}">${L.whatsapp}</a>` : ''}
      ${ci.tel ? html`<a class="btn ghost" href="${'tel:+' + ci.tel}">${L.call}</a>` : ''}
    </div>
    ${ci.tel ? html`<p><strong>${L.phone}:</strong> <span dir="ltr">${prettyPhone(ci.tel)}</span></p>` : ''}
    ${ci.email ? html`<p><a href="${'mailto:' + ci.email}">${ci.email}</a></p>` : ''}
  </div>` : ''}
  ${(brand.address || ci.map || brand.hours) ? html`
  <div class="card">
    ${brand.address ? html`<h3>${L.address}</h3><p>${brand.address}</p>` : ''}
    ${ci.map ? html`<p><a href="${ci.map}" rel="noopener noreferrer">${L.map}</a></p>` : ''}
    ${brand.hours ? html`<h3>${L.hours}</h3><p>${brand.hours}</p>` : ''}
  </div>` : ''}
  ${ci.social.length ? html`
  <div class="card"><ul class="social">
    ${ci.social.map(([k, u]) => html`<li><a href="${u}" rel="noopener noreferrer">${SOCIAL_NAMES[k] || k}</a></li>`)}
  </ul></div>` : ''}
</div>`
  };

  const body = ids.map((id, i) => html`
<section id="${id}" class="${i % 2 === 0 ? 'alt' : ''}"><div class="wrap">${sectionHtml[id]()}</div></section>`);

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
${body}
</main>
<footer><div class="wrap">&copy; ${year} ${brand.name}${brand.city ? ' · ' + brand.city : ''} · ${L.rights}</div></footer>
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
