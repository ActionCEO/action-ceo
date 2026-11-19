// Turns a source photo into the site's image set: <name>.jpg plus AVIF and WebP at 800px and full width.
// Usage: node scripts/make-images.mjs <source> <name> [crop "left,top,width,height"] [max width]
// Output goes to public/img. Pages reference the files by name, so re-running with the same name swaps the photo.
import sharp from 'sharp';

const [src, name, crop, maxW = '1600'] = process.argv.slice(2);
if (!src || !name) { console.error('Usage: node scripts/make-images.mjs <source> <name> [crop] [maxWidth]'); process.exit(1); }
let img = sharp(src).rotate();
if (crop) { const [left, top, width, height] = crop.split(',').map(Number); img = img.extract({ left, top, width, height }); }
const base = await img.toBuffer({ resolveWithObject: true });
const full = Math.min(base.info.width, Number(maxW));
const out = 'public/img/' + name;
const at = (w) => sharp(base.data).resize({ width: w, withoutEnlargement: true });
await at(full).jpeg({ quality: 82, mozjpeg: true }).toFile(`${out}.jpg`);
for (const w of [800, full]) {
  await at(w).avif({ quality: 55, effort: 6 }).toFile(`${out}-${w}.avif`);
  await at(w).webp({ quality: 78 }).toFile(`${out}-${w}.webp`);
}
const meta = await sharp(`${out}.jpg`).metadata();
console.log(`${name}: ${meta.width}x${meta.height} (files at 800 and ${full})`);
