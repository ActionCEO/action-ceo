# action.ceo

Action's site. Static Astro on Cloudflare Pages (free plan). Posts are Markdown in this repo, edited in Sveltia CMS. $0 hosting: nothing here needs a paid plan or a card.

## Run it

```
npm ci
npm run dev            # local preview at localhost:4321
npm run build          # content gate, build, search index, SEO checks (the same command the PR check runs)
npm run build:preview  # same, with draft posts visible
```

Cloudflare Pages settings: build command `npm run build`, output `dist`, production branch `main`, preview branches: Custom, include only `preview/*`. Set `SITE_URL=https://action.ceo` in production. Set `SHOW_DRAFTS=1` only on preview.

## Edit, review, publish

1. Go to `/admin` and sign in with GitHub.
2. New or pipeline-drafted posts start as `draft: true`, `reviewState: needs_review`.
3. To publish: at the top of the post editor set **Review state** to approved, turn **Draft** off, set **Published at**, save, move the entry to **Ready**, press **Publish**. Publish merges the PR. Cloudflare builds. IndexNow pings.
4. A post merged with Draft still on simply stays off the site.

A bot can never publish: the PR check fails if a post has `draft: false` and its last change came from a bot account, and the repo rulesets stop the bot App from updating `main`.

## Where things live

| Thing | Place |
| --- | --- |
| Facts and links used across pages (socials, Telegram, GA4 ID, Turnstile key) | `src/site.ts` |
| Page titles, descriptions and share-image headlines | `PAGES` in `src/site.ts` |
| Pages | `src/pages/` |
| Posts, videos, transcripts, shows, episodes, guests, speaking | `src/content/` |
| Categories and tags (fixed lists) | `src/data/*.yaml` |
| Content rules | `src/content.config.ts` and `scripts/content-gate.mjs` |
| SEO and copy checks on the built site | `scripts/ci-checks.mjs` |
| Share images (1200x630) | `src/pages/og/[slug].png.ts` |
| Contact form and country lookup | `functions/api/` |
| Database tables | `migrations/` |
| YouTube to blog pipeline | `scripts/pipeline/` and `.github/workflows/pipeline.yml` |
| Security headers, redirects | `public/_headers`, `public/_redirects` |
| Motion | `src/styles/global.css` (scroll effects) and `src/scripts/site.js` |

## Share images

Site pages get a branded image: wordmark, the page headline, a still. Posts use the video's own YouTube thumbnail, cropped to 1200x630, so the thumbnail tested on YouTube is what shows on X, LinkedIn and Telegram. If the thumbnail can't be fetched at build time, the post falls back to the branded image. All are palette PNGs under 300 KB and are cached in `.cache/og`.

## Change the schema safely

1. Edit `src/content.config.ts`, then mirror the change in `public/admin/config.yml` and `scripts/content-gate.mjs`.
2. For the database: add a new numbered file in `migrations/`. `ALTER TABLE ADD COLUMN` only. Never rebuild a parent table.
3. Run `npm run build` and `node scripts/test-sql.mjs`. Both must pass.
4. Apply with `wrangler d1 migrations apply action-ceo` (preview database first).

`0002_site_crm.sql` is phase 2. Do not apply it.

## Roll back

- A bad deploy: Cloudflare dashboard, Pages, action-ceo, Deployments, pick the last good one, **Rollback**.
- A bad post: in `/admin` turn Draft back on and publish, or revert the PR on GitHub.
- DNS: see `SETUP.md`, cutover section. Broken email means roll nameservers back at once.

## First-time setup

See `SETUP.md` for accounts, secrets, rulesets, the 2 GitHub Apps and the DNS cutover checklist. See `TODO.md` for every open item.
