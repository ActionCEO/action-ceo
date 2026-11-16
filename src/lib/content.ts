import { getCollection } from 'astro:content';
import fs from 'node:fs';
import * as yaml from 'js-yaml';
export const SHOW_DRAFTS = process.env.SHOW_DRAFTS === '1';
export async function livePosts() {
  const all = await getCollection('posts');
  return all.filter((p) => SHOW_DRAFTS || (!p.data.draft && p.data.reviewState === 'approved' && p.data.publishedAt))
    .sort((a, b) => +(b.data.publishedAt ?? new Date()) - +(a.data.publishedAt ?? new Date()));
}
const load = (f: string) => yaml.load(fs.readFileSync(`./src/data/${f}`, 'utf8')) as { slug: string; name: string }[];
export const CATEGORIES = load('categories.yaml');
export const TAGS = load('tags.yaml');
export const catName = (s: string) => CATEGORIES.find((c) => c.slug === s)?.name ?? s;
export const tagName = (s: string) => TAGS.find((c) => c.slug === s)?.name ?? s;
export const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' });
export const iso8601Duration = (s: number) => `PT${Math.floor(s / 3600)}H${Math.floor((s % 3600) / 60)}M${s % 60}S`;
export const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
