const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Brand colors
const BRAND_BLUE = '#2B9FE3';
const WHITE = '#FFFFFF';
const DARK_GRAY = '#2D3748';

async function generateLogo() {
  console.log('Generating logo.png (512x512)...');

  const svg = `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="${WHITE}"/>

      <!-- Courthouse centered -->
      <g transform="translate(256, 256)">
        <!-- Base -->
        <rect x="-120" y="100" width="240" height="12" fill="${DARK_GRAY}"/>
        <rect x="-112" y="112" width="224" height="6" fill="${DARK_GRAY}"/>

        <!-- Columns -->
        <rect x="-97" y="-15" width="18" height="115" fill="${DARK_GRAY}"/>
        <rect x="-52" y="-15" width="18" height="115" fill="${DARK_GRAY}"/>
        <rect x="34" y="-15" width="18" height="115" fill="${DARK_GRAY}"/>
        <rect x="79" y="-15" width="18" height="115" fill="${DARK_GRAY}"/>

        <!-- Door -->
        <rect x="-22" y="15" width="44" height="85" fill="${BRAND_BLUE}"/>

        <!-- Entablature -->
        <rect x="-112" y="-27" width="224" height="12" fill="${DARK_GRAY}"/>

        <!-- Pediment -->
        <path d="M 0,-95 L 127,-27 L -127,-27 Z" fill="${DARK_GRAY}"/>
        <path d="M 0,-85 L 112,-27 L -112,-27 Z" fill="${WHITE}"/>
      </g>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .resize(512, 512)
    .png()
    .toFile(path.join(__dirname, '../public/logo.png'));

  console.log('✓ logo.png created');
}

async function generateOgImage() {
  console.log('Generating og-image.png (1200x630)...');

  const svg = `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <!-- Gradient background -->
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${BRAND_BLUE};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1E78C5;stop-opacity:1" />
        </linearGradient>
      </defs>

      <rect width="1200" height="630" fill="url(#bgGradient)"/>

      <!-- Courthouse icon on the left -->
      <g transform="translate(200, 315)">
        <!-- Base -->
        <rect x="-80" y="80" width="160" height="10" fill="${WHITE}"/>
        <rect x="-75" y="90" width="150" height="5" fill="${WHITE}"/>

        <!-- Columns -->
        <rect x="-65" y="-10" width="12" height="90" fill="${WHITE}"/>
        <rect x="-35" y="-10" width="12" height="90" fill="${WHITE}"/>
        <rect x="23" y="-10" width="12" height="90" fill="${WHITE}"/>
        <rect x="53" y="-10" width="12" height="90" fill="${WHITE}"/>

        <!-- Door -->
        <rect x="-15" y="15" width="30" height="65" fill="${DARK_GRAY}"/>

        <!-- Entablature -->
        <rect x="-75" y="-20" width="150" height="10" fill="${WHITE}"/>

        <!-- Pediment -->
        <path d="M 0,-75 L 85,-20 L -85,-20 Z" fill="${WHITE}"/>
        <path d="M 0,-65 L 75,-20 L -75,-20 Z" fill="${DARK_GRAY}"/>
      </g>

      <!-- Main text -->
      <text x="420" y="280" font-family="Georgia, serif" font-size="90" font-weight="bold" fill="${WHITE}">
        JudgeFinder<tspan fill="${DARK_GRAY}">.io</tspan>
      </text>

      <!-- Tagline -->
      <text x="420" y="360" font-family="system-ui, -apple-system, sans-serif" font-size="36" fill="${WHITE}" opacity="0.95">
        AI-Powered Judicial Transparency
      </text>

      <!-- Decorative line -->
      <rect x="420" y="390" width="300" height="3" fill="${WHITE}" opacity="0.5"/>

      <!-- Additional tagline -->
      <text x="420" y="450" font-family="system-ui, -apple-system, sans-serif" font-size="28" fill="${WHITE}" opacity="0.85">
        Research California Judges with AI Analytics
      </text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .resize(1200, 630)
    .png()
    .toFile(path.join(__dirname, '../public/og-image.png'));

  console.log('✓ og-image.png created');
}

async function generateTwitterImage() {
  console.log('Generating twitter-image.png (1200x600)...');

  const svg = `
    <svg width="1200" height="600" viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg">
      <!-- Gradient background -->
      <defs>
        <linearGradient id="twitterBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${BRAND_BLUE};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1E78C5;stop-opacity:1" />
        </linearGradient>
      </defs>

      <rect width="1200" height="600" fill="url(#twitterBgGradient)"/>

      <!-- Courthouse icon on the left -->
      <g transform="translate(200, 300)">
        <!-- Base -->
        <rect x="-80" y="75" width="160" height="10" fill="${WHITE}"/>
        <rect x="-75" y="85" width="150" height="5" fill="${WHITE}"/>

        <!-- Columns -->
        <rect x="-65" y="-10" width="12" height="85" fill="${WHITE}"/>
        <rect x="-35" y="-10" width="12" height="85" fill="${WHITE}"/>
        <rect x="23" y="-10" width="12" height="85" fill="${WHITE}"/>
        <rect x="53" y="-10" width="12" height="85" fill="${WHITE}"/>

        <!-- Door -->
        <rect x="-15" y="10" width="30" height="65" fill="${DARK_GRAY}"/>

        <!-- Entablature -->
        <rect x="-75" y="-20" width="150" height="10" fill="${WHITE}"/>

        <!-- Pediment -->
        <path d="M 0,-70 L 85,-20 L -85,-20 Z" fill="${WHITE}"/>
        <path d="M 0,-60 L 75,-20 L -75,-20 Z" fill="${DARK_GRAY}"/>
      </g>

      <!-- Main text -->
      <text x="420" y="260" font-family="Georgia, serif" font-size="85" font-weight="bold" fill="${WHITE}">
        JudgeFinder<tspan fill="${DARK_GRAY}">.io</tspan>
      </text>

      <!-- Tagline -->
      <text x="420" y="340" font-family="system-ui, -apple-system, sans-serif" font-size="34" fill="${WHITE}" opacity="0.95">
        AI-Powered Judicial Transparency
      </text>

      <!-- Decorative line -->
      <rect x="420" y="365" width="280" height="3" fill="${WHITE}" opacity="0.5"/>

      <!-- Additional tagline -->
      <text x="420" y="425" font-family="system-ui, -apple-system, sans-serif" font-size="26" fill="${WHITE}" opacity="0.85">
        Research California Judges with AI Analytics
      </text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .resize(1200, 600)
    .png()
    .toFile(path.join(__dirname, '../public/twitter-image.png'));

  console.log('✓ twitter-image.png created');
}

async function main() {
  console.log('Generating social media images...\n');

  try {
    await generateLogo();
    await generateOgImage();
    await generateTwitterImage();

    console.log('\n✓ All social media images generated successfully!');
    console.log('\nGenerated files:');
    console.log('  - /public/logo.png (512x512)');
    console.log('  - /public/og-image.png (1200x630)');
    console.log('  - /public/twitter-image.png (1200x600)');
  } catch (error) {
    console.error('Error generating images:', error);
    process.exit(1);
  }
}

main();
