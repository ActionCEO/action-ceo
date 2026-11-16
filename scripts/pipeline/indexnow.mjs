// After a push to main: wait for the Pages deployment of this commit, then ping IndexNow with the changed URLs.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { env } from './lib.mjs';
const key = env('INDEXNOW_KEY', false);
if (!key) { console.log('No INDEXNOW_KEY set. Skipping.'); process.exit(0); }
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
