# Open items

Last rebuilt 2026-11-18 from the site review. Work top to bottom. `SETUP.md` has the step-by-step for accounts, secrets and the DNS cutover.

Until the accounts and keys below exist, the forms cannot send, the admin cannot sign in and the pipeline skips itself (green run, 1 warning line that names what is missing).

## Needs Action (accounts and keys)

1. **Cloudflare and GitHub accounts, and the public repo.** Everything below hangs off these. `SETUP.md` sections 1 to 3.
2. **2 D1 databases.** Create production and preview, then put both IDs in `wrangler.toml` (lines 9 and 15, both say TODO). A placeholder ID may fail the Pages deploy.
3. **Turnstile widget.** Put the site key in `src/site.ts` (`turnstileSiteKey`). The current value is Cloudflare's always-pass test key.
4. **4 Function secrets** in Cloudflare Pages, for production and preview: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TURNSTILE_SECRET_KEY`, `IP_HASH_SALT_1`. Without the salt and the database the form answers "The form is not set up yet."
5. **14 GitHub Actions secrets** for the pipeline and daily checks. Full list in `SETUP.md` section 3. The hourly run stays green and skips until all are set.
6. **Telegram group link.** `src/site.ts`, `telegram`. 1 line switches on the footer, Home, the Writing page and every post. Empty means Telegram shows nowhere.
7. **GA4 measurement ID.** `src/site.ts`, `ga4Id`. Empty means analytics is off and no banner shows.
8. **IndexNow key.** Already generated: `2dfe00ab9adf93cea3f2c1cfdddf3ac0`. The key file is at `public/2dfe00ab9adf93cea3f2c1cfdddf3ac0.txt` and the workflow reads it from there. `indexNowKey` in `src/site.ts` is set to the same value. The `INDEXNOW_KEY` secret is optional. If you set it, it must match the file.
9. **GitHub username** for `.github/CODEOWNERS` (line 2), plus any editor usernames.
10. **CMS sign-in.** Repo name and the `sveltia-cms-auth` Worker URL in `public/admin/config.yml` (lines 4 and 6). `/admin` cannot sign in until both are real.
11. **2 GitHub Apps** (the CMS App and the bot App that opens draft PRs). `SETUP.md` section 3.
12. **LFG Action channel ID.** The Action Crypto ID is already set. Both go in 2 files that must match: `scripts/pipeline/config.json` and `migrations/0001_site_core.sql` (line 29). Put them in the migration before it is applied.
13. **Claude model ID to pin** in `scripts/pipeline/config.json` (`model`).

## Needs Action (content)

1. **Latest video on Home.** Home shows the newest real video file in `src/content/videos/`. 2 were added by hand on 2026-11-18. Until the pipeline runs, add a new file by hand when you want Home to change.
2. **LFG page.** 1 line each on go-to-market, PR and partnerships. 2 lines on what Action owns at LFG. Client names only with their OK.
3. **Speaking page.** Sign-off on the 4 topic descriptions, event dates and venues (needed for Event data in search results), clips, photos, the full speaking list.
4. **Shows.** Genzio Roundtable day, time and X Spaces link (`src/content/shows/genzio-roundtable.md`). Podcast name and RSS feed (`src/content/shows/interviews.md`). That page stays out of search until it has a name. 1 line on what Action Items covers.
5. **Photos.** LFG, Karate Combat and Genzio. The Work page shows studio stills for those 3 rows until real photos arrive. Also a sharper hero still from an original recording.
6. **DePIN Day: Seattle page.** Why it started, the replay link, a crowd or sponsor photo.
7. **About page.** 1 line each on GE and on getting into crypto, in Action's words.
8. **Privacy page.** Lawyer review, the last-updated date, and how access, deletion and retention requests are handled.
9. **Old URLs.** Crawl the Duda site and fill `public/_redirects`. The 9 rules there now are guesses.
10. **Categories and tags.** Confirm the lists in `src/data/`. The same options are repeated in `public/admin/config.yml`.

## Decisions

- **Stage photo on the LFG page** (`public/img/stage-keynote.jpg`). It is 1 of the AI-generated stage images Action favorited in Google Flow. Confirm it stays, and pick which other favorites go where.
- **Hero background clip.** The draft clip was pulled from the site. A new one goes at `public/video/hero-stage.mp4` once Action approves it.
- **Writing tab.** It opens an empty page until the first post is published.

1. **Hero clip.** Yes or no on a background video over the Home hero. The draft clip is out of the repo. To switch one on, drop an approved file at `public/video/hero-stage.mp4`.
2. **Click-to-play or counted views.** The brief says click-to-play everywhere. The site now gives visitors outside the EU, UK and Switzerland YouTube's own player without a click, so embedded plays count as views. That costs some page speed. Keep it or go back. Run PageSpeed on a real post after deploy before deciding.
3. **Page titles.** 8 of the 9 titles in the brief's 7.1 table were changed in the SEO pass. Approve them or they go back. They live in `src/site.ts`.
4. **Post, episode and guest titles.** New endings: "| Action, YouTuber", "| Action, Host" and "| Guest of Crypto Host Action". Post SEO titles are now 41 characters max so the full title stays at 60.
5. **Merge the 2 DePIN Day speaking pages into 1?** They share the same headline today.
6. **actionenterprisesolutions.com.** Pick how it redirects (`SETUP.md` section 5, step 8).
7. **Sample content.** `src/content/posts/sample-post.md`, `src/content/videos/SAMPLE00001.json` and `src/content/transcripts/SAMPLE00001.en.md` only preview the post layout. They never reach production. Delete them once a real post exists.
8. **No-JavaScript form result.** A form sent with JavaScript off now lands on `/contact?sent=1` or `/contact?error=1`. The Contact page does not show a message for either yet. Decide if it should.

## Later

- Own share images for speaking and show pages. They reuse the parent page's image today.
- Project pages for the other 5 Work items. Only DePIN Day: Seattle has one. Karate Combat and Action Crypto are the obvious next 2.
- Honest `sizes` on small images so desktops stop fetching the largest file. Fix the declared size of `studio-hero.jpg` (it says 2400x1348, the file is 1600x899).
- Astro upgrade. `npm audit` reports 13 advisories, all build-time, none reachable by a visitor.
- Daily orphan check that covers every slug and video ID, not only pipeline posts. Send the 15,000-file warning to Telegram.
- axe-core and Lighthouse in CI.
- Submit the video sitemap to Search Console only after the first post is live. It is empty until then.
- Compare `src/content.config.ts`, the D1 migration and the tests against `Action-CEO-Schema-v3.zip` when it turns up. They were written for this build.
- Checks that need the live site: Rich Results Test, Schema Markup Validator, PageSpeed, securityheaders.com, share previews on LinkedIn, X and Telegram, a real 404 status, Safari and Firefox.
- Scroll motion runs in Chrome and Edge only. Safari and Firefox show the finished page with no scroll motion.
- HSTS no longer carries `preload`. Add it back only if Action wants the domain on the browser preload list. That is hard to undo.
