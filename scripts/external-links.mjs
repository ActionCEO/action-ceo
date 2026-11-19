// After the build: every link that leaves the site opens in a new tab with rel="noopener".
// Runs over the built HTML so it also covers links written in Markdown posts.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const OWN = /^https?:\/\/(www\.)?action\.ceo(\/|$)/i;
let files = 0, links = 0;
const walk = (d) => readdirSync(d).forEach((f) => { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.html')) fix(p); });
function fix(p) {
  const html = readFileSync(p, 'utf8');
  const out = html.replace(/<a\b([^>]*?)>/gi, (tag, attrs) => {
    const href = (attrs.match(/\shref="([^"]*)"/i) || [])[1] || '';
    if (!/^https?:\/\//i.test(href) || OWN.test(href)) return tag;
    let a = attrs;
    if (!/\starget=/i.test(a)) a += ' target="_blank"';
    if (/\srel="/i.test(a)) a = a.replace(/\srel="([^"]*)"/i, (m, v) => ` rel="${[...new Set([...v.split(/\s+/).filter(Boolean), 'noopener'])].join(' ')}"`);
    else a += ' rel="noopener"';
    if (a !== attrs) links++;
    return `<a${a}>`;
  });
  if (out !== html) { writeFileSync(p, out); files++; }
}
walk('dist');
console.log(`External links: ${links} set to open in a new tab across ${files} pages.`);
