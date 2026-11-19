// Post-build checks on dist/. Fails the build on any SEO, copy or host-name problem (brief section 7).
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist', errors = [], warn = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(DIST);
const pages = files.filter((f) => f.endsWith('.html') && !f.includes(`${path.sep}admin${path.sep}`) && !f.includes(`${path.sep}pagefind${path.sep}`) && !f.includes(`${path.sep}figures${path.sep}`));
const pick = (html, re) => (html.match(re) || [])[1];
const titles = new Map(), descs = new Map();
const BANNED = /\b(unlock|elevate|seamless|delve|game-changer|journey|landscape|cutting-edge|empower)\w*/i;

for (const f of pages) {
  const html = fs.readFileSync(f, 'utf8'), rel = f.slice(DIST.length);
  const noindex = /<meta name="robots" content="noindex"/.test(html);
  const title = pick(html, /<title>([^<]*)<\/title>/), desc = pick(html, /<meta name="description" content="([^"]*)"/);
  const dec = (s) => (s || '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  // Posts: metaTitle (41 max) plus " | Action, YouTuber". Same limit as src/content.config.ts, the CMS and the pipeline.
  if (title && /^[\\/]blog[\\/]/.test(rel)) { const t = dec(title), end = ' | Action, YouTuber'; if (!t.endsWith(end)) errors.push(`${rel}: post title must end with "${end}"`); else if (t.length - end.length > 41) errors.push(`${rel}: post metaTitle over 41 (${t.length - end.length})`); }
  if (!title) errors.push(`${rel}: missing title`);
  else { if (dec(title).length > 60) errors.push(`${rel}: title over 60 (${dec(title).length})`); if (!noindex) { if (titles.has(title)) errors.push(`${rel}: duplicate title with ${titles.get(title)}`); titles.set(title, rel); } }
  if (!desc) errors.push(`${rel}: missing description`);
  else { const n = dec(desc).length; if (n < 70 || n > 155) errors.push(`${rel}: description length ${n}, needs 70 to 155`); if (!noindex) { if (descs.has(desc)) errors.push(`${rel}: duplicate description with ${descs.get(desc)}`); descs.set(desc, rel); } }
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) errors.push(`${rel}: needs exactly 1 h1`);
  if ((html.match(/application\/ld\+json/g) || []).length !== 1) errors.push(`${rel}: needs exactly 1 ld+json block`);
  try { JSON.parse(pick(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/)); } catch { errors.push(`${rel}: ld+json does not parse`); }
  const canon = pick(html, /<link rel="canonical" href="([^"]*)"/), ogUrl = pick(html, /<meta property="og:url" content="([^"]*)"/), ogImg = pick(html, /<meta property="og:image" content="([^"]*)"/);
  // Until action.ceo points at this site, share images are served from the Pages host (SITE.shareImageBase in src/site.ts).
  // Remove SHARE_HOST here when that setting is emptied at DNS cutover.
  const SHARE_HOST = 'https://action-ceo.pages.dev/og/';
  for (const [k, v] of [['canonical', canon], ['og:url', ogUrl], ['og:image', ogImg]]) {
    if (k === 'og:image' && v && v.startsWith(SHARE_HOST)) continue;
    if (!v) errors.push(`${rel}: missing ${k}`);
    else if (process.env.CF_PAGES_BRANCH === 'main' || process.env.STRICT_HOST === '1') { if (!v.startsWith('https://action.ceo')) errors.push(`${rel}: ${k} is not on https://action.ceo (${v})`); }
    if (v && /pages\.dev|localhost|\/\/www\.|^http:\/\//.test(v)) errors.push(`${rel}: ${k} has a wrong host (${v})`);
  }
  if (ogImg) { const p = path.join(DIST, new URL(ogImg).pathname); if (!fs.existsSync(p)) errors.push(`${rel}: og:image file missing (${ogImg})`); else if (fs.statSync(p).size > 300 * 1024) errors.push(`${rel}: og:image over 300 KB`); else { const b = fs.readFileSync(p); if (b.readUInt32BE(16) !== 1200 || b.readUInt32BE(20) !== 630) errors.push(`${rel}: og:image is not 1200x630`); } }
  for (const t of ['og:title', 'og:description', 'og:site_name', 'og:image:alt']) if (!html.includes(`property="${t}"`)) errors.push(`${rel}: missing ${t}`);
  if (!/name="twitter:card" content="summary_large_image"/.test(html) || !/name="twitter:site" content="@LFGAction"/.test(html)) errors.push(`${rel}: twitter tags wrong`);
  // The transcript block is what was said on air, word for word, so the copy rules below skip it.
  const own = html.replace(/<details data-transcript[\s\S]*?<\/details>/g, '');
  const text = own.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
  if (/[–—]/.test(own)) errors.push(`${rel}: contains an em dash or en dash`);
  if (BANNED.test(text)) errors.push(`${rel}: banned word "${text.match(BANNED)[0]}"`);
  if (/discord/i.test(own)) errors.push(`${rel}: mentions Discord`);
  if (/Action Gazio|Victor .Action. Gazio/i.test(text)) errors.push(`${rel}: name rule broken`);
  if (/<img(?![^>]*\balt=)[^>]*>/.test(html)) errors.push(`${rel}: image without alt`);
  if (/youtube-nocookie\.com/.test(html)) errors.push(`${rel}: embeds must use www.youtube.com, not youtube-nocookie.com`);
  if (/"@type":"VideoObject"/.test(html) && /"contentUrl"/.test(html)) errors.push(`${rel}: VideoObject must not set contentUrl (YouTube gives no video file URL)`);
  if (/TODO|\[[A-Z][A-Z0-9 ,:'.-]{6,}\]/.test(text)) warn.push(rel);
}
// Sitemap: every indexable page once, canonical host only.
const sm = files.filter((f) => /sitemap-\d+\.xml$/.test(f)).map((f) => fs.readFileSync(f, 'utf8')).join('');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (new Set(locs).size !== locs.length) errors.push('sitemap: duplicate URLs');
for (const l of locs) if (/pages\.dev|localhost|\/\/www\.|^http:\/\//.test(l)) errors.push(`sitemap: wrong host ${l}`);
for (const k of ['robots.txt', 'llms.txt', '404.html', '_headers', '_redirects', '_routes.json', 'sitemap-index.xml']) if (!fs.existsSync(path.join(DIST, k))) errors.push(`missing ${k}`);
// Video sitemap: present, declared in robots.txt, tags balanced, every entry complete.
const vsPath = path.join(DIST, 'video-sitemap.xml');
if (!fs.existsSync(vsPath)) errors.push('missing video-sitemap.xml');
else {
  const vs = fs.readFileSync(vsPath, 'utf8'), n = (re) => (vs.match(re) || []).length;
  if (!vs.startsWith('<?xml') || !/<urlset[^>]*xmlns:video=/.test(vs) || !vs.trimEnd().endsWith('</urlset>')) errors.push('video-sitemap.xml: not a video urlset');
  const urls = n(/<url>/g);
  for (const t of ['</url>', '<loc>', '<video:video>', '<video:thumbnail_loc>', '<video:title>', '<video:description>', '<video:player_loc>']) if (n(new RegExp(t, 'g')) !== urls) errors.push(`video-sitemap.xml: ${t} count does not match ${urls} urls`);
  if (/&(?!amp;|lt;|gt;|quot;|apos;)/.test(vs)) errors.push('video-sitemap.xml: unescaped &');
  if (!/video-sitemap\.xml/.test(fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8'))) errors.push('robots.txt does not list video-sitemap.xml');
}
const nRedirects = fs.readFileSync(path.join(DIST, '_redirects'), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).length;
if (nRedirects > 2000) errors.push(`_redirects has ${nRedirects} rules, limit 2000`);
// JS budget: 50 KB of first-party script per page.
const js = files.filter((f) => f.includes(`${path.sep}_astro${path.sep}`) && f.endsWith('.js')).reduce((a, f) => a + fs.statSync(f).size, 0);
if (js > 50 * 1024) errors.push(`first-party JS is ${Math.round(js / 1024)} KB, budget 50 KB`);
console.log(`Checked ${pages.length} pages, ${files.length} files in dist (Pages limit 20,000; alert at 15,000), ${Math.round(js / 1024)} KB JS.`);
if (files.length > 15000) console.log('::warning::dist has more than 15,000 files. Slim image variants before the 20,000 limit.');
if (warn.length) console.log(`Pages that still show a TODO or [PLACEHOLDER] (see TODO.md):\n  ${warn.join('\n  ')}`);
if (errors.length) { console.error('CI checks failed:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log('CI checks passed.');
