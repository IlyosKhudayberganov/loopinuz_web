const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, 'public');
const DIST = path.join(__dirname, 'dist');

function copyDirRecursive(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function copyFile(srcSubPath) {
  const src = path.join(PUBLIC, srcSubPath);
  const dst = path.join(DIST, srcSubPath);
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    console.log(`  ${srcSubPath}`);
  }
}

console.log('Copying public assets to dist...');

// Copy entire assets directories
const assetDirs = ['assets/fonts', 'assets/img', 'assets/audio', 'assets/tgs'];
for (const dir of assetDirs) {
  const src = path.join(PUBLIC, dir);
  if (fs.existsSync(src)) {
    const dst = path.join(DIST, dir);
    copyDirRecursive(src, dst);
    console.log(`Copied ${dir}/`);
  }
}

// Copy root-level files
const rootFiles = ['site.webmanifest', 'site_apple.webmanifest', 'browserconfig.xml', 'snapshot.html'];
for (const file of rootFiles) {
  copyFile(file);
}

// Copy asset images referenced from index.html and manifest at root level
const rootImgFiles = [
  'logo_padded.svg',
  'favicon.ico',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'android-chrome-144x144.png',
  'android-chrome-192x192.png'
];
for (const file of rootImgFiles) {
  copyFile(path.join('assets/img', file));
}

// Copy pattern.svg to root (referenced as /pattern.svg)
copyFile(path.join('assets/img', 'pattern.svg'));

// Also copy pattern.svg to dist root
const patternSrc = path.join(PUBLIC, 'assets/img/pattern.svg');
const patternDst = path.join(DIST, 'pattern.svg');
if (fs.existsSync(patternSrc)) {
  fs.copyFileSync(patternSrc, patternDst);
  console.log('  pattern.svg (root)');
}

console.log('Done copying public assets.');
