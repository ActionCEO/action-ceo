// 1200x630 share images, built once per page and post.
// Pages: wordmark, headline, a still. Posts: the video's own YouTube thumbnail, cropped; branded fallback if it can't be fetched.
import type { APIRoute } from 'astro';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PAGES } from '../../site';
import { livePosts } from '../../lib/content';

const read = (p: string) => fs.readFileSync(path.resolve(p));
const uri = (p: string, mime: string) => `data:${mime};base64,${read(p).toString('base64')}`;
const CACHE = path.resolve('.cache/og');
const STILL: Record<string, string> = { about: 'studio-smile', work: 'depin-stage', project: 'depin-stage', speaking: 'depin-panel', shows: 'studio-live', lfg: 'studio-warm', contact: 'studio-smile', blog: 'studio-interview' };

export async function getStaticPaths() {
  const pages = Object.entries(PAGES).map(([key, p]) => ({ params: { slug: key === 'home' ? 'home' : p.path.replace(/^\//, '').replace(/\//g, '-') }, props: { title: p.og, sub: p.ogSub ?? '', still: STILL[key] ?? 'studio-hero' } }));
  const posts = (await livePosts()).map((p) => ({ params: { slug: `blog-${p.id}` }, props: { title: p.data.title, sub: 'Video breakdown', still: 'studio-hero', yt: p.data.youtubeVideoId } }));
  return [...pages, ...posts];
}

const el = (type: string, style: object, children?: unknown, props: object = {}) => ({ type, props: { style, children, ...props } });
async function branded(title: string, sub: string, still: string) {
  const size = title.length > 44 ? 54 : title.length > 28 ? 66 : 80;
  const tree = el('div', { width: 1200, height: 630, display: 'flex', position: 'relative', backgroundColor: '#06111F', color: '#FFFFFF', fontFamily: 'Open Sans' }, [
    el('img', { position: 'absolute', right: 0, top: 0, width: 760, height: 630, objectFit: 'cover' }, undefined, { src: uri(`public/img/${still}.jpg`, 'image/jpeg'), width: 760, height: 630 }),
    el('div', { position: 'absolute', left: 0, top: 0, width: 1200, height: 630, backgroundImage: 'linear-gradient(to right, #06111F 0%, #06111F 36%, rgba(6,17,31,0.6) 62%, rgba(6,17,31,0.15) 100%)' }),
    el('div', { position: 'absolute', left: 0, top: 0, width: 1200, height: 630, padding: '56px 64px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }, [
      el('img', { width: 165, height: 44 }, undefined, { src: uri('public/img/action-wordmark-white.png', 'image/png'), width: 165, height: 44 }),
      el('div', { display: 'flex', flexDirection: 'column', maxWidth: 720 }, [
        el('div', { fontFamily: 'Montserrat', fontWeight: 800, fontSize: size, lineHeight: 1, letterSpacing: '-0.035em' }, title),
        sub ? el('div', { fontSize: 26, color: '#E3E6E9', marginTop: 20 }, sub) : null,
      ]),
      el('div', { display: 'flex', alignItems: 'center', fontFamily: 'Montserrat', fontWeight: 800, fontSize: 24 }, [el('div', { width: 44, height: 4, backgroundColor: '#69BE28', marginRight: 16 }), 'action.ceo']),
    ]),
  ]);
  const svg = await satori(tree as never, { width: 1200, height: 630, fonts: [
    { name: 'Montserrat', data: read('src/og-fonts/Montserrat_800ExtraBold.ttf'), weight: 800, style: 'normal' },
    { name: 'Open Sans', data: read('src/og-fonts/OpenSans_400Regular.ttf'), weight: 400, style: 'normal' },
  ] });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
// Palette PNG keeps photos under the 300 KB limit.
const squeeze = async (buf: Buffer) => { for (const colors of [256, 128, 64, 32]) { const out = await sharp(buf).resize(1200, 630, { fit: 'cover' }).png({ palette: true, colors, effort: 8 }).toBuffer(); if (out.length <= 300 * 1024) return out; } return sharp(buf).resize(1200, 630, { fit: 'cover' }).png({ palette: true, colors: 16 }).toBuffer(); };

export const GET: APIRoute = async ({ props }) => {
  const { title, sub, still, yt } = props as { title: string; sub: string; still: string; yt?: string };
  const key = crypto.createHash('sha1').update(JSON.stringify([title, sub, still, yt ?? '', 'v2'])).digest('hex');
  const hit = path.join(CACHE, key + '.png');
  let png: Buffer;
  if (fs.existsSync(hit)) png = fs.readFileSync(hit);
  else {
    let src: Buffer | null = null;
    if (yt && !yt.startsWith('SAMPLE')) {
      for (const f of ['maxresdefault', 'hqdefault']) {
        try { const r = await fetch(`https://i.ytimg.com/vi/${yt}/${f}.jpg`, { signal: AbortSignal.timeout(8000) }); if (r.ok) { src = Buffer.from(await r.arrayBuffer()); break; } } catch { /* fall back to the branded image */ }
      }
    }
    png = await squeeze(src ?? Buffer.from(await branded(title, sub, still)));
    fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(hit, png);
  }
  return new Response(new Uint8Array(png), { headers: { 'content-type': 'image/png' } });
};
