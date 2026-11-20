// NOTE: written for this build because Action-CEO-Schema-v3.zip was not supplied. Replace with the zip's file when available.
import { defineCollection, reference, z } from 'astro:content';
import { glob, file } from 'astro/loaders';
import fs from 'node:fs';
import * as yaml from 'js-yaml';

const list = (f: string) => (yaml.load(fs.readFileSync(new URL(`./data/${f}`, import.meta.url), 'utf8')) as { slug: string; name: string }[]);
const CATS = list('categories.yaml').map((c) => c.slug) as [string, ...string[]];
const TAGS = list('tags.yaml').map((c) => c.slug) as [string, ...string[]];
// The CMS can save an empty optional field as ''. Treat that as not set.
const blank = <T extends z.ZodTypeAny>(t: T) => z.preprocess((v) => (v === '' || v === null ? undefined : v), t);
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
    // Which show or set the video belongs to. Show pages list their videos from this.
    series: z.enum(['action-items', 'explainers', 'depin-day', 'deai-podcast', 'interviews', 'hosting']).optional(),
    guest: z.string().optional(),
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
    metaTitle: z.string().max(41), // the page title adds " | Action, YouTuber" (19 characters), 60 in all
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
    publishedAt: blank(z.coerce.date().optional()),
    updatedAt: blank(z.coerce.date().optional()),
  }).strict().refine((p) => p.draft || (p.reviewState === 'approved' && !!p.publishedAt), { message: 'draft: false needs reviewState: approved and publishedAt' }),
});

const shows = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/shows' }),
  schema: z.object({
    name: z.string(), order: z.number().int(), kind: z.enum(['live', 'audio', 'podcast']),
    schedule: z.string(), summary: z.string(), where: z.array(z.object({ label: z.string(), url: blank(z.string().url().optional()) }).strict()),
    rss: blank(z.string().url().optional()), image: blank(z.string().optional()),
    // Recent episodes that live off YouTube (X Spaces), newest first.
    rooms: z.array(z.object({ title: z.string(), month: z.string(), url: z.string().url(), speakers: z.array(z.object({ name: z.string(), org: z.string().optional(), x: z.string().regex(/^[A-Za-z0-9_]{1,15}$/) }).strict()).default([]) }).strict()).default([]),
    series: z.array(z.object({ id: z.string(), heading: z.string(), blurb: blank(z.string().optional()) }).strict()).default([]),
  }).strict(),
});

const guests = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/guests' }),
  schema: z.object({ name: z.string(), role: blank(z.string().optional()), url: blank(z.string().url().optional()) }).strict(),
});

const episodes = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/episodes' }),
  schema: z.object({ show: reference('shows'), number: z.number().int().positive(), title: z.string(), publishedAt: z.coerce.date(), video: reference('videos').optional(), guests: z.array(reference('guests')).default([]) }).strict(),
});

const speaking = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/speaking' }),
  schema: z.object({ event: z.string(), role: z.string(), year: z.string(), location: blank(z.string().optional()), publicInPerson: z.boolean().default(false), startDate: blank(z.coerce.date().optional()), image: blank(z.string().optional()), video: reference('videos').optional(), highlights: z.array(z.object({ title: z.string(), text: z.string() }).strict()).max(4).default([]), closing: blank(z.string().optional()) }).strict(),
});

export const collections = { videos, transcripts, posts, shows, guests, episodes, speaking };
