// Theme + colour tokens. Colours are resolved so that text/buttons/links ALWAYS meet WCAG AA (4.5:1);
// tests/engine.test.mjs checks every theme x colour combination.
import { contrast } from './util.mjs';

export const COLOR_IDS = ['blue', 'green', 'red', 'orange', 'purple', 'teal', 'pink', 'black-gold'];
export const THEME_IDS = ['clean', 'bold', 'warm', 'elegant', 'minimal'];

const COLORS = {
  blue: { primary: '#1d4ed8', accent: '#38bdf8' },
  green: { primary: '#15803d', accent: '#4ade80' },
  red: { primary: '#b91c1c', accent: '#fb923c' },
  orange: { primary: '#c2410c', accent: '#fbbf24' },
  purple: { primary: '#6d28d9', accent: '#f472b6' },
  teal: { primary: '#0f766e', accent: '#38bdf8' },
  pink: { primary: '#be185d', accent: '#fb923c' },
  'black-gold': { primary: '#1f2937', accent: '#b45309' }
};

export const NICHE_DEFAULT_COLOR = {
  restaurant: 'orange', beauty: 'pink', retail: 'purple', clinic: 'teal', fitness: 'red',
  education: 'blue', realestate: 'blue', services: 'green', events: 'purple', freelancer: 'teal', other: 'blue'
};

const THEMES = {
  clean:   { bg: '#ffffff', surface: '#f1f5f9', text: '#0f172a', muted: '#475569', border: '#e2e8f0', radius: '14px', hero: 'split',  serif: false },
  bold:    { bg: '#0b1020', surface: '#151c33', text: '#f8fafc', muted: '#cbd5e1', border: '#2a3454', radius: '10px', hero: 'center', serif: false },
  warm:    { bg: '#fffaf5', surface: '#fff0e1', text: '#2b1a10', muted: '#6b4f3f', border: '#f1d6bf', radius: '22px', hero: 'center', serif: false },
  elegant: { bg: '#fbfaf8', surface: '#efeae1', text: '#1c1917', muted: '#57534e', border: '#ddd5c8', radius: '3px',  hero: 'center', serif: true },
  minimal: { bg: '#ffffff', surface: '#f7f7f7', text: '#111111', muted: '#555555', border: '#e5e5e5', radius: '0px',  hero: 'left',   serif: false }
};

/** Resolve a theme id + colour id (+ niche fallback) into concrete, accessible CSS values. */
export function resolveDesign({ theme = 'clean', color, niche = 'other' } = {}) {
  const t = THEMES[theme] || THEMES.clean;
  const colorId = COLORS[color] ? color : NICHE_DEFAULT_COLOR[niche] || 'blue';
  const { primary, accent } = COLORS[colorId];

  // Button: white text on primary, else on accent, else invert the theme (always readable + visible on the page).
  const white = '#ffffff';
  let btnBg, btnText;
  const okBtn = (c) => contrast(white, c) >= 4.5 && contrast(c, t.bg) >= 3;
  if (okBtn(primary)) { btnBg = primary; btnText = white; }
  else if (okBtn(accent)) { btnBg = accent; btnText = white; }
  else { btnBg = t.text; btnText = t.bg; }

  // Links / headings accent: first colour readable on both the page and the card surface.
  const okLink = (c) => contrast(c, t.bg) >= 4.5 && contrast(c, t.surface) >= 4.5;
  const link = [primary, accent, t.text].find(okLink);

  return { themeId: THEMES[theme] ? theme : 'clean', colorId, ...t, primary, accent, btnBg, btnText, link };
}
