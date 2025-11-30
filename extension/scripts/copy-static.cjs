// Post-build script to copy static files into the dist folder
const fs = require('fs');
const path = require('path');

const root = __dirname + '/..';
const distDir = path.join(root, 'dist');

if (!fs.existsSync(distDir)) {
  console.error('dist folder not found; did you run "npm run build"?');
  process.exit(1);
}

// Copy manifest.json
const manifestSrc = path.join(root, 'manifest.json');
const manifestDest = path.join(distDir, 'manifest.json');
if (fs.existsSync(manifestSrc)) {
  fs.copyFileSync(manifestSrc, manifestDest);
  console.log('✓ Copied manifest.json to dist/manifest.json');
}

// Don't copy content_block_page.html - Vite processes it
// But we need to ensure it has the correct asset references
// The processed version should already be in dist/ with correct references

// Copy icons directory if it exists
const iconsSrc = path.join(root, 'icons');
const iconsDest = path.join(distDir, 'icons');
if (fs.existsSync(iconsSrc) && fs.statSync(iconsSrc).isDirectory()) {
  if (!fs.existsSync(iconsDest)) {
    fs.mkdirSync(iconsDest, { recursive: true });
  }
  const iconFiles = fs.readdirSync(iconsSrc);
  iconFiles.forEach((file) => {
    fs.copyFileSync(
      path.join(iconsSrc, file),
      path.join(iconsDest, file)
    );
  });
  console.log(`✓ Copied ${iconFiles.length} icon file(s) to dist/icons/`);
}
