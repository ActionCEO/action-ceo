// RSS 2.0 feed of published posts, newest first. Linked from every page's <head> as application/rss+xml.
import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import { SITE } from '../site';
import { livePosts, catName } from '../lib/content';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.href ?? SITE.url + '/').replace(/\/$/, '');
  const posts = (await livePosts()).filter((p) => !p.data.draft).slice(0, 50);
  const items = await Promise.all(posts.map(async (p) => {
    const url = `${base}/blog/${p.id}`;
    const video = await getEntry(p.data.video);
    const watch = video ? `https://www.youtube.com/watch?v=${video.data.youtubeId}` : '';
    const desc = `${p.data.excerpt}${watch ? ` Watch: ${watch}` : ''}`;
    return `<item><title>${esc(p.data.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${(p.data.publishedAt ?? new Date()).toUTCString()}</pubDate><category>${esc(catName(p.data.category))}</category><description>${esc(desc)}</description></item>`;
  }));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>Action: AI, DePIN and crypto in plain English</title>
<link>${base}/blog</link>
<atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml"/>
<description>Every Action video, written out: the key points, chapters and full transcript.</description>
<language>en-us</language>
${items.join('\n')}
</channel>
</rss>`;
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
};
