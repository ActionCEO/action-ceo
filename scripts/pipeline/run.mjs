// YouTube to blog. Runs hourly in GitHub Actions and catches up on anything missed.
// Detect (RSS) -> classify (videos.list) -> captions (official API only) -> draft (Claude) -> PR (bot App) -> Telegram.
// Never scrapes transcripts and never downloads video or audio.
import fs from 'node:fs';
import * as yaml from 'js-yaml';
import { setupDone, env, d1, tg, tgFlush, tgFailed, appToken, gh, googleToken, isoToSeconds, slugify, fitWords, parseChapters, srtToText, now, RUN_URL } from './lib.mjs';

const cfg = JSON.parse(fs.readFileSync(new URL('./config.json', import.meta.url), 'utf8'));
// Not set up yet: say so in 1 line and end green.
if (!setupDone('YouTube to blog pipeline', ['ANTHROPIC_API_KEY', 'YOUTUBE_API_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', ...cfg.channels.map((c) => c.refreshTokenSecret), 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'D1_DATABASE_ID', 'BOT_APP_ID', 'BOT_APP_PRIVATE_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
  { model: cfg.model, ...Object.fromEntries(cfg.channels.map((c) => [`channel ID for ${c.name}`, c.id])) })) process.exit(0);
const cats = yaml.load(fs.readFileSync('src/data/categories.yaml', 'utf8')).map((c) => c.slug);
const tags = yaml.load(fs.readFileSync('src/data/tags.yaml', 'utf8')).map((c) => c.slug);
const attempt = (job, step, ok, detail = '') => d1('INSERT INTO site_pipeline_job_attempts (job_id, step, ok, detail, run_url, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)', [job, step, ok ? 1 : 0, String(detail).slice(0, 500), RUN_URL, now()]);
const setJob = (id, f) => d1(`UPDATE site_pipeline_jobs SET ${Object.keys(f).map((k, i) => `${k} = ?${i + 2}`).join(', ')}, updated_at = ?${Object.keys(f).length + 2} WHERE id = ?1`, [id, ...Object.values(f), now()]);

// 1. Detect: RSS costs no API quota.
for (const ch of cfg.channels) {
  const xml = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${ch.id}`).then((r) => r.text()).catch(() => '');
  for (const e of xml.split('<entry>').slice(1)) {
    const id = (e.match(/<yt:videoId>([^<]+)/) || [])[1], title = (e.match(/<title>([^<]*)/) || [])[1], pub = (e.match(/<published>([^<]+)/) || [])[1];
    if (!id) continue;
    if (cfg.startAfter && pub && Date.parse(pub) < Date.parse(cfg.startAfter)) continue; // no back-catalogue drafts
    await d1('INSERT OR IGNORE INTO site_pipeline_detections (video_id, channel_id, title, published_at, detected_at) VALUES (?1, ?2, ?3, ?4, ?5)', [id, ch.id, title, pub, now()]);
    await d1("INSERT OR IGNORE INTO site_pipeline_jobs (video_id, status, created_at, updated_at) VALUES (?1, 'pending', ?2, ?2)", [id, now()]);
  }
}

const jobs = (await d1("SELECT j.id, j.video_id, j.status, j.created_at, d.channel_id, d.title FROM site_pipeline_jobs j JOIN site_pipeline_detections d ON d.video_id = j.video_id WHERE j.status IN ('pending','waiting_live','waiting_captions','failed') ORDER BY j.created_at DESC LIMIT 40")).filter((j) => j.status !== 'failed' || fs.existsSync(`transcripts-inbox/${j.video_id}.srt`)).slice(0, 10);
let token = null;
if (jobs.length) { try { token = await appToken(); } catch (e) { console.error(e); await tg(`Pipeline stopped\n${e.message.slice(0, 200)}`, RUN_URL ? ['Open run', RUN_URL] : undefined); process.exit(1); } }
const api = token ? gh(token) : null, repo = process.env.GITHUB_REPOSITORY;

for (const job of jobs) {
  const ch = cfg.channels.find((c) => c.id === job.channel_id);
  let step = 'classify';
  try {
    // 2. Classify: 1 quota unit.
    const v = (await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,liveStreamingDetails&id=${job.video_id}&key=${env('YOUTUBE_API_KEY')}`).then((r) => r.json())).items?.[0];
    if (!v) throw new Error('video not found');
    if (v.snippet.liveBroadcastContent === 'live' || v.snippet.liveBroadcastContent === 'upcoming') { await setJob(job.id, { status: 'waiting_live', step }); continue; }
    const seconds = isoToSeconds(v.contentDetails.duration), wasLive = !!v.liveStreamingDetails;
    // A live that just ended reports a 0 duration for a while. Wait; never class a live as a Short.
    if (wasLive && (!v.liveStreamingDetails.actualEndTime || seconds === 0)) { await setJob(job.id, { status: 'waiting_live', step }); continue; }
    const kind = wasLive ? 'live' : seconds <= 180 ? 'short' : 'video';
    // The 24-hour caption window runs from when the video was actually available.
    const readyAt = Date.parse(v.liveStreamingDetails?.actualEndTime ?? v.snippet.publishedAt) || Date.parse(job.created_at);
    const stale = Date.now() - Math.max(readyAt, Date.parse(job.created_at)) > 24 * 3600 * 1000;
    const rule = (await d1('SELECT enabled FROM site_pipeline_ingest_rules WHERE channel_id = ?1 AND kind = ?2', [job.channel_id, kind]))[0];
    if (!rule || !rule.enabled) { await setJob(job.id, { status: 'skipped', step, kind }); if (!rule) await tg(`No ingest rule for ${ch.name} / ${kind}\n${v.snippet.title}`); continue; }

    // 3. Transcript: Action's SRT in the repo wins, then manual captions, then auto captions.
    step = 'transcript';
    let text = '', source = '';
    const dropped = `transcripts-inbox/${job.video_id}.srt`;
    if (fs.existsSync(dropped)) { text = srtToText(fs.readFileSync(dropped, 'utf8')); source = 'edited'; }
    else {
      const access = await googleToken(env(ch.refreshTokenSecret)).catch(async (e) => { if (e.code === 'invalid_grant') await tg(`Google sign-in expired: ${ch.name}`, RUN_URL ? ['Re-authorize', RUN_URL] : undefined); throw e; });
      const list = await fetch(`https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${job.video_id}`, { headers: { authorization: `Bearer ${access}` } }).then((r) => r.json());
      const en = (list.items ?? []).filter((c) => c.snippet.language.startsWith('en'));
      const pick = en.find((c) => c.snippet.trackKind !== 'asr') ?? en.find((c) => c.snippet.trackKind === 'asr');
      if (!pick) {
        if (stale) throw new Error('no captions after 24 hours. Drop an SRT file into transcripts-inbox/');
        await setJob(job.id, { status: 'waiting_captions', step, kind });
        if (job.status !== 'waiting_captions') await tg(`Transcript not ready\n${v.snippet.title}\nNext try in 1 hour.`);
        continue;
      }
      const srt = await fetch(`https://www.googleapis.com/youtube/v3/captions/${pick.id}?tfmt=srt`, { headers: { authorization: `Bearer ${access}` } }).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`captions.download ${r.status}`))));
      text = srtToText(srt); source = pick.snippet.trackKind === 'asr' ? 'youtube_auto' : 'youtube_manual';
    }
    await attempt(job.id, step, true, source);

    // 4. Draft with Claude: structured JSON, voice rules from the brief, rejected and retried once on a dash or hashtag.
    step = 'draft';
    const chapters = parseChapters(v.snippet.description);
    const ask = async (extra = '') => {
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: cfg.model, max_tokens: 8000, system: fs.readFileSync(new URL('./voice.md', import.meta.url), 'utf8') + extra,
          messages: [{ role: 'user', content: `Video title: ${v.snippet.title}\nChannel: ${ch.name}\nAllowed categories: ${cats.join(', ')}\nAllowed tags: ${tags.join(', ')}\nChapters: ${JSON.stringify(chapters)}\n\nTranscript:\n${text.slice(0, 120000)}\n\nReturn only the JSON object.` }] }) });
      const j = await r.json();
      if (!r.ok) throw new Error(`Claude ${r.status}: ${j.error?.message}`);
      return JSON.parse(j.content[0].text.replace(/^```json\s*|\s*```$/g, ''));
    };
    const bad = (d) => /[–—]/.test(JSON.stringify(d)) || /(^|\s)#[A-Za-z]\w+/.test(`${d.title} ${d.excerpt} ${d.body.replace(/^#+ .*$/gm, '')}`);
    let draft = await ask();
    if (bad(draft)) draft = await ask('\n\nYour last answer contained an em dash, en dash or hashtag. None are allowed. Rewrite without them.');
    if (bad(draft)) throw new Error('draft still contains a dash or hashtag after 1 retry');
    // metaTitle: 41 characters max (src/content.config.ts). Shorten on a word, never mid word.
    const metaTitle = fitWords(String(draft.metaTitle || draft.title), 41);
    let slug = slugify(draft.slug || draft.title);
    const own = `youtubeVideoId: ${job.video_id}`;
    if (fs.existsSync(`src/content/posts/${slug}.md`) && !fs.readFileSync(`src/content/posts/${slug}.md`, 'utf8').includes(own)) slug = `${slug.slice(0, 58)}-${job.video_id.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const category = cats.includes(draft.category) ? draft.category : cats[0];
    const useTags = (draft.tags ?? []).filter((t) => tags.includes(t)).slice(0, 10);
    if ((draft.metaDescription ?? '').length < 70) throw new Error('draft metaDescription is under 70 characters');
    const fm = { title: draft.title, metaTitle, metaDescription: draft.metaDescription.slice(0, 155), excerpt: draft.excerpt.slice(0, 320), category, tags: useTags, takeaways: (draft.takeaways ?? []).slice(0, 5), youtubeVideoId: job.video_id, video: job.video_id, origin: 'pipeline', draft: true, reviewState: 'needs_review' };
    const files = {
      [`src/content/videos/${job.video_id}.json`]: JSON.stringify({ youtubeId: job.video_id, title: v.snippet.title, channel: ch.name, kind, publishedAt: v.liveStreamingDetails?.actualStartTime ?? v.snippet.publishedAt, durationSeconds: seconds, chapters }, null, 2) + '\n',
      [`src/content/transcripts/${job.video_id}.en.md`]: `---\nvideo: "${job.video_id}"\nlanguage: en\nsource: ${source}\n---\n${text}\n`,
      [`src/content/posts/${slug}.md`]: `---\n${yaml.dump(fm, { lineWidth: -1 })}---\n${draft.body.trim()}\n`,
    };
    await setJob(job.id, { status: 'drafted', step, kind, post_slug: slug });

    // 5. PR on pipeline/<videoId> through the bot App. The workflow refuses to push to main.
    step = 'pr';
    const branch = `pipeline/${job.video_id}`;
    if (branch === 'main') throw new Error('refusing to push to main');
    const base = await api(`/repos/${repo}/git/ref/heads/main`);
    await api(`/repos/${repo}/git/refs`, { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: base.object.sha }) }).catch((e) => { if (!/422/.test(e.message)) throw e; });
    for (const [path, content] of Object.entries(files)) {
      const cur = await api(`/repos/${repo}/contents/${path}?ref=${branch}`).catch(() => null);
      await api(`/repos/${repo}/contents/${path}`, { method: 'PUT', body: JSON.stringify({ message: `pipeline: draft for ${job.video_id}`, content: Buffer.from(content).toString('base64'), branch, sha: cur?.sha }) });
    }
    const note = draft.suggestedNewTags?.length ? `\n\nSuggested new tags (add to src/data/tags.yaml if wanted): ${draft.suggestedNewTags.join(', ')}` : '';
    const pr = await api(`/repos/${repo}/pulls`, { method: 'POST', body: JSON.stringify({ title: `Draft: ${draft.title}`, head: branch, base: 'main', body: `Auto-drafted from https://www.youtube.com/watch?v=${job.video_id} (${source}).\n\nTo publish: set reviewState to approved, turn draft off, set publishedAt, save, move to Ready, press Publish.${note}` }) });
    await setJob(job.id, { status: 'pr_open', step, pr_url: pr.html_url });
    await attempt(job.id, step, true, pr.html_url);
    // 6. Notify.
    await tg(`New draft\n${v.snippet.title}\n${ch.name}\nPost: ${draft.title}`, ['Review', pr.html_url]);
  } catch (e) {
    console.error(job.video_id, step, e);
    await attempt(job.id, step, false, e.message).catch(() => {});
    const giveUp = Date.now() - Date.parse(job.created_at) > 24 * 3600 * 1000 || step === 'draft' || step === 'pr';
    if (giveUp) { await setJob(job.id, { status: 'failed', step, last_error: e.message.slice(0, 300) }).catch(() => {}); await tg(`Job failed\n${job.title}\nStep: ${step}\n${e.message.slice(0, 160)}`, RUN_URL ? ['Open run', RUN_URL] : undefined); }
  }
}
await tgFlush();
if (tgFailed) process.exitCode = 1;
console.log(`Pipeline run done: ${jobs.length} job(s) looked at.`);
