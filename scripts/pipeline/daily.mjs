// Daily: orphan checks, build count for the month, stuck jobs. Any finding is a Telegram alert.
import fs from 'node:fs';
import { setupDone, d1, tg, tgFlush, env, RUN_URL } from './lib.mjs';
// Not set up yet: say so in 1 line and end green.
if (!setupDone('Daily checks', ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'D1_DATABASE_ID', 'PAGES_PROJECT', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'])) process.exit(0);
const rows = await d1(fs.readFileSync('sql/orphan_checks.sql', 'utf8').replace(/^--.*$/gm, ''));
if (rows.length) await tg(`Orphan check found rows\nCount: ${rows.length}\n${[...new Set(rows.map((r) => r.problem))].join(', ')}`, RUN_URL ? ['Open report', RUN_URL] : undefined);
console.log('orphans', rows);
// Content side: every slug and video id that D1 points to must exist in the repo.
const jobs = await d1("SELECT video_id, post_slug FROM site_pipeline_jobs WHERE status = 'pr_open' AND updated_at < datetime('now','-30 days')");
const missing = jobs.filter((j) => j.post_slug && !fs.existsSync(`src/content/posts/${j.post_slug}.md`));
if (missing.length) await tg(`Orphan check found rows\nCount: ${missing.length}\nPosts that D1 points to but main does not have (PR closed or still open after 30 days).`, RUN_URL ? ['Open report', RUN_URL] : undefined);
// Pages builds this month (free plan: 500).
const since = new Date(); since.setUTCDate(1); since.setUTCHours(0, 0, 0, 0);
let n = 0;
for (let page = 1; page < 30; page++) {
  const j = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env('CLOUDFLARE_ACCOUNT_ID')}/pages/projects/${env('PAGES_PROJECT')}/deployments?page=${page}&per_page=25`, { headers: { authorization: `Bearer ${env('CLOUDFLARE_API_TOKEN')}` } }).then((r) => r.json());
  if (!j.success) { console.error('Pages API error', JSON.stringify(j.errors)); await tg('Daily check could not read the Pages build count.', RUN_URL ? ['Open run', RUN_URL] : undefined); process.exitCode = 1; break; }
  const list = j.result ?? []; const inMonth = list.filter((d) => new Date(d.created_on) >= since);
  n += inMonth.length; if (inMonth.length < list.length || !list.length) break;
}
console.log('builds this month', n);
if (n >= 400) await tg(`400 builds this month\nCount: ${n} of 500`);
await tgFlush();
