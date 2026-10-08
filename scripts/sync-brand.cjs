// The fish artwork is exclusive to the installed application icon.
const sharp = require('sharp');
sharp('desktop/icon-master.png').resize(1024, 1024).png().toFile('desktop/icon.png').catch(error => { console.error(error); process.exitCode = 1; });
