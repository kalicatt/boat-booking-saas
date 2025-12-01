const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const BRAND_COLOR = '#0f172a';
const OUTPUTS_ANDROID = [
  { dir: 'drawable', width: 480, height: 320 },
  { dir: 'drawable-port-mdpi', width: 320, height: 480 },
  { dir: 'drawable-port-hdpi', width: 480, height: 800 },
  { dir: 'drawable-port-xhdpi', width: 720, height: 1280 },
  { dir: 'drawable-port-xxhdpi', width: 960, height: 1600 },
  { dir: 'drawable-port-xxxhdpi', width: 1280, height: 1920 },
  { dir: 'drawable-land-mdpi', width: 480, height: 320 },
  { dir: 'drawable-land-hdpi', width: 800, height: 480 },
  { dir: 'drawable-land-xhdpi', width: 1280, height: 720 },
  { dir: 'drawable-land-xxhdpi', width: 1600, height: 960 },
  { dir: 'drawable-land-xxxhdpi', width: 1920, height: 1280 }
];

const OUTPUTS_IOS = [
  { file: 'splash-2732x2732.png', size: 2732 },
  { file: 'splash-2732x2732-1.png', size: 2732 },
  { file: 'splash-2732x2732-2.png', size: 2732 }
];

const logoPath = path.join(__dirname, '..', 'public', 'images', 'logo.jpg');
const androidBase = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const iosBase = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');

async function ensureDir(filePath) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
}

async function generateSplash(width, height, outputPath) {
  const minSide = Math.min(width, height);
  const logoSize = Math.round(minSide * 0.5);
  const logoBuffer = await sharp(logoPath)
    .resize({ width: logoSize, height: logoSize, fit: 'inside', withoutEnlargement: true })
    .png({ quality: 100 })
    .toBuffer();

  const background = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: BRAND_COLOR
    }
  });

  await ensureDir(outputPath);
  await background
    .composite([{ input: logoBuffer, gravity: 'center' }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outputPath);

  // Ensure file permissions are consistent on Windows as well
  await fs.promises.chmod(outputPath, 0o644);
}

async function run() {
  const tasks = [];

  for (const entry of OUTPUTS_ANDROID) {
    const target = path.join(androidBase, entry.dir, 'splash.png');
    tasks.push(generateSplash(entry.width, entry.height, target));
  }

  for (const entry of OUTPUTS_IOS) {
    const target = path.join(iosBase, entry.file);
    tasks.push(generateSplash(entry.size, entry.size, target));
  }

  await Promise.all(tasks);
  console.log('Splash assets updated to brand color.');
}

run().catch((error) => {
  console.error('Failed to update splash assets:', error);
  process.exitCode = 1;
});
