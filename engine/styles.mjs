// One shared stylesheet. Themes only change the CSS variables + a hero layout class.
// No inline style="" attributes anywhere (CSP forbids them) - everything is classes.
export function buildCss(d, { urdu = false } = {}) {
  const sans = urdu
    ? '"Noto Nastaliq Urdu","Jameel Noori Nastaleeq","Segoe UI",Tahoma,sans-serif'
    : 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
  const serif = 'Georgia,"Times New Roman",serif';
  const head = d.serif && !urdu ? serif : sans;
  return `
:root{--bg:${d.bg};--surface:${d.surface};--text:${d.text};--muted:${d.muted};--border:${d.border};--radius:${d.radius};
--btn:${d.btnBg};--btn-text:${d.btnText};--link:${d.link};--accent:${d.accent};--font:${sans};--head:${head}}
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--font);line-height:${urdu ? '2' : '1.65'};font-size:17px}
img{max-width:100%;height:auto;display:block}
a{color:var(--link)}
h1,h2,h3{font-family:var(--head);line-height:1.2;margin:0 0 .5em}
h1{font-size:clamp(2rem,6vw,3.4rem)}h2{font-size:clamp(1.5rem,4vw,2.1rem)}h3{font-size:1.15rem}
p{margin:0 0 1em}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
.skip{position:absolute;inset-inline-start:-999px;top:0;background:var(--btn);color:var(--btn-text);padding:10px 14px;z-index:20}
.skip:focus{inset-inline-start:8px;top:8px}
:focus-visible{outline:3px solid var(--link);outline-offset:3px}
.top{position:sticky;top:0;z-index:10;background:var(--bg);border-bottom:1px solid var(--border)}
.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:60px;flex-wrap:wrap}
.brand{font-family:var(--head);font-weight:700;font-size:1.15rem;color:var(--text);text-decoration:none;display:flex;align-items:center;gap:10px}
.brand img{height:40px;width:auto}
.nav{display:flex;gap:4px 16px;flex-wrap:wrap;font-size:.95rem}
.nav a{color:var(--muted);text-decoration:none;padding:6px 2px}
.nav a:hover{color:var(--link)}
section{padding:64px 0}
.alt{background:var(--surface)}
.hero{padding:72px 0 56px}
.hero .wrap{display:grid;gap:28px}
.hero-center .wrap{text-align:center;justify-items:center}
.hero-left .wrap{text-align:start}
.hero-split .wrap{grid-template-columns:1.2fr .8fr;align-items:center}
.hero .sub{font-size:1.2rem;color:var(--muted);max-width:60ch}
.hero-center .sub{margin-inline:auto}
.chips{display:flex;flex-wrap:wrap;gap:10px;margin:0;padding:0;list-style:none}
.hero-center .chips{justify-content:center}
.chips li{background:var(--surface);border:1px solid var(--border);border-radius:999px;padding:6px 14px;font-size:.92rem}
.actions{display:flex;flex-wrap:wrap;gap:12px;margin:8px 0 0}
.hero-center .actions{justify-content:center}
.btn{display:inline-block;background:var(--btn);color:var(--btn-text);text-decoration:none;font-weight:700;padding:13px 22px;border-radius:var(--radius);border:2px solid var(--btn)}
.btn.ghost{background:transparent;color:var(--link);border-color:var(--link)}
.btn:hover{filter:brightness(1.08)}
.hero-art{border-radius:var(--radius);aspect-ratio:4/3;background:linear-gradient(135deg,var(--btn),var(--accent));display:grid;place-items:center;color:var(--btn-text);font-family:var(--head);font-size:clamp(2rem,6vw,4rem);padding:20px;text-align:center}
.lead{max-width:70ch}
.cards{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.card{background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:22px}
.alt .card{background:var(--bg)}
.price{font-weight:700;color:var(--link)}
.gallery{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}
.gallery img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--radius)}
blockquote{margin:0}
blockquote p{font-size:1.05rem}
cite{color:var(--muted);font-style:normal;font-size:.95rem}
details{border:1px solid var(--border);border-radius:var(--radius);padding:14px 18px;margin:0 0 12px;background:var(--bg)}
summary{cursor:pointer;font-weight:700}
.contact-grid{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.contact-grid h3{margin-bottom:.3em}
.social{display:flex;flex-wrap:wrap;gap:8px 16px;margin:0;padding:0;list-style:none}
footer{padding:28px 0;border-top:1px solid var(--border);color:var(--muted);font-size:.92rem}
.mobile-bar{display:none}
@media (max-width:760px){
  section{padding:44px 0}.hero{padding:44px 0 36px}
  .hero-split .wrap{grid-template-columns:1fr}
  .top{position:static}
  body.has-bar{padding-bottom:76px}
  .mobile-bar{display:flex;gap:10px;position:fixed;inset-inline:0;bottom:0;padding:10px 14px;background:var(--bg);border-top:1px solid var(--border);z-index:15}
  .mobile-bar .btn{flex:1;text-align:center;padding:12px 10px}
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
`.replace(/\n{2,}/g, '\n').trim();
}
