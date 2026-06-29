const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    let srcPath = path.join(src, entry.name);
    let destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  // Copy static
  const staticSrc = path.resolve(__dirname, '..', '.next', 'static');
  const staticDest = path.resolve(__dirname, '..', '.next', 'standalone', '.next', 'static');
  if (fs.existsSync(staticSrc)) {
    copyDir(staticSrc, staticDest);
    console.log('✓ Copied .next/static to standalone build');
  } else {
    console.log('⚠ .next/static not found, skipping');
  }

  // Copy public
  const publicSrc = path.resolve(__dirname, '..', 'public');
  const publicDest = path.resolve(__dirname, '..', '.next', 'standalone', 'public');
  if (fs.existsSync(publicSrc)) {
    copyDir(publicSrc, publicDest);
    console.log('✓ Copied public folder to standalone build');
  } else {
    console.log('⚠ public folder not found, skipping');
  }
} catch (err) {
  console.error('Error during asset copying:', err);
  process.exit(1);
}
