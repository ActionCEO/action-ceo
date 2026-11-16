import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { PAGES } from '../site';
import { livePosts } from '../lib/content';
export const GET: APIRoute = async ({ site }) => {
  const u = (p: string) => new URL(p, site).href.replace(/\/$/, p === '/' ? '/' : '');
  const posts = (await livePosts()).filter((p) => !p.data.draft);
  const shows = (await getCollection('shows')).filter((s) => !s.data.name.startsWith('TODO'));
  const body = [
    '# Action',
    '',
    '> Action breaks down AI, DePIN and crypto in plain English on YouTube, hosts Action Items live every Friday, and is a Partner and Chief Communications Officer at Laissez-Faire Group (LFG). Formal name: Victor Gazio.',
    '',
    '## Pages',
    ...Object.entries(PAGES).filter(([k]) => k !== 'notfound').map(([, p]) => `- [${p.title}](${u(p.path)}): ${p.description}`),
    '',
    '## Shows',
    ...shows.map((s) => `- [${s.data.name}](${u('/shows/' + s.id)}): ${s.data.summary} ${s.data.schedule}.`),
    '',
    '## Posts',
    ...(posts.length ? posts.map((p) => `- [${p.data.title}](${u('/blog/' + p.id)}): ${p.data.excerpt}`) : ['- None published yet.']),
    '',
  ].join('\n');
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
