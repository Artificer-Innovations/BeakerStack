const fs = require('fs');
const path = require('path');

// Source icon location (single source of truth)
const sourceIconPath = path.join(__dirname, '../assets/demo-flask-icon.svg');

// Destination locations
const webIconPath = path.join(
  __dirname,
  '../apps/web/public/demo-flask-icon.svg'
);
const mobileIconPath = path.join(
  __dirname,
  '../apps/mobile/assets/demo-flask-icon.svg'
);

function syncIconAssets() {
  if (!fs.existsSync(sourceIconPath)) {
    console.error(`Error: Source icon not found at ${sourceIconPath}`);
    process.exit(1);
  }

  // Ensure web public directory exists
  const webPublicDir = path.dirname(webIconPath);
  if (!fs.existsSync(webPublicDir)) {
    fs.mkdirSync(webPublicDir, { recursive: true });
    console.log(`✓ Created directory: ${webPublicDir}`);
  }

  // Copy to web public directory
  fs.copyFileSync(sourceIconPath, webIconPath);
  console.log(`✓ Copied icon to ${webIconPath}`);

  // Copy to mobile assets directory
  const mobileAssetsDir = path.dirname(mobileIconPath);
  if (!fs.existsSync(mobileAssetsDir)) {
    fs.mkdirSync(mobileAssetsDir, { recursive: true });
  }
  fs.copyFileSync(sourceIconPath, mobileIconPath);
  console.log(`✓ Copied icon to ${mobileIconPath}`);

  console.log(`\n✓ Icon assets synced successfully`);
  console.log(`  Source: ${sourceIconPath}`);
  console.log(`  Web: ${webIconPath}`);
  console.log(`  Mobile: ${mobileIconPath}`);
}

syncIconAssets();
