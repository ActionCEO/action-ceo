import { getCollection } from 'astro:content';
import fs from 'node:fs';
import * as yaml from 'js-yaml';
export const SHOW_DRAFTS = process.env.SHOW_DRAFTS === '1';
// Post dates in the files are a day with no time ("2026-11-13"), which parses as midnight UTC. Shown in Pacific time that
// is the evening before, so every post read 1 day early. A day-only date becomes the video's own publish time when the
// video went up that same Pacific day, otherwise midnight Pacific. Dates written with a time are left alone.
const pacific = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', hourCycle: 'h23', ...o }).format(d);
const pacificDay = (d: Date) => pacific(d, { year: 'numeric', month: '2-digit', day: '2-digit' });
export const postInstant = (d: Date | undefined, videoAt?: Date) => {
  if (!d || d.getUTCHours() || d.getUTCMinutes() || d.getUTCSeconds()) return d;
  const guess = new Date(+d + 8 * 3600e3), midnight = new Date(+guess - (+pacific(guess, { hour: 'numeric' }) % 24) * 3600e3);
  return videoAt && pacificDay(videoAt) === pacificDay(midnight) ? videoAt : midnight;
};
export async function livePosts() {
  const all = await getCollection('posts'), vids = new Map((await getCollection('videos')).map((v) => [v.id, v.data.publishedAt as Date]));
  return all.filter((p) => SHOW_DRAFTS || (!p.data.draft && p.data.reviewState === 'approved' && p.data.publishedAt))
    .map((p) => {
      const publishedAt = postInstant(p.data.publishedAt, vids.get(p.data.video.id)), up = postInstant(p.data.updatedAt);
      // An edit on the publish day must not read as older than the post itself.
      return { ...p, data: { ...p.data, publishedAt, updatedAt: up && publishedAt && +up < +publishedAt ? publishedAt : up } };
    })
    .sort((a, b) => +(b.data.publishedAt ?? new Date()) - +(a.data.publishedAt ?? new Date()));
}
const load = (f: string) => yaml.load(fs.readFileSync(`./src/data/${f}`, 'utf8')) as { slug: string; name: string }[];
export const CATEGORIES = load('categories.yaml');
export const TAGS = load('tags.yaml');
export const catName = (s: string) => CATEGORIES.find((c) => c.slug === s)?.name ?? s;
export const tagName = (s: string) => TAGS.find((c) => c.slug === s)?.name ?? s;
export const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' });
export const iso8601Duration = (s: number) => `PT${Math.floor(s / 3600)}H${Math.floor((s % 3600) / 60)}M${s % 60}S`;
// Shorten to n characters without cutting a word in half. Trailing punctuation is dropped.
export const cut = (s: string, n: number) => {
  if (s.length <= n) return s;
  const head = s.slice(0, n + 1), at = head.lastIndexOf(' ');
  return (at > 0 ? head.slice(0, at) : s.slice(0, n)).replace(/[\s,.;:!?'"(-]+$/, '');
};
export const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
