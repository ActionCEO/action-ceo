// PR check: any post with draft: false must have its last change made by a person, never by a bot account.
// This is a second lock. The first lock is the ruleset on main: the bot App cannot merge and a Code Owner must approve.
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';
const git = (...a) => execFileSync('git', a).toString();
const base = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'origin/main';
const changed = git('diff', '--name-only', `${base}...HEAD`, '--', 'src/content/posts').split('\n').filter(Boolean);
const repo = process.env.GITHUB_REPOSITORY, token = process.env.GH_TOKEN;
const bad = [];
for (const f of changed) {
  let d; try { d = matter.read(f).data; } catch { continue; }
  if (d.draft !== false) continue;
  const [sha, name] = git('log', '-1', '--format=%H%x09%an', '--', f).trim().split('\t');
  let bot = /\[bot\]/i.test(name), who = name;
  if (repo && token) {
    // Ask GitHub who really made the commit: the git author name alone can be set by the committer.
    const r = await fetch(`https://api.github.com/repos/${repo}/commits/${sha}`, { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' } });
    if (!r.ok) { bad.push(`${f}: could not check who made commit ${sha.slice(0, 7)} (GitHub ${r.status})`); continue; }
    const c = await r.json();
    for (const u of [c.author, c.committer]) if (u && (u.type === 'Bot' || /\[bot\]$/i.test(u.login ?? ''))) { bot = true; who = u.login; }
    if (!c.author) { bot = true; who = `${name} (no GitHub account on the commit)`; }
  }
  if (bot) bad.push(`${f}: draft is false and the last change is by ${who}`);
}
if (bad.length) { console.error('Publish guard failed. A person must make the final change that sets a post live.\n- ' + bad.join('\n- ')); process.exit(1); }
console.log(`Publish guard passed (${changed.length} post file(s) checked).`);
