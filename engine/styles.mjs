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
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--font);line-height:${urdu ? '2' : '1.65'};font-size:17px;overflow-x:hidden}
img{max-width:100%;height:auto;display:block}
a{color:var(--link)}
h1,h2,h3{font-family:var(--head);line-height:1.2;margin:0 0 .5em}
h1{font-size:clamp(2.1rem,6.5vw,3.8rem);letter-spacing:-.02em}h2{font-size:clamp(1.6rem,4vw,2.4rem);letter-spacing:-.01em}h3{font-size:1.15rem}
p{margin:0 0 1em}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px;position:relative}
.ico{width:1.1em;height:1.1em;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;vertical-align:-.15em}
.skip{position:absolute;inset-inline-start:-999px;top:0;background:var(--btn);color:var(--btn-text);padding:10px 14px;z-index:30}
.skip:focus{inset-inline-start:8px;top:8px}
:focus-visible{outline:3px solid var(--link);outline-offset:3px}
.top{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 82%,transparent);-webkit-backdrop-filter:saturate(1.6) blur(12px);backdrop-filter:saturate(1.6) blur(12px);border-bottom:1px solid var(--border)}
.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:64px;flex-wrap:wrap}
.brand{font-family:var(--head);font-weight:800;font-size:1.2rem;color:var(--text);text-decoration:none;display:flex;align-items:center;gap:10px}
.brand img{height:40px;width:auto}
.nav{display:flex;gap:4px 20px;flex-wrap:wrap;font-size:.95rem}
.nav a,.foot-nav a{color:var(--muted);text-decoration:none;padding:6px 0;position:relative}
.nav a::after{content:"";position:absolute;inset-inline:0;bottom:0;height:2px;background:var(--link);transform:scaleX(0);transition:transform .25s ease}
.nav a:hover,.foot-nav a:hover{color:var(--link)}.nav a:hover::after{transform:scaleX(1)}
section{padding:88px 0}
.alt{background:var(--surface)}
.eyebrow{display:inline-block;font-size:.8rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--link);margin:0 0 .8em}
.sec-head{margin:0 0 36px}
.sec-head h2::after{content:"";display:block;width:64px;height:4px;border-radius:4px;margin-top:16px;background:linear-gradient(90deg,var(--btn),var(--accent))}
.hero{position:relative;overflow:hidden;padding:104px 0 96px}
.hero .wrap{display:grid;gap:36px;z-index:1}
.hero-bg{position:absolute;inset:0;pointer-events:none}
.blob{position:absolute;border-radius:50%;filter:blur(60px);opacity:.35}
.b1{width:420px;height:420px;background:var(--btn);top:-140px;inset-inline-start:-120px}
.b2{width:360px;height:360px;background:var(--accent);bottom:-160px;inset-inline-end:-80px}
.b3{width:220px;height:220px;background:var(--link);top:30%;inset-inline-end:22%;opacity:.18}
.hero-center .wrap{text-align:center;justify-items:center}
.hero-left .wrap{text-align:start}
.hero-split .wrap{grid-template-columns:1.15fr .85fr;align-items:center}
.hero .sub{font-size:1.22rem;color:var(--muted);max-width:60ch}
.hero-center .sub{margin-inline:auto}
.chips{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 8px;padding:0;list-style:none}
.hero-center .chips{justify-content:center}
.chips li{display:flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--border);border-radius:999px;padding:7px 15px;font-size:.92rem}
.chips .ico{color:var(--link)}
.actions{display:flex;flex-wrap:wrap;gap:12px;margin:12px 0 0}
.hero-center .actions{justify-content:center}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--btn);color:var(--btn-text);text-decoration:none;font-weight:700;padding:14px 24px;border-radius:var(--radius);border:2px solid var(--btn);box-shadow:0 8px 24px -10px var(--btn);transition:transform .2s ease,box-shadow .2s ease,filter .2s ease}
.btn:hover{transform:translateY(-2px);box-shadow:0 14px 30px -12px var(--btn);filter:brightness(1.07)}
.btn.ghost{background:transparent;color:var(--link);border-color:var(--link);box-shadow:none}
.btn.small{padding:9px 16px;font-size:.92rem}
.hero-art{position:relative;border-radius:calc(var(--radius) * 1.6);aspect-ratio:4/3;width:100%;object-fit:cover;box-shadow:0 30px 60px -30px rgba(0,0,0,.45)}
div.hero-art{background:linear-gradient(135deg,var(--btn),var(--accent),var(--btn));background-size:220% 220%;display:grid;place-items:center;color:var(--btn-text);font-family:var(--head);font-weight:800;font-size:clamp(2rem,5vw,3.4rem);padding:24px;text-align:center;overflow:hidden}
div.hero-art::before,div.hero-art::after{content:"";position:absolute;border-radius:50%;border:2px solid currentColor;opacity:.25}
div.hero-art::before{width:70%;aspect-ratio:1;top:-25%;inset-inline-end:-20%}
div.hero-art::after{width:45%;aspect-ratio:1;bottom:-15%;inset-inline-start:-10%}
div.hero-art span{position:relative}
.ticker{overflow:hidden;background:var(--btn);color:var(--btn-text);padding:14px 0;font-weight:700;letter-spacing:.02em}
.ticker-track{display:flex;width:max-content;gap:0}
.ticker span{padding:0 28px;white-space:nowrap;display:flex;align-items:center;gap:28px}
.ticker span::after{content:"\\2726";opacity:.6}
.lead{max-width:68ch;font-size:1.08rem}
.about-grid{display:grid;gap:32px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));align-items:start}
.features{display:grid;gap:14px;margin:0;padding:0;list-style:none}
.features li{display:flex;align-items:center;gap:14px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:16px 18px;font-weight:600;transition:transform .2s ease,border-color .2s ease}
.features li:hover{transform:translateX(6px);border-color:var(--link)}
[dir=rtl] .features li:hover{transform:translateX(-6px)}
.features .ico{width:34px;height:34px;padding:7px;border-radius:50%;background:var(--btn);color:var(--btn-text);stroke-width:3}
.cards{display:grid;gap:20px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
.card{position:relative;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:26px;transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease}
.card:hover{transform:translateY(-6px);box-shadow:0 22px 44px -24px rgba(0,0,0,.4);border-color:var(--link)}
.svc-cards{counter-reset:svc}
.svc{overflow:hidden;counter-increment:svc}
.svc::before{content:counter(svc,decimal-leading-zero);display:inline-grid;place-items:center;width:46px;height:46px;border-radius:calc(var(--radius) * .8);margin-bottom:16px;background:linear-gradient(135deg,var(--btn),var(--accent));color:var(--btn-text);font-weight:800}
.svc::after{content:"";position:absolute;inset-inline:0;top:0;height:4px;background:linear-gradient(90deg,var(--btn),var(--accent));transform:scaleX(0);transform-origin:left;transition:transform .35s ease}
.svc:hover::after{transform:scaleX(1)}
.svc p{color:var(--muted);margin:0}
.svc .price{display:inline-block;margin-top:14px;font-weight:800;color:var(--link);font-size:1.1rem}
.gallery{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}
.gallery img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--radius);transition:transform .35s ease}
.gallery img:hover{transform:scale(1.03)}
blockquote{margin:0}
blockquote p{font-size:1.06rem}
blockquote::before{content:"\\201C";display:block;font-family:Georgia,serif;font-size:3.4rem;line-height:.8;color:var(--link)}
cite{color:var(--muted);font-style:normal;font-size:.95rem;font-weight:700}
.faq-list{max-width:820px}
details{border:1px solid var(--border);border-radius:var(--radius);padding:0;margin:0 0 12px;background:var(--bg);transition:border-color .2s ease}
details[open]{border-color:var(--link)}
summary{cursor:pointer;font-weight:700;padding:18px 22px;list-style:none;display:flex;justify-content:space-between;gap:16px}
summary::-webkit-details-marker{display:none}
summary::after{content:"+";font-size:1.4rem;line-height:1;color:var(--link);transition:transform .25s ease}
details[open] summary::after{transform:rotate(45deg)}
details p{padding:0 22px 18px;margin:0;color:var(--muted)}
.contact-grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.info{list-style:none;margin:18px 0 0;padding:0;display:grid;gap:14px}
.info li{display:flex;gap:12px;align-items:flex-start;overflow-wrap:anywhere}
.info .ico{color:var(--link);margin-top:.3em}
.contact-grid .card:hover{transform:none}
.social{display:flex;flex-wrap:wrap;gap:8px 16px;margin:0;padding:0;list-style:none}
.cta-band{position:relative;overflow:hidden;text-align:center;background:linear-gradient(135deg,var(--btn),color-mix(in srgb,var(--btn) 55%,var(--accent)));color:var(--btn-text)}
.cta-band::before{content:"";position:absolute;width:520px;height:520px;border-radius:50%;border:60px solid currentColor;opacity:.06;top:-260px;inset-inline-end:-160px}
.cta-band h2{color:inherit}
.cta-band p{font-size:1.15rem;opacity:.9}
.cta-band .actions{justify-content:center}
.cta-band .btn{background:var(--btn-text);color:var(--btn);border-color:var(--btn-text);box-shadow:none}
.cta-band .btn.ghost{background:transparent;color:var(--btn-text);border-color:var(--btn-text)}
footer{padding:48px 0 28px;border-top:1px solid var(--border);color:var(--muted);font-size:.94rem;background:var(--surface)}
.foot-grid{display:flex;flex-wrap:wrap;justify-content:space-between;gap:24px;margin-bottom:28px}
.foot-brand{font-family:var(--head);font-weight:800;font-size:1.25rem;color:var(--text);margin:0 0 .3em}
.foot-nav{display:flex;flex-wrap:wrap;gap:6px 22px}
.copy{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;padding-top:20px;border-top:1px solid var(--border)}
.copy a{color:var(--muted);text-decoration:none;display:inline-flex;align-items:center;gap:6px}
.fab{position:fixed;inset-inline-end:24px;bottom:24px;z-index:25;width:60px;height:60px;border-radius:50%;display:grid;place-items:center;background:#25d366;color:#fff;box-shadow:0 12px 28px -8px rgba(0,0,0,.45);transition:transform .2s ease}
.fab:hover{transform:scale(1.08)}
.fab .ico{width:28px;height:28px}
.fab::before{content:"";position:absolute;inset:0;border-radius:50%;background:#25d366;z-index:-1}
.mobile-bar{display:none}
@keyframes rise{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}
@keyframes float{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(30px,-24px) scale(1.08)}}
@keyframes shift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
@keyframes ticker{to{transform:translateX(-50%)}}
@keyframes ticker-rtl{to{transform:translateX(50%)}}
@keyframes pulse{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.7);opacity:0}}
@media (prefers-reduced-motion:no-preference){
  .rise,.hero-copy>h1{animation:rise .9s cubic-bezier(.2,.7,.2,1) both}
  .hero-copy>h1{animation-delay:.1s}.d2{animation-delay:.2s}.d3{animation-delay:.3s}.d4{animation-delay:.4s}
  .b1{animation:float 14s ease-in-out infinite}.b2{animation:float 18s ease-in-out infinite reverse}.b3{animation:float 11s ease-in-out infinite}
  div.hero-art{animation:rise .9s .2s cubic-bezier(.2,.7,.2,1) both,shift 10s ease-in-out infinite}
  .ticker-track{animation:ticker 32s linear infinite}
  [dir=rtl] .ticker-track{animation-name:ticker-rtl}
  .ticker:hover .ticker-track{animation-play-state:paused}
  .fab::before{animation:pulse 2s ease-out infinite}
}
@supports (animation-timeline:view()){
  @media (prefers-reduced-motion:no-preference){
    .reveal>*,.cards>*,.features>li,.faq-list>details{animation:rise linear both;animation-timeline:view();animation-range:entry 0% entry 60%}
  }
}
@media (max-width:760px){
  section{padding:60px 0}.hero{padding:64px 0 56px}
  .hero-split .wrap{grid-template-columns:1fr}
  .top{position:static}
  .nav{gap:2px 14px;font-size:.9rem}
  .fab{display:none}
  body.has-bar{padding-bottom:76px}
  .mobile-bar{display:flex;gap:10px;position:fixed;inset-inline:0;bottom:0;padding:10px 14px;background:var(--bg);border-top:1px solid var(--border);z-index:15}
  .mobile-bar .btn{flex:1;text-align:center;padding:12px 10px}
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important}}
`.replace(/\n{2,}/g, '\n').trim();
}
