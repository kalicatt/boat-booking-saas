const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const BRAND_COLOR = '#0f172a';
const SRC_ICON = path.join(__dirname, '..', 'public', 'images', 'IconApp.jpg');

const ANDROID_BASE = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const IOS_APPICON = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');

const ANDROID_DENSITIES = [
  { dir: 'mipmap-mdpi', launcherSize: 48, foregroundSize: 108 },
  { dir: 'mipmap-hdpi', launcherSize: 72, foregroundSize: 162 },
  { dir: 'mipmap-xhdpi', launcherSize: 96, foregroundSize: 216 },
  { dir: 'mipmap-xxhdpi', launcherSize: 144, foregroundSize: 324 },
  { dir: 'mipmap-xxxhdpi', launcherSize: 192, foregroundSize: 432 }
];

const IOS_ICON_SPECS = [
  { idiom: 'iphone', size: 20, scale: 2 },
  { idiom: 'iphone', size: 20, scale: 3 },
  { idiom: 'iphone', size: 29, scale: 2 },
  { idiom: 'iphone', size: 29, scale: 3 },
  { idiom: 'iphone', size: 40, scale: 2 },
  { idiom: 'iphone', size: 40, scale: 3 },
  { idiom: 'iphone', size: 60, scale: 2 },
  { idiom: 'iphone', size: 60, scale: 3 },
  { idiom: 'ipad', size: 20, scale: 1 },
  { idiom: 'ipad', size: 20, scale: 2 },
  { idiom: 'ipad', size: 29, scale: 1 },
  { idiom: 'ipad', size: 29, scale: 2 },
  { idiom: 'ipad', size: 40, scale: 1 },
  { idiom: 'ipad', size: 40, scale: 2 },
  { idiom: 'ipad', size: 76, scale: 1 },
  { idiom: 'ipad', size: 76, scale: 2 },
  { idiom: 'ipad', size: 83.5, scale: 2 },
  { idiom: 'ios-marketing', size: 1024, scale: 1 }
];

async function ensureDir(p) {
  await fs.promises.mkdir(path.dirname(p), { recursive: true });
}

async function loadIcon(width) {
  return sharp(SRC_ICON)
    .resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
    .removeAlpha()
    .png()
    .toBuffer();
}

async function generateAndroidIcons() {
  for (const { dir, launcherSize, foregroundSize } of ANDROID_DENSITIES) {
    const densityDir = path.join(ANDROID_BASE, dir);

    const squareCanvas = sharp({
      create: {
        width: launcherSize,
        height: launcherSize,
        channels: 4,
        background: BRAND_COLOR
      }
    });
    const iconSizeSquare = Math.round(launcherSize * 0.7);
    const iconSquare = await loadIcon(iconSizeSquare);
    await ensureDir(path.join(densityDir, 'ic_launcher.png'));
    await squareCanvas.composite([{ input: iconSquare, gravity: 'center' }]).png().toFile(path.join(densityDir, 'ic_launcher.png'));

    const circleSvg = Buffer.from(
      `<svg width="${launcherSize}" height="${launcherSize}" viewBox="0 0 ${launcherSize} ${launcherSize}" xmlns="http://www.w3.org/2000/svg"><circle cx="${launcherSize / 2}" cy="${launcherSize / 2}" r="${launcherSize / 2}" fill="${BRAND_COLOR}"/></svg>`
    );
    const circleCanvas = sharp(circleSvg).png();
    const iconSizeRound = Math.round(launcherSize * 0.62);
    const iconRound = await loadIcon(iconSizeRound);
    await circleCanvas.composite([{ input: iconRound, gravity: 'center' }]).png().toFile(path.join(densityDir, 'ic_launcher_round.png'));

    const foregroundCanvas = sharp({
      create: {
        width: foregroundSize,
        height: foregroundSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    });
    const iconSizeForeground = Math.round(foregroundSize * 0.75);
    const iconForeground = await loadIcon(iconSizeForeground);
    await foregroundCanvas
      .composite([{ input: iconForeground, gravity: 'center' }])
      .png()
      .toFile(path.join(densityDir, 'ic_launcher_foreground.png'));
  }
}

function formatSize(size) {
  return Number.isInteger(size) ? `${size}x${size}` : `${size}x${size}`;
}

function cleanFilenameFragment(value) {
  return value.toString().replace('.', '_');
}

async function generateIosIcons() {
  const images = [];
  for (const spec of IOS_ICON_SPECS) {
    const pixelSize = Math.round(spec.size * spec.scale);
    const sizeLabel = formatSize(spec.size);
    const filename = `AppIcon-${spec.idiom}-${cleanFilenameFragment(spec.size)}@${spec.scale}x.png`;
    const canvas = sharp({
      create: {
        width: pixelSize,
        height: pixelSize,
        channels: 4,
        background: BRAND_COLOR
      }
    });
    const iconSize = Math.round(pixelSize * 0.72);
    const icon = await loadIcon(iconSize);
    await canvas.composite([{ input: icon, gravity: 'center' }]).png().toFile(path.join(IOS_APPICON, filename));

    images.push({
      idiom: spec.idiom,
      size: sizeLabel,
      scale: `${spec.scale}x`,
      filename
    });
  }

  const contents = {
    images,
    info: {
      author: 'xcode',
      version: 1
    }
  };

  await fs.promises.writeFile(path.join(IOS_APPICON, 'Contents.json'), JSON.stringify(contents, null, 2));
}

async function main() {
  try {
    await fs.promises.access(SRC_ICON, fs.constants.R_OK);
  } catch (error) {
    console.error('Source icon missing at', SRC_ICON);
    process.exit(1);
  }

  await generateAndroidIcons();
  await generateIosIcons();
  console.log('Native launcher icons updated.');
}

main().catch((error) => {
  console.error('Failed to update native icons:', error);
  process.exit(1);
});
