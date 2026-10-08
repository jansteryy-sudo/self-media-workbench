// This master is shared by browser favicon, application shell and macOS app bundle.
const fs = require('node:fs');
const sharp = require('sharp');
fs.copyFileSync('public/brand/fish.svg', 'src/app/icon.svg');
sharp('public/brand/fish.svg').resize(1024, 1024).png().toFile('desktop/icon.png').catch(error => { console.error(error); process.exitCode = 1; });
