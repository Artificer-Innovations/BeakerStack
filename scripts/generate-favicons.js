const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Source SVG is in the root assets directory
const sourceSvgPath = path.join(__dirname, '../assets/demo-flask-icon.svg');
const publicDir = path.join(__dirname, '../apps/web/public');

// Favicon sizes and formats to generate
const faviconSizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'android-chrome-192x192.png' },
  { size: 512, name: 'android-chrome-512x512.png' },
];

async function generateFavicons() {
  try {
    // Check if source SVG exists
    if (!fs.existsSync(sourceSvgPath)) {
      console.error(`Error: Source icon not found at ${sourceSvgPath}`);
      console.error('Please ensure assets/demo-flask-icon.svg exists');
      process.exit(1);
    }

    // Ensure public directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    console.log(`Generating favicons from ${sourceSvgPath}...\n`);

    // Generate PNG favicons
    for (const { size, name } of faviconSizes) {
      const outputPath = path.join(publicDir, name);
      await sharp(sourceSvgPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }, // White background for favicons
        })
        .png()
        .toFile(outputPath);
      console.log(`✓ Generated ${name} (${size}x${size})`);
    }

    // Generate favicon.ico (multi-size ICO file with 16x16 and 32x32)
    // sharp doesn't support ICO directly, so we'll create a 32x32 PNG and rename it
    // Most modern browsers will accept PNG as favicon.ico, but for true ICO support
    // we'd need an additional library. For now, we'll create a 32x32 PNG as favicon.ico
    const faviconIcoPath = path.join(publicDir, 'favicon.ico');
    await sharp(sourceSvgPath)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toFile(faviconIcoPath);
    console.log(`✓ Generated favicon.ico (32x32)`);

    console.log(`\n✓ All favicons generated successfully in ${publicDir}`);
  } catch (error) {
    console.error('Error generating favicons:', error);
    process.exit(1);
  }
}

generateFavicons();

