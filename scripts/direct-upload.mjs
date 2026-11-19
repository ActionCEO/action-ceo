// Packs dist/ plus a bundled _worker.js into deploy/ and action-ceo-deploy.zip, for a Cloudflare Pages
// Direct Upload from the dashboard. Run after `npm run build`. Not used by Git builds.
import { cpSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { execSync } from 'node:child_process';
import { build } from 'esbuild';

rmSync('deploy', { recursive: true, force: true });
cpSync('dist', 'deploy', { recursive: true });
// Pagefind ships 3 UI flavours; the site only loads pagefind-ui. Dropping the unused ones keeps the zip small.
for (const f of ['pagefind-component-ui.js', 'pagefind-component-ui.css', 'pagefind-modular-ui.js', 'pagefind-modular-ui.css', 'pagefind-highlight.js', 'wasm.unknown.pagefind']) rmSync(`deploy/pagefind/${f}`, { force: true });
// The .jpg files are only the old-browser fallback (AVIF/WebP are served first), so a mozjpeg re-encode is safe.
for (const f of readdirSync('deploy/img').filter((f) => f.endsWith('.jpg'))) {
  const p = `deploy/img/${f}`, src = readFileSync(p);
  const out = await sharp(src).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  if (out.length < src.length) writeFileSync(p, out);
}
await build({ entryPoints: ['scripts/worker-entry.js'], bundle: true, format: 'esm', platform: 'neutral', target: 'es2022', outfile: 'deploy/_worker.js', minify: true });
rmSync('action-ceo-deploy.zip', { force: true });
execSync('cd deploy && zip -qr -9 ../action-ceo-deploy.zip .');
console.log(`deploy/_worker.js ${statSync('deploy/_worker.js').size} B, zip ${Math.round(statSync('action-ceo-deploy.zip').size / 1024)} KB`);
