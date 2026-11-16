# Setup checklist

Agents never create accounts, accept terms, touch DNS or cancel services. The steps marked **Action** are his.

## 1. Accounts (Action)
- Free Cloudflare account on me@action.ceo, 2-factor on.
- Free GitHub account. Create a **public** repo named `action-ceo` and push this code.

## 2. Cloudflare Pages
- Create a Pages project from the repo. Build command `npm run build`, output `dist`.
- Production branch `main`. Preview branches: Custom, include only `preview/*`.
- Variables: `SITE_URL=https://action.ceo` (production), `SHOW_DRAFTS=1` (preview only).
- `wrangler d1 create action-ceo` and `wrangler d1 create action-ceo-preview`. Put both IDs in `wrangler.toml`.
- `wrangler d1 migrations apply action-ceo` (only `0001_site_core.sql` is in `migrations/`; preview database first).
- Secrets, per environment (Settings, Variables and Secrets, type Secret): `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TURNSTILE_SECRET_KEY`, `IP_HASH_SALT_1`.
- Create a Turnstile widget for action.ceo. Put the site key in `src/site.ts`.
- AI Crawl Control: Search, Agents, Training all Allow. Bot Preference Sync off.

## 3. GitHub
- 2 GitHub Apps, both owned by Action, installed on this repo only. Never reuse one for the other.
  - **Bot App**: Contents and Pull requests read/write, Metadata read. No Workflows, Administration or Actions. Used by the pipeline and the agent.
  - **CMS App**: for Sveltia sign-in through `sveltia-cms-auth` on a free Worker. Worker variables `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ALLOWED_DOMAINS=action.ceo`. Put the Worker URL and repo in `public/admin/config.yml`.
- Rulesets on `main`:
  - **A, review**: require a pull request, 1 approval, review from Code Owners, dismiss stale approvals, require the `PR check` workflow, block force pushes and deletion. Leave "require approval of the most recent reviewable push" off. Bypass: Repository admin, "For pull requests only".
  - **B, who may merge**: Restrict updates. Bypass: Repository admin and Write role, both "For pull requests only".
- Settings, Actions: turn **off** "Allow GitHub Actions to create and approve pull requests".
- Never give the pipeline or an agent a personal access token from Action's account.
- Actions secrets: `ANTHROPIC_API_KEY`, `YOUTUBE_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN_ACTIONCRYPTO`, `GOOGLE_REFRESH_TOKEN_LFGACTION`, `CLOUDFLARE_API_TOKEN` (D1 edit and Pages read, this account only), `CLOUDFLARE_ACCOUNT_ID`, `D1_DATABASE_ID`, `BOT_APP_ID`, `BOT_APP_PRIVATE_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `INDEXNOW_KEY`.
- Edit `.github/CODEOWNERS` with real usernames.

## 4. Pipeline
- `scripts/pipeline/config.json`: both channel IDs and the pinned Claude model ID. Use the same channel IDs in `migrations/0001_site_core.sql` before applying it.
- Google OAuth app set to **In production** (Testing tokens die after 7 days). Scope `youtube.force-ssl`. Sign in as the account that owns each channel.
- Telegram: reset the @ActionCEOSiteBot token with `/revoke` in @BotFather, press Start in the bot, then store the token and chat ID as secrets.
- Day 1 test and report: do auto captions download for Action's own videos, how long they take to appear, does the 180-second Shorts rule misclassify anything.

## 5. Cutover (ask Action before every step here)
1. Crawl the Duda site and actionenterprisesolutions.com. Fill `public/_redirects`.
2. Action approves the site on the pages.dev address.
3. Export every DNS record at Namecheap for **both** domains. Copy MX, SPF, DKIM, DMARC and Google verification records exactly. Mail records stay DNS-only. Lower TTLs to 300 a day ahead. Turn off DNSSEC at Namecheap.
4. Move action.ceo nameservers to Cloudflare. Compare records line by line. Attach action.ceo to the Pages project. Add the redirect rule: `www` and `http` to `https://action.ceo/` in 1 hop, plus Always Use HTTPS.
5. Test the site, SSL, redirects, and send and receive on me@ and web@action.ceo. Broken email: roll nameservers back at once.
6. Submit sitemaps to Google Search Console and Bing Webmaster Tools. Turn DNSSEC back on in Cloudflare once stable.
7. After 1 clean week, tell Action it is safe to cancel Duda. Agents never cancel services.
8. actionenterprisesolutions.com: Action picks (a) Namecheap URL Redirect to https://action.ceo/, mail untouched, or (b) move to Cloudflare with page-level redirect rules.

## 6. Launch checks that need the live site
`curl -I` on the pages.dev address shows noindex. `http://`, `http://www`, `https://www` each return 1 301. `curl -I /nope` returns 404. `curl -A GPTBot` and `-A ClaudeBot` return 200. Rich Results Test on a post. LinkedIn Post Inspector, Facebook Sharing Debugger, a draft X post, Telegram @WebpageBot. PageSpeed on Home, Writing and 1 post. securityheaders.com. German VPN: banner shows, no analytics cookies before accepting.
