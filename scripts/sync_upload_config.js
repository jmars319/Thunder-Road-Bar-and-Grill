const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'config', 'upload.json');
const destDir = path.join(root, 'frontend', 'src', 'config');
const dest = path.join(destDir, 'uploadConfig.json');

try {
  if (!fs.existsSync(src)) throw new Error('upload.json not found in config/');
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const data = fs.readFileSync(src);
  fs.writeFileSync(dest, data);
  console.log('uploadConfig synced to frontend/src/config/uploadConfig.json');
} catch (err) {
  console.error('Failed to sync upload config:', err.message || err);
  process.exit(2);
}
