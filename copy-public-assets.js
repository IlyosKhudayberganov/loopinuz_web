const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, 'public');
const DIST = path.join(__dirname, 'dist');

const FILES = [
  'site.webmanifest',
  'site_apple.webmanifest',
  'browserconfig.xml',
  'logo_padded.svg',
  'pattern.svg',
  'snapshot.html'
];

const DIRS = [
  path.join('assets', 'fonts')
];

for (const dir of DIRS) {
  const src = path.join(PUBLIC, dir);
  const dst = path.join(DIST, dir);
  if (!fs.existsSync(src)) continue;
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      fs.cpSync(srcPath, dstPath, { recursive: true });
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
  console.log(`Copied ${dir}/`);
}

for (const file of FILES) {
  const src = path.join(PUBLIC, file);
  const dst = path.join(DIST, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    console.log(`Copied ${file}`);
  }
}
