// Shrinks the generated share images (dist/og/*.png) to a 256-colour palette.
// They are flat brand graphics, so the palette is visually lossless and roughly halves the bytes.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const dir = 'dist/og';
let before = 0, after = 0;
for (const f of readdirSync(dir).filter((f) => f.endsWith('.png'))) {
  const path = `${dir}/${f}`;
  const input = readFileSync(path);
  const out = await sharp(input).png({ palette: true, quality: 90, effort: 10, compressionLevel: 9 }).toBuffer();
  before += input.length;
  if (out.length < input.length) { writeFileSync(path, out); after += out.length; } else after += input.length;
}
console.log(`OG images: ${Math.round(before / 1024)} KB -> ${Math.round(after / 1024)} KB`);
