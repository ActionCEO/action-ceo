// Video sitemap, built with the site. 1 entry per video, on the 1 page where that video is the main thing:
// the post if there is one, otherwise the episode page. Drafts never appear, even in preview builds.
import type { APIRoute } from 'astro';
import { getCollection, getEntry } from 'astro:content';
import { ytEmbed, ytThumb } from '../lib/youtube';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export const GET: APIRoute = async ({ site }) => {
  const base = site!.href.replace(/\/$/, '');
  const posts = (await getCollection('posts'))
    .filter((p) => !p.data.draft && p.data.reviewState === 'approved' && p.data.publishedAt)
    .sort((a, b) => +b.data.publishedAt! - +a.data.publishedAt!);
  const seen = new Set<string>();
  const rows: { loc: string; videoId: string; description: string }[] = [];
  for (const p of posts) {
    if (seen.has(p.data.video.id)) continue;
    seen.add(p.data.video.id);
    rows.push({ loc: `${base}/blog/${p.id}`, videoId: p.data.video.id, description: p.data.metaDescription });
  }
  for (const e of await getCollection('episodes')) {
    if (!e.data.video || seen.has(e.data.video.id)) continue;
    seen.add(e.data.video.id);
    const show = await getEntry(e.data.show);
    rows.push({ loc: `${base}/episodes/${e.id}`, videoId: e.data.video.id, description: `${show.data.name} episode ${e.data.number}: ${e.data.title}. Hosted by Action.` });
  }
  const items: string[] = [];
  for (const r of rows) {
    const v = await getEntry('videos', r.videoId);
    if (!v) continue;
    const d = v.data;
    items.push([
      '  <url>',
      `    <loc>${esc(r.loc)}</loc>`,
      '    <video:video>',
      // hqdefault exists for every YouTube video; it is also listed in the page's VideoObject.
      `      <video:thumbnail_loc>${esc(ytThumb(d.youtubeId, 'hqdefault'))}</video:thumbnail_loc>`,
      `      <video:title>${esc(d.title.slice(0, 100))}</video:title>`,
      `      <video:description>${esc(r.description.slice(0, 2048))}</video:description>`,
      `      <video:player_loc>${esc(ytEmbed(d.youtubeId))}</video:player_loc>`,
      // Google accepts 1 to 28800 seconds; longer streams leave the tag out.
      ...(d.durationSeconds <= 28800 ? [`      <video:duration>${d.durationSeconds}</video:duration>`] : []),
      `      <video:publication_date>${d.publishedAt.toISOString()}</video:publication_date>`,
      '    </video:video>',
      '  </url>',
    ].join('\n'));
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${items.join('\n')}${items.length ? '\n' : ''}</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
