// Forwarding rules: src/data/redirects.json (edited in the CMS under "Forwarding") becomes dist/_redirects,
// the file Cloudflare Pages reads. Runs after the build so every rule can be checked against the real pages.
// A bad rule stops the build with a plain message, so a typo in the CMS never ships a broken link.
// Pages follows a redirect even when a real page has that address, so a rule must never match a live page.
import fs from 'node:fs';
import path from 'node:path';
const DIST = 'dist';
const fail = (lines) => { console.error('Forwarding rules have problems:\n- ' + lines.join('\n- ')); process.exit(1); };
let rules;
try { rules = JSON.parse(fs.readFileSync('src/data/redirects.json', 'utf8')).redirects ?? []; } catch (e) { fail([`src/data/redirects.json could not be read as JSON (${e.message})`]); }
if (!Array.isArray(rules)) fail(['src/data/redirects.json: "redirects" must be a list']);

// Every page address on the built site, lowercase, without .html or a trailing slash.
const pages = new Set(['/']);
(function walk(dir) { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) walk(p); else if (f.name.endsWith('.html')) pages.add(('/' + path.relative(DIST, p).replace(/\\/g, '/').replace(/(^|\/)index\.html$/, '').replace(/\.html$/, '')).replace(/(.)\/$/, '$1').toLowerCase()); } })(DIST);
const trim = (s) => String(s ?? '').trim().replace(/(.)\/$/, '$1');
const own = (to) => to.replace(/^https:\/\/(www\.)?action\.ceo(?=\/|$)/i, '') || '/';   // a full link to this site counts as a page on it
const isWild = (from) => from.includes('*') || /\/:[A-Za-z]/.test(from);
// Turn an old address with * or :name into a test: * matches anything, :name matches 1 part between slashes.
const matcher = (from) => { const re = new RegExp('^' + from.toLowerCase().split(/(\*|:[a-z]\w*)/i).map((p) => p === '*' ? '.*' : /^:[a-z]/i.test(p) ? '[^/]+' : p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('') + '$'); return (p) => re.test(p.toLowerCase()); };

const errors = [], seen = new Set(), exact = [], wild = [];
for (const [i, r] of rules.entries()) {
  const from = trim(r?.from), to = own(trim(r?.to)), at = `Forwarding rule ${i + 1} (${from || '?'})`;
  if (!/^\/[^\s]*$/.test(from)) { errors.push(`${at}: "Old address" must start with / and have no spaces`); continue; }
  if (!/^(\/|https:\/\/)[^\s]*$/.test(to)) { errors.push(`${at}: "Send to" must start with / or https:// and have no spaces`); continue; }
  if (/[?#]/.test(from)) { errors.push(`${at}: "Old address" cannot contain ? or #. Cloudflare ignores them`); continue; }
  if (/^\/(api|cms-auth)(\/|$)/i.test(from)) { errors.push(`${at}: addresses under /api and /cms-auth run the forms and the CMS sign-in and cannot be forwarded`); continue; }
  if ((from.match(/\*/g) ?? []).length > 1) { errors.push(`${at}: only 1 * is allowed in an old address`); continue; }
  const names = new Set((from.match(/:[A-Za-z]\w*/g) ?? []).concat(from.includes('*') ? [':splat'] : []));
  const used = to.startsWith('/') ? (to.match(/:[A-Za-z]\w*/g) ?? []) : [];
  const unknown = used.filter((n) => !names.has(n));
  if (unknown.length) { errors.push(`${at}: "Send to" uses ${unknown.join(', ')}, which the old address does not define`); continue; }
  if (seen.has(from.toLowerCase())) { errors.push(`${at}: this old address is listed 2 times`); continue; }
  seen.add(from.toLowerCase());
  const hits = matcher(from), w = isWild(from);
  if (from.toLowerCase() === to.toLowerCase()) errors.push(`${at}: forwards to itself`);
  const hidden = [...pages].filter(hits);
  if (hidden.length) errors.push(`${at}: this would hide ${hidden.length} live page${hidden.length > 1 ? 's' : ''} (${hidden.slice(0, 3).join(', ')}${hidden.length > 3 ? ', ...' : ''}). Delete or rename the page first`);
  if (to.startsWith('/') && !used.length && !pages.has(to.split(/[?#]/)[0].toLowerCase()) && !fs.existsSync(path.join(DIST, to.split(/[?#]/)[0]))) errors.push(`${at}: "Send to" page ${to} does not exist on the site`);
  (w ? wild : exact).push({ from, to, hits, used: used.length > 0, line: `${from} ${to} ${r.type === 'temporary' ? 302 : 301}`, at });
}
// No chains: a rule may not send visitors to an address that another rule forwards again.
for (const r of [...exact, ...wild]) if (r.to.startsWith('/') && !r.used) { const next = [...exact, ...wild].find((o) => o !== r && o.hits(r.to.split(/[?#]/)[0])); if (next) errors.push(`${r.at}: "Send to" ${r.to} is itself forwarded by "${next.from}". Point it at the final page`); }
if (exact.length > 2000 || wild.length > 100) errors.push(`Too many rules: ${exact.length} exact (limit 2,000) and ${wild.length} with * or :name (limit 100)`);
if (errors.length) fail(errors);
// Exact rules first: Cloudflare uses the first rule that matches.
fs.writeFileSync(path.join(DIST, '_redirects'), ['# Built from src/data/redirects.json by scripts/redirects.mjs. Do not edit here.', ...exact.map((r) => r.line), ...wild.map((r) => r.line)].join('\n') + '\n');
console.log(`Wrote ${exact.length + wild.length} forwarding rules to dist/_redirects.`);
