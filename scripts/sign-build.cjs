// Loads .env so CSC_LINK and CSC_KEY_PASSWORD are available to electron-builder,
// then spawns the builder with the full inherited environment.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { execSync } = require('child_process');

const cscLink = process.env.CSC_LINK;
if (!cscLink) {
  console.warn('[sign-build] CSC_LINK is not set — build will be unsigned.');
} else {
  console.log(`[sign-build] Signing with: ${cscLink}`);
}

execSync('electron-builder', { stdio: 'inherit', env: process.env });
