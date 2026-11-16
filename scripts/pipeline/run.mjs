// YouTube to blog. Runs hourly in GitHub Actions and catches up on anything missed.
// Detect (RSS) -> classify (videos.list) -> captions (official API only) -> draft (Claude) -> PR (bot App) -> Telegram.
// Never scrapes transcripts and never downloads video or audio.
import fs from 'node:fs';
import * as yaml from 'js-yaml';
import { env, d1, tg, tgFlush, appToken, gh, googleToken, isoToSeconds, slugify, parseChapters, srtToText, now, RUN_URL } from './lib.mjs';

const cfg = JSON.parse(fs.readFileSync(new URL('./config.json', import.meta.url), 'utf8'));
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
    await d1('INSERT OR IGNORE INTO site_pipeline_detections (video_id, channel_id, title, published_at, detected_at) VALUES (?1, ?2, ?3, ?4, ?5)', [id, ch.id, title, pub, now()]);
    await d1("INSERT OR IGNORE INTO site_pipeline_jobs (video_id, status, created_at, updated_at) VALUES (?1, 'pending', ?2, ?2)", [id, now()]);
  }
}

const jobs = await d1("SELECT j.id, j.video_id, j.status, j.created_at, d.channel_id, d.title FROM site_pipeline_jobs j JOIN site_pipeline_detections d ON d.video_id = j.video_id WHERE j.status IN ('pending','waiting_live','waiting_captions') ORDER BY j.created_at LIMIT 10");
const token = jobs.length ? await appToken() : null, api = token ? gh(token) : null, repo = process.env.GITHUB_REPOSITORY;

for (const job of jobs) {
  const ch = cfg.channels.find((c) => c.id === job.channel_id);
  let step = 'classify';
  try {
    const stale = Date.now() - Date.parse(job.created_at) > 24 * 3600 * 1000;
    // 2. Classify: 1 quota unit.
    const v = (await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,liveStreamingDetails&id=${job.video_id}&key=${env('YOUTUBE_API_KEY')}`).then((r) => r.json())).items?.[0];
    if (!v) throw new Error('video not found');
    if (v.snippet.liveBroadcastContent === 'live' || v.snippet.liveBroadcastContent === 'upcoming') { await setJob(job.id, { status: 'waiting_live', step }); continue; }
    const seconds = isoToSeconds(v.contentDetails.duration), kind = seconds <= 180 ? 'short' : v.liveStreamingDetails ? 'live' : 'video';
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
    const slug = slugify(draft.slug || draft.title), category = cats.includes(draft.category) ? draft.category : cats[0];
    const useTags = (draft.tags ?? []).filter((t) => tags.includes(t)).slice(0, 10);
    const fm = { title: draft.title, metaTitle: draft.metaTitle.slice(0, 50), metaDescription: draft.metaDescription.slice(0, 155), excerpt: draft.excerpt.slice(0, 320), category, tags: useTags, takeaways: (draft.takeaways ?? []).slice(0, 5), youtubeVideoId: job.video_id, video: job.video_id, origin: 'pipeline', draft: true, reviewState: 'needs_review' };
    const files = {
      [`src/content/videos/${job.video_id}.json`]: JSON.stringify({ youtubeId: job.video_id, title: v.snippet.title, channel: ch.name, kind, publishedAt: v.liveStreamingDetails?.actualStartTime ?? v.snippet.publishedAt, durationSeconds: seconds, chapters }, null, 2) + '\n',
      [`src/content/transcripts/${job.video_id}.en.md`]: `---\nvideo: ${job.video_id}\nlanguage: en\nsource: ${source}\n---\n${text}\n`,
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
console.log(`Pipeline run done: ${jobs.length} job(s) looked at.`);
