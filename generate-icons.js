// generate-icons.js
// Run: node generate-icons.js
// Requires: npm install --save-dev sharp

import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const sizes = [16, 24, 32, 48, 64, 96, 128, 192, 256];
const svgPath = resolve(__dirname, 'icon.svg');
const svgBuffer = readFileSync(svgPath);

const targets = [
  resolve(__dirname, 'newicons'),
  resolve(__dirname, 'public'),
];

for (const dir of targets) {
  mkdirSync(dir, { recursive: true });
}

for (const size of sizes) {
  const filename = `icon_${size}x${size}.png`;

  for (const dir of targets) {
    const outPath = resolve(dir, filename);
    await sharp(svgBuffer)
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    console.log(`  ✓ ${outPath}`);
  }
}

console.log('\nDone. All icons generated in newicons/ and public/');
