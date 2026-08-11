#!/usr/bin/env node
/**
 * Rasterizes images/openhasp-icon.svg into assets/icon.png for the marketplace listing.
 *
 * The marketplace requires the extension icon to be a PNG of at least 128x128 with an
 * opaque background. The source SVG already paints an opaque #0D1117 rounded rect, so a
 * straight render satisfies both. assets/ is a build product and is gitignored.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ICON_SIZE = 128;

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'images', 'openhasp-icon.svg');
const outDir = path.join(root, 'assets');
const outFile = path.join(outDir, 'icon.png');

async function main() {
  if (!fs.existsSync(source)) {
    throw new Error(`Icon source not found: ${source}`);
  }

  fs.mkdirSync(outDir, { recursive: true });

  await sharp(fs.readFileSync(source), { density: 384 })
    .resize(ICON_SIZE, ICON_SIZE, { fit: 'contain' })
    .flatten({ background: '#0D1117' })
    .png()
    .toFile(outFile);

  const { size } = fs.statSync(outFile);
  console.log(`icon: ${path.relative(root, outFile)} (${ICON_SIZE}x${ICON_SIZE}, ${size} bytes)`);
}

main().catch((err) => {
  console.error(`icon generation failed: ${err.message}`);
  process.exit(1);
});
