// PR check: any post with draft: false must have its last change made by a human, never by the bot App.
// So the agent or the pipeline can never set a post live.
import { execSync } from 'node:child_process';
import matter from 'gray-matter';
const base = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'origin/main';
const changed = execSync(`git diff --name-only ${base}...HEAD -- src/content/posts`).toString().split('\n').filter(Boolean);
const bad = [];
for (const f of changed) {
  let d; try { d = matter.read(f).data; } catch { continue; }
  if (d.draft !== false) continue;
  const who = execSync(`git log -1 --format=%an%x09%ae -- "${f}"`).toString().trim();
  if (/\[bot\]/i.test(who)) bad.push(`${f}: draft is false and the last change is by ${who.split('\t')[0]}`);
}
if (bad.length) { console.error('Publish guard failed. A person must make the final change that sets a post live.\n- ' + bad.join('\n- ')); process.exit(1); }
console.log(`Publish guard passed (${changed.length} post file(s) checked).`);
