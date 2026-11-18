# Changelog

## 1.0.1, 2026-11-18
SEO and copy pass, then fixes from the independent site review and copy review.

### SEO and copy pass (commit 56aba77)
- Page titles and descriptions rewritten from the SEO research. Site copy rewritten in Action's voice.
- The YouTube player moved from youtube-nocookie.com to www.youtube.com and loads without a click outside the EU, UK and Switzerland.
- Every Telegram mention is hidden until the group link exists.

### Departures from the brief
- **Not click-to-play everywhere** (brief 7.7). Visitors outside the EU, EEA, UK and Switzerland get YouTube's own player with no autoplay, so embedded plays count as views. Visitors in the EU, EEA, UK and Switzerland, and anyone whose country is unknown, press "Load video" first. Action still has to confirm this trade against page speed.
- **Page titles changed from the brief's 7.1 table.** 8 of 9 are new (only Home matches). Pending Action's sign-off. The old and new titles are listed in `copy-changes.md` in the research notes.

### Fixed today
- Video: a real "Load video" button is back in the video box, with a play icon, keyboard access and a visible focus ring. It goes away when the player loads. With scripts off the poster and the "Watch on YouTube" link remain.
- Video and consent: saying yes to analytics no longer loads the YouTube player. In the EU, EEA, UK, Switzerland and unknown countries the player loads only from the button. A chapter click before that saves the time and moves focus to the button.
- Analytics: blocked browser storage can no longer stop the script. The country lookup runs 1 time per page view and is shared by the player and analytics.
- Work page: no "Photo coming" box. LFG, Karate Combat and Genzio show studio stills with alt text that describes the photo. The image you see first now loads first. New closing line.
- Posts: no "Telegram link coming soon". Small text raised to 16px.
- Titles: posts end with "| Action, YouTuber", episodes with "| Action, Host", guests with "| Guest of Crypto Host Action". Post SEO titles are 41 characters max in the schema, the CMS, the content gate, the CI checks and the pipeline.
- Descriptions: guest pages never fall under 70 characters. Episode and guest descriptions never cut a word in half.
- llms.txt: no formal name, and shows are listed in their set order.
- IndexNow: key and key file added. The workflow reads the key from the file, so the secret is optional.
- Pipeline, daily checks and the IndexNow ping skip with 1 warning line and a green run until secrets and config are in place.
- Shows: a blank "where" link saved from the CMS no longer fails the build.
- Contact form: emails are scrubbed from the name in the Telegram alert, the alert no longer holds up the reply, and a form sent with scripts off goes back to the Contact page instead of showing raw JSON.
- Headers: HSTS no longer asks for browser preload.
- Sitemap: each page's date comes from the last commit to its own file.
- The nav sits outside the main content landmark.
- Sample content has a plain sample title.

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
