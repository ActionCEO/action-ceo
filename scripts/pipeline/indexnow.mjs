// After a push to main: wait for the Pages deployment of this commit, then ping IndexNow with the changed URLs.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { env, setupDone } from './lib.mjs';
// The IndexNow key is public: it is the name and the content of public/<key>.txt, served at https://action.ceo/<key>.txt.
// The INDEXNOW_KEY secret is optional. If it is set it must match that file, or search engines reject the ping.
const HEX = /^[a-f0-9]{32}$/;
const fileKey = fs.readdirSync('public').map((f) => f.replace(/\.txt$/, '')).find((k) => HEX.test(k) && fs.readFileSync(`public/${k}.txt`, 'utf8').trim() === k);
const key = env('INDEXNOW_KEY', false) || fileKey;
if (!key) { console.log('::warning::IndexNow skipped: no public/<key>.txt key file and no INDEXNOW_KEY secret.'); process.exit(0); }
if (!fs.existsSync(`public/${key}.txt`) || fs.readFileSync(`public/${key}.txt`, 'utf8').trim() !== key) { console.error(`INDEXNOW_KEY does not match a key file. public/${key}.txt must exist and contain the key. Delete the secret to use ${fileKey ?? 'the key file'}.`); process.exit(1); }
if (!setupDone('IndexNow ping', ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'PAGES_PROJECT'])) process.exit(0);
// Before the DNS move, action.ceo still serves the old site, which has no key file. Search engines would reject the ping, so skip it.
const live = await fetch(`https://action.ceo/${key}.txt`).then(async (r) => r.ok && (await r.text()).trim() === key).catch(() => false);
if (!live) { console.log(`::warning::IndexNow skipped: https://action.ceo/${key}.txt is not live yet (action.ceo is not on the new site).`); process.exit(0); }
const sha = process.env.GITHUB_SHA;
for (let i = 0; i < 40; i++) {
  const j = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env('CLOUDFLARE_ACCOUNT_ID')}/pages/projects/${env('PAGES_PROJECT')}/deployments?per_page=10`, { headers: { authorization: `Bearer ${env('CLOUDFLARE_API_TOKEN')}` } }).then((r) => r.json());
  const d = (j.result ?? []).find((x) => x.deployment_trigger?.metadata?.commit_hash === sha && x.environment === 'production');
  if (d?.latest_stage?.name === 'deploy' && d.latest_stage.status === 'success') break;
  if (d?.latest_stage?.status === 'failure') { console.error('Deployment failed. No ping.'); process.exit(1); }
  if (i === 39) { console.error('Timed out waiting for the deployment.'); process.exit(1); }
  await new Promise((r) => setTimeout(r, 30000));
}
const changed = execSync('git diff --name-only HEAD~1 HEAD').toString().split('\n');
const urls = new Set(['https://action.ceo/']);
for (const f of changed) {
  let m;
  if ((m = f.match(/^src\/content\/posts\/(.+)\.md$/))) {
    if (!fs.existsSync(f) || /^draft:\s*true/m.test(fs.readFileSync(f, 'utf8'))) continue; urls.add(`https://action.ceo/blog/${m[1]}`); urls.add('https://action.ceo/blog'); }
  else if ((m = f.match(/^src\/content\/(shows|episodes|guests|speaking)\/(.+)\.md$/))) urls.add(`https://action.ceo/${m[1]}/${m[2]}`);
  else if ((m = f.match(/^src\/pages\/(.+?)(\/index)?\.astro$/)) && !m[1].includes('[') && m[1] !== '404') urls.add(`https://action.ceo/${m[1] === 'index' ? '' : m[1]}`);
}
const r = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ host: 'action.ceo', key, keyLocation: `https://action.ceo/${key}.txt`, urlList: [...urls] }) });
console.log('IndexNow', r.status, [...urls]);
if (r.status >= 400) process.exit(1);
