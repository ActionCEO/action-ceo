# Changelog

## 1.0.0, 2026-11-15
First build from Agent Brief v3 and the approved direction A designs.

- Astro 5.18.2 static site, 17 pages plus dynamic show, episode, guest, speaking and post routes.
- SEO: titles and descriptions per brief 7.1, Open Graph and X tags, 1 JSON-LD graph per page, sitemap, robots.txt with Content-Signal, llms.txt, canonical on https://action.ceo, real 404.
- Share images generated at build (Satori and resvg), 1200x630 palette PNG under 300 KB.
- Contact and booking forms: Pages Function, Turnstile, D1, Telegram alert, salted IP hash only.
- GA4 Consent Mode v2 with a banner for EU, EEA, UK and Switzerland only.
- Sveltia CMS admin in editorial workflow mode (pinned build).
- YouTube to blog pipeline, daily checks, IndexNow, keep-alive and PR check workflows.
- Self-hosted Montserrat and Open Sans, subset to Latin, 14 KB each.

### Departures from the brief
- **Post share images use the YouTube thumbnail**, not a generated image (brief 7.2). Falls back to the generated image.
- **Schema files written here** because the schema zip was not attached.
- **Work page title** for the project page and titles for show, episode, guest and speaking pages are new (the brief lists none).
- **Privacy title** has a descriptor added so it is unique and pairs "Action" with a descriptor.
- Motion uses CSS scroll timelines in place of GSAP to stay inside the 50 KB script budget.
