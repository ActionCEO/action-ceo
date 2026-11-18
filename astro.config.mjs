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
const postLastmod = new Map(posts.map((p) => [`/blog/${p.slug}`, date(p.data.updatedAt) ?? date(p.data.publishedAt)]));
// Episode pages whose video already has a post point their canonical at the post, so they stay out of the sitemap.
const postVideos = new Set(posts.map((p) => String(p.data.video)));
const dupEpisodes = new Set(read('./src/content/episodes').filter((e) => e.data.video && postVideos.has(String(e.data.video))).map((e) => `/episodes/${e.slug}`));
const pathOf = (u) => new URL(u).pathname.replace(/\/$/, '') || '/';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'auto' },
  integrations: [sitemap({
    filter: (page) => !/\/(404|admin|shows\/interviews)/.test(page) && !dupEpisodes.has(pathOf(page)),
    serialize: (item) => ({ ...item, lastmod: (postLastmod.get(pathOf(item.url)) ?? pageLastmod(pathOf(item.url)) ?? lastmod).toISOString() }),
  })],
});
