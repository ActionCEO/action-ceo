// NOTE: written for this build because Action-CEO-Schema-v3.zip was not supplied. Replace with the zip's file when available.
import { defineCollection, reference, z } from 'astro:content';
import { glob, file } from 'astro/loaders';
import fs from 'node:fs';
import * as yaml from 'js-yaml';

const list = (f: string) => (yaml.load(fs.readFileSync(new URL(`./data/${f}`, import.meta.url), 'utf8')) as { slug: string; name: string }[]);
const CATS = list('categories.yaml').map((c) => c.slug) as [string, ...string[]];
const TAGS = list('tags.yaml').map((c) => c.slug) as [string, ...string[]];
const ytId = z.string().regex(/^[A-Za-z0-9_-]{11}$/);

const videos = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/videos', generateId: ({ entry }) => entry.replace(/\.json$/, '') }),
  schema: z.object({
    youtubeId: ytId,
    title: z.string().min(3),
    channel: z.enum(['ActionCrypto', 'LFGAction', 'External']),
    kind: z.enum(['video', 'live']),
    publishedAt: z.coerce.date(),
    durationSeconds: z.number().int().positive(),
    chapters: z.array(z.object({ start: z.number().int().min(0), title: z.string().min(1) }).strict()).default([]),
  }).strict(),
});

const transcripts = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/transcripts' }),
  schema: z.object({ video: reference('videos'), language: z.string().default('en'), source: z.enum(['youtube_manual', 'youtube_auto', 'edited']) }).strict(),
});

const posts = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string().min(3),
    metaTitle: z.string().max(50),
    metaDescription: z.string().min(70).max(155),
    excerpt: z.string().max(320),
    category: z.enum(CATS),
    tags: z.array(z.enum(TAGS)).max(10).default([]),
    takeaways: z.array(z.string()).max(5).default([]),
    youtubeVideoId: ytId,
    video: reference('videos'),
    origin: z.enum(['pipeline', 'human', 'agent']),
    draft: z.boolean(),
    reviewState: z.enum(['needs_review', 'approved']),
    publishedAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
  }).strict().refine((p) => p.draft || (p.reviewState === 'approved' && !!p.publishedAt), { message: 'draft: false needs reviewState: approved and publishedAt' }),
});

const shows = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/shows' }),
  schema: z.object({
    name: z.string(), order: z.number().int(), kind: z.enum(['live', 'audio', 'podcast']),
    schedule: z.string(), summary: z.string(), where: z.array(z.object({ label: z.string(), url: z.string().url().or(z.literal('')) }).strict()),
    rss: z.string().url().optional(), image: z.string().optional(),
  }).strict(),
});

const guests = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/guests' }),
  schema: z.object({ name: z.string(), role: z.string().optional(), url: z.string().url().optional() }).strict(),
});

const episodes = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/episodes' }),
  schema: z.object({ show: reference('shows'), number: z.number().int().positive(), title: z.string(), publishedAt: z.coerce.date(), video: reference('videos').optional(), guests: z.array(reference('guests')).default([]) }).strict(),
});

const speaking = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/speaking' }),
  schema: z.object({ event: z.string(), role: z.string(), year: z.string(), location: z.string().optional(), publicInPerson: z.boolean().default(false), startDate: z.coerce.date().optional(), image: z.string().optional(), video: reference('videos').optional() }).strict(),
});

export const collections = { videos, transcripts, posts, shows, guests, episodes, speaking };
