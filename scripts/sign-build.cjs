// Loads .env so CSC_LINK and CSC_KEY_PASSWORD are available to electron-builder,
// then spawns the builder with the full inherited environment.
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { execSync } = require('child_process');

const cscLink = process.env.CSC_LINK;
if (!cscLink) {
  console.warn('[sign-build] CSC_LINK is not set — build will be unsigned.');
} else {
  console.log(`[sign-build] Signing with: ${cscLink}`);
}

execSync('electron-builder', { stdio: 'inherit', env: process.env });

// Remind about required release assets
const distDir = path.join(__dirname, '../dist-electron');
const latestYml = path.join(distDir, 'latest.yml');
if (fs.existsSync(latestYml)) {
  console.log('\n[sign-build] Release checklist — upload ALL of these to GitHub:');
  fs.readdirSync(distDir)
    .filter(f => f.endsWith('.exe') || f.endsWith('.blockmap') || f === 'latest.yml')
    .forEach(f => console.log(`  dist-electron/${f}`));
}
