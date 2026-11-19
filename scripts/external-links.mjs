// After the build: every link that leaves the site opens in a new tab with rel="noopener", says so on hover,
// and shows the small leaving-the-site arrow.
// Runs over the built HTML so it also covers links written in Markdown posts.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const OWN = /^https?:\/\/(www\.)?action\.ceo(\/|$)/i;
let files = 0, links = 0;
const walk = (d) => readdirSync(d).forEach((f) => { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.html')) fix(p); });
// Links that already carry their own mark or are a card, a logo or a row are left alone.
const SKIP = /(^|\s)(soc|row|pvrow|vcard|vmore|sp-media|no-ext|ext)(\s|$)/;
const HOST = { 'youtube.com': 'YouTube', 'youtu.be': 'YouTube', 'x.com': 'X', 'linkedin.com': 'LinkedIn', 'instagram.com': 'Instagram', 't.me': 'Telegram' };
function fix(p) {
  const html = readFileSync(p, 'utf8');
  // Attributes are matched quote-aware, so a ">" inside a title cannot cut the tag short.
  const out = html.replace(/<a\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/a>/gi, (all, attrs, inner) => {
    const href = (attrs.match(/\shref="([^"]*)"/i) || [])[1] || '';
    if (!/^https?:\/\//i.test(href) || OWN.test(href)) return all;
    let a = attrs;
    if (!/\starget=/i.test(a)) a += ' target="_blank"';
    if (/\srel="/i.test(a)) a = a.replace(/\srel="([^"]*)"/i, (m, v) => ` rel="${[...new Set([...v.split(/\s+/).filter(Boolean), 'noopener'])].join(' ')}"`);
    else a += ' rel="noopener"';
    // Hover note: where the link goes and that it opens a new tab.
    if (!/\stitle="/i.test(a)) { let h = ''; try { h = new URL(href).hostname.replace(/^www\./, ''); } catch {} if (h) a += ` title="${HOST[h] ?? h}, opens in a new tab"`; }
    else a = a.replace(/\stitle="([^"]*)"/i, (m, v) => /new tab/i.test(v) ? m : ` title="${v}, opens in a new tab"`);
    // The small arrow, unless the link has its own or is a picture.
    const cls = (a.match(/\sclass="([^"]*)"/i) || [])[1] || '';
    if (!SKIP.test(cls) && !/<img|<picture|opens in a new tab/i.test(inner)) a = /\sclass="/i.test(a) ? a.replace(/\sclass="([^"]*)"/i, (m, v) => ` class="${v} ext"`) : a + ' class="ext"';
    if (a !== attrs) links++;
    return `<a${a}>${inner}</a>`;
  });
  if (out !== html) { writeFileSync(p, out); files++; }
}
walk('dist');
console.log(`External links: ${links} set to open in a new tab across ${files} pages.`);
