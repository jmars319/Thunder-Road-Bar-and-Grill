import fs from 'node:fs';
import path from 'node:path';

const [manifestPath, rootDir] = process.argv.slice(2);
if (!manifestPath || !rootDir) {
  console.error('Usage: node scripts/verify-permanent-assets.mjs <manifest> <repo-root>');
  process.exit(2);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const assetPaths = Object.values(manifest.bundled || {}).flatMap((value) => Array.isArray(value) ? value : []);

if (assetPaths.length === 0) {
  console.error('[permanent-assets][error] manifest does not list any bundled assets');
  process.exit(1);
}

for (const asset of assetPaths) {
  if (asset.includes('/uploads/') || asset.startsWith('backend/uploads/')) {
    console.error(`[permanent-assets][error] bundled asset points at runtime uploads: ${asset}`);
    process.exit(1);
  }
  if (!fs.existsSync(path.join(rootDir, asset))) {
    console.error(`[permanent-assets][error] missing bundled asset: ${asset}`);
    process.exit(1);
  }
}

console.log(`[permanent-assets] Verified ${assetPaths.length} bundled assets`);
