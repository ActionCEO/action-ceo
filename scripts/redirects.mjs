// Forwarding rules: src/data/redirects.json (edited in the CMS under "Forwarding") becomes dist/_redirects,
// the file Cloudflare Pages reads. Runs after the build so every rule can be checked against the real pages.
// A bad rule stops the build with a plain message, so a typo in the CMS never ships a broken link.
import fs from 'node:fs';
import path from 'node:path';
const DIST = 'dist';
const rules = JSON.parse(fs.readFileSync('src/data/redirects.json', 'utf8')).redirects ?? [];
const errors = [];
const exists = (p) => { const c = p.split(/[?#]/)[0].replace(/\/$/, ''); return ['', '.html', '/index.html'].some((s) => { const f = path.join(DIST, c + s); return fs.existsSync(f) && fs.statSync(f).isFile(); }) || c === ''; };
const froms = new Set();
const lines = ['# Built from src/data/redirects.json by scripts/redirects.mjs. Do not edit here.'];
for (const [i, r] of rules.entries()) {
  const at = `Forwarding rule ${i + 1} (${r.from ?? '?'})`;
  const from = String(r.from ?? '').trim().replace(/(.)\/$/, '$1'), to = String(r.to ?? '').trim();
  if (!/^\/[^\s]*$/.test(from)) { errors.push(`${at}: "Old address" must start with / and have no spaces`); continue; }
  if (!/^(\/|https:\/\/)[^\s]*$/.test(to)) { errors.push(`${at}: "Send to" must start with / or https:// and have no spaces`); continue; }
  if (froms.has(from.toLowerCase())) { errors.push(`${at}: this old address is listed 2 times`); continue; }
  froms.add(from.toLowerCase());
  const wild = from.includes('*') || from.includes(':');
  if (from === to) errors.push(`${at}: forwards to itself`);
  if (!wild && exists(from)) errors.push(`${at}: a live page still has this address. Forwarding would hide it. Delete or rename the page first`);
  if (to.startsWith('/') && !to.includes(':splat') && !to.includes(':') && !exists(to)) errors.push(`${at}: "Send to" page ${to} does not exist on the site`);
  lines.push(`${from} ${to} ${r.type === 'temporary' ? 302 : 301}`);
}
// No chains: a rule may not send visitors to an address that is itself forwarded.
for (const r of rules) if (froms.has(String(r.to ?? '').trim().replace(/(.)\/$/, '$1').toLowerCase())) errors.push(`Forwarding rule (${r.from}): "Send to" ${r.to} is itself forwarded. Point it at the final page`);
if (errors.length) { console.error('Forwarding rules have problems:\n- ' + errors.join('\n- ')); process.exit(1); }
fs.writeFileSync(path.join(DIST, '_redirects'), lines.join('\n') + '\n');
console.log(`Wrote ${lines.length - 1} forwarding rules to dist/_redirects.`);
