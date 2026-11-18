// Runs before `astro build`. Astro only logs some content problems; this turns them into a failed build.
// Checks: required front matter, 1 post per video, references that exist, unique episode numbers per show,
// no dashes or hashtags in posts, and the draft/approved/publishedAt rule.
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import * as yaml from 'js-yaml';

const C = 'src/content', errors = [];
const md = (dir) => (fs.existsSync(path.join(C, dir)) ? fs.readdirSync(path.join(C, dir)).filter((f) => f.endsWith('.md')) : []).map((f) => ({ id: f.replace(/\.md$/, ''), file: path.join(C, dir, f), ...matter.read(path.join(C, dir, f)) }));
const videos = (fs.existsSync(`${C}/videos`) ? fs.readdirSync(`${C}/videos`) : []).filter((f) => f.endsWith('.json')).map((f) => ({ id: f.replace(/\.json$/, ''), ...JSON.parse(fs.readFileSync(`${C}/videos/${f}`, 'utf8')) }));
const vid = new Set(videos.map((v) => v.id));
const cats = new Set(yaml.load(fs.readFileSync('src/data/categories.yaml', 'utf8')).map((c) => c.slug));
const tags = new Set(yaml.load(fs.readFileSync('src/data/tags.yaml', 'utf8')).map((c) => c.slug));
for (const v of videos) if (v.id !== v.youtubeId) errors.push(`videos/${v.id}.json: file name must equal youtubeId`);

const posts = md('posts'), seen = new Map();
for (const p of posts) {
  const d = p.data, at = `posts/${p.id}.md`;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id)) errors.push(`${at}: slug must be lowercase words joined by hyphens`);
  if (!vid.has(d.video)) errors.push(`${at}: video "${d.video}" not found in videos/`);
  if (d.video !== d.youtubeVideoId) errors.push(`${at}: video and youtubeVideoId must match`);
  if (seen.has(d.video)) errors.push(`${at}: video ${d.video} already has a post (${seen.get(d.video)})`); else seen.set(d.video, at);
  if (String(d.metaTitle ?? '').length > 41) errors.push(`${at}: metaTitle is ${String(d.metaTitle).length} characters, 41 max (the page adds " | Action, YouTuber")`);
  if (!cats.has(d.category)) errors.push(`${at}: unknown category "${d.category}"`);
  for (const t of d.tags ?? []) if (!tags.has(t)) errors.push(`${at}: unknown tag "${t}"`);
  if (d.draft === false && !(d.reviewState === 'approved' && d.publishedAt)) errors.push(`${at}: draft: false needs reviewState: approved and publishedAt`);
  const text = [d.title, d.metaTitle, d.metaDescription, d.excerpt, ...(d.takeaways ?? []), p.content].join('\n');
  if (/[–—]/.test(text)) errors.push(`${at}: contains an em dash or en dash`);
  if (/(^|\s)#[A-Za-z]\w+/.test(text.replace(/^#+ .*$/gm, ''))) errors.push(`${at}: contains a hashtag`);
  if (d.draft === false && /TODO/.test(text)) errors.push(`${at}: published post still contains TODO`);
}
for (const t of md('transcripts')) if (!vid.has(t.data.video)) errors.push(`transcripts/${t.id}.md: video "${t.data.video}" not found`);
const shows = new Set(md('shows').map((s) => s.id)), guests = new Set(md('guests').map((g) => g.id)), nums = new Set();
for (const e of md('episodes')) {
  if (!shows.has(e.data.show)) errors.push(`episodes/${e.id}.md: show "${e.data.show}" not found`);
  const k = `${e.data.show}#${e.data.number}`; if (nums.has(k)) errors.push(`episodes/${e.id}.md: duplicate episode number ${e.data.number} for ${e.data.show}`); nums.add(k);
  for (const g of e.data.guests ?? []) if (!guests.has(g)) errors.push(`episodes/${e.id}.md: guest "${g}" not found`);
  if (e.data.video && !vid.has(e.data.video)) errors.push(`episodes/${e.id}.md: video "${e.data.video}" not found`);
}
if (process.env.CF_PAGES_BRANCH === 'main' && (process.env.SITE_URL || 'https://action.ceo') !== 'https://action.ceo') errors.push('SITE_URL must be https://action.ceo on production builds');
if (errors.length) { console.error('Content gate failed:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log(`Content gate passed: ${posts.length} posts, ${videos.length} videos.`);
