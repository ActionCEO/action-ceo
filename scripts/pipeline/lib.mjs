// Shared helpers for the YouTube to blog pipeline. No dependencies beyond Node 22.
import crypto from 'node:crypto';
export const env = (k, need = true) => { const v = process.env[k]; if (!v && need) throw new Error(`Missing secret ${k}`); return v; };
export const RUN_URL = process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : '';
export const now = () => new Date().toISOString();

// D1 over HTTP, with a token scoped to D1 only.
export async function d1(sql, params = []) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env('CLOUDFLARE_ACCOUNT_ID')}/d1/database/${env('D1_DATABASE_ID')}/query`, {
    method: 'POST', headers: { authorization: `Bearer ${env('CLOUDFLARE_API_TOKEN')}`, 'content-type': 'application/json' }, body: JSON.stringify({ sql, params }) });
  const j = await r.json();
  if (!j.success) throw new Error(`D1: ${JSON.stringify(j.errors)}`);
  return j.result[0].results;
}

// Telegram: Action's chat only. Buttons are links only. No tokens or full email addresses in text.
let sent = 0; const held = [];
export async function tg(text, button) {
  if (++sent > 5) { held.push(text.split('\n')[0]); return; }
  const body = { chat_id: env('TELEGRAM_CHAT_ID'), text, disable_web_page_preview: true };
  if (button) body.reply_markup = { inline_keyboard: [[{ text: button[0], url: button[1] }]] };
  await fetch(`https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
}
export async function tgFlush() { if (held.length) { sent = 0; await tg(`${held.length} more alerts in this run:\n${held.join('\n')}`, RUN_URL ? ['Open run', RUN_URL] : undefined); } }

// GitHub App installation token: the bot App can push branches and open PRs, never merge.
export async function appToken() {
  const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
  const t = Math.floor(Date.now() / 1000);
  const head = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iat: t - 60, exp: t + 540, iss: env('BOT_APP_ID') })}`;
  const jwt = `${head}.${crypto.createSign('RSA-SHA256').update(head).sign(env('BOT_APP_PRIVATE_KEY'), 'base64url')}`;
  const gh = (p, o = {}) => fetch(`https://api.github.com${p}`, { ...o, headers: { authorization: `Bearer ${jwt}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' } }).then((r) => r.json());
  const inst = await gh(`/repos/${env('GITHUB_REPOSITORY')}/installation`);
  return (await gh(`/app/installations/${inst.id}/access_tokens`, { method: 'POST' })).token;
}
export const gh = (token) => async (path, opts = {}) => {
  const r = await fetch(`https://api.github.com${path}`, { ...opts, headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', ...(opts.body ? { 'content-type': 'application/json' } : {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`GitHub ${opts.method ?? 'GET'} ${path}: ${r.status} ${j.message ?? ''}`);
  return j;
};

// Google OAuth: 1 refresh token per channel owner. invalid_grant means Action must re-authorize.
export async function googleToken(refresh) {
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: env('GOOGLE_CLIENT_ID'), client_secret: env('GOOGLE_CLIENT_SECRET'), refresh_token: refresh, grant_type: 'refresh_token' }) });
  const j = await r.json();
  if (j.error) { const e = new Error(`Google OAuth: ${j.error}`); e.code = j.error; throw e; }
  return j.access_token;
}
export const isoToSeconds = (d) => { const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) || []; return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0); };
export const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/, '');
// Chapters from a description: lines that start with a timestamp.
export function parseChapters(desc) {
  const out = [];
  for (const line of desc.split('\n')) { const m = line.trim().match(/^\(?(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\)?\s*[-:]?\s*(.+)$/); if (m) out.push({ start: (+m[1] || 0) * 3600 + +m[2] * 60 + +m[3], title: m[4].trim() }); }
  return out.length >= 2 && out[0].start === 0 ? out : [];
}
// SRT to plain paragraphs.
export function srtToText(srt) {
  const lines = srt.replace(/\r/g, '').split('\n').filter((l) => l.trim() && !/^\d+$/.test(l.trim()) && !/-->/.test(l)).map((l) => l.replace(/<[^>]+>/g, '').trim());
  const out = []; for (const l of lines) if (out[out.length - 1] !== l) out.push(l);
  const words = out.join(' ').split(/\s+/), paras = [];
  for (let i = 0; i < words.length; i += 90) paras.push(words.slice(i, i + 90).join(' '));
  return paras.join('\n\n');
}
