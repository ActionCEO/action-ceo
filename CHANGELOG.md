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

### Fixed after the reviewer pass
- Home no longer shows the sample video. Search works under the security policy. The admin page gets its own policy so the editor loads.
- Chapter links play in place. The countdown is right across daylight-saving changes. The skip link lands after the nav. About chapters are readable with scripts off.
- Forms: consent is required and checked on the server, the booking form has the consent box, the spam check resets after each send, the 10-minute rate limit is a real 10 minutes, and a missing salt stops the form instead of weakening the IP hash.
- Analytics: an unknown country now gets the banner.
- Pipeline: a just-ended live waits instead of being skipped as a Short, the caption wait runs from when the video ended, a dropped SRT revives a failed job, a slug clash can't overwrite a post, the first run does not draft the back catalogue (`startAfter`), bad App credentials stop the run before any draft is paid for, and Telegram or Cloudflare errors fail the run loudly.
- Only real migrations live in `migrations/`. Phase 2 and the orphan checks moved to `sql/`.
- The publish guard asks GitHub who made the commit. Blank optional CMS fields no longer fail the build. The noindex interviews page is out of the sitemap.
- The Coverage figure is on the DePIN Day page.
