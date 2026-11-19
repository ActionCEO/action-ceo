import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import matter from 'gray-matter';

const SITE_URL = process.env.SITE_URL || 'https://action.ceo';
const SHOW_DRAFTS = process.env.SHOW_DRAFTS === '1';
const lastmod = (() => { try { return new Date(execSync('git log -1 --format=%cI').toString().trim()); } catch { return new Date(); } })();
// Per-page lastmod: the last commit that touched the page's own source file. Pages with no file of their own, a file that is
// not committed yet, or a clone with no history keep the site-wide date above.
const fileDate = (file) => { try { const out = execSync(`git log -1 --format=%cI -- "${file}"`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); return out ? new Date(out) : null; } catch { return null; } };
const sourceOf = (p) => {
  const m = p.match(/^\/(shows|speaking|episodes|guests)\/([^/]+)$/);
  const tries = p === '/' ? ['src/pages/index.astro'] : [`src/pages${p}.astro`, `src/pages${p}/index.astro`, ...(m ? [`src/content/${m[1]}/${m[2]}.md`] : [])];
  return tries.find((f) => fs.existsSync(f));
};
const pageDates = new Map();
const pageLastmod = (p) => { if (!pageDates.has(p)) { const f = sourceOf(p); pageDates.set(p, (f && fileDate(f)) || null); } return pageDates.get(p); };

// Sitemap facts read straight from the content files (the content collections are not available in this file).
const read = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')) : []).map((f) => ({ slug: f.replace(/\.md$/, ''), data: matter(fs.readFileSync(`${dir}/${f}`, 'utf8')).data }));
const date = (v) => { const d = v ? new Date(v) : null; return d && !Number.isNaN(+d) ? d : null; };
// Same rule as livePosts() in src/lib/content.ts.
const posts = read('./src/content/posts').filter((p) => SHOW_DRAFTS || (!p.data.draft && p.data.reviewState === 'approved' && p.data.publishedAt));
// Each post gets its own lastmod: updatedAt, else publishedAt. Every other page uses its source file's last commit (see above).
// Day-only dates get the same treatment as postInstant() in src/lib/content.ts, so lastmod never reads earlier than the
// page's own datePublished: the video's publish time when it went up that Pacific day, otherwise midnight Pacific.
const pac = (d, o) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', hourCycle: 'h23', ...o }).format(d);
const pacDay = (d) => pac(d, { year: 'numeric', month: '2-digit', day: '2-digit' });
const videoAt = (id) => { try { return date(JSON.parse(fs.readFileSync(`./src/content/videos/${id}.json`, 'utf8')).publishedAt); } catch { return null; } };
const instant = (d, v) => {
  if (!d || d.getUTCHours() || d.getUTCMinutes() || d.getUTCSeconds()) return d;
  const guess = new Date(+d + 8 * 3600e3), midnight = new Date(+guess - (+pac(guess, { hour: 'numeric' }) % 24) * 3600e3);
  return v && pacDay(v) === pacDay(midnight) ? v : midnight;
};
const postLastmod = new Map(posts.map((p) => { const pub = instant(date(p.data.publishedAt), videoAt(String(p.data.video))), up = instant(date(p.data.updatedAt)); return [`/blog/${p.slug}`, up && pub && +up > +pub ? up : pub]; }));
// Episode pages whose video already has a post point their canonical at the post, so they stay out of the sitemap.
const postVideos = new Set(posts.map((p) => String(p.data.video)));
const dupEpisodes = new Set(read('./src/content/episodes').filter((e) => e.data.video && postVideos.has(String(e.data.video))).map((e) => `/episodes/${e.slug}`));
// A show page stays out of search (and out of the sitemap) only while its name is still a TODO. Same rule as src/pages/shows/[slug].astro.
const todoShows = new Set(read('./src/content/shows').filter((s) => String(s.data.name || '').startsWith('TODO')).map((s) => `/shows/${s.slug}`));
const pathOf = (u) => new URL(u).pathname.replace(/\/$/, '') || '/';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'auto' },
  integrations: [sitemap({
    filter: (page) => !/\/(404|admin)/.test(page) && !dupEpisodes.has(pathOf(page)) && !todoShows.has(pathOf(page)),
    serialize: (item) => ({ ...item, lastmod: (postLastmod.get(pathOf(item.url)) ?? pageLastmod(pathOf(item.url)) ?? lastmod).toISOString() }),
  })],
});
