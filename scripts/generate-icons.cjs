const fs = require('node:fs')
const path = require('node:path')

async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true })
}

async function main() {
  const root = path.resolve(__dirname, '..')
  const pub = path.join(root, 'public')
  const src = path.join(pub, 'images', 'logo.jpg')
  const iconsDir = path.join(pub, 'icons')

  let sharp
  try {
    sharp = require('sharp')
  } catch {
    console.error('Missing dependency: sharp. Run: npm i sharp')
    process.exit(1)
  }

  try {
    await fs.promises.access(src, fs.constants.R_OK)
  } catch {
    console.error('Source logo not found at', src)
    process.exit(1)
  }

  await ensureDir(iconsDir)

  const outputs = [
    { file: path.join(iconsDir, 'icon-192.png'), size: 192 },
    { file: path.join(iconsDir, 'icon-512.png'), size: 512 },
    { file: path.join(iconsDir, 'icon-512-maskable.png'), size: 512, maskable: true },
  ]

  for (const out of outputs) {
    const { size, file, maskable } = out
    const canvas = sharp({ create: { width: size, height: size, channels: 4, background: '#ffffff' } })
    const buf = await sharp(src)
      .resize({ width: Math.round(size * (maskable ? 0.76 : 0.9)), height: Math.round(size * (maskable ? 0.76 : 0.9)), fit: 'inside' })
      .png()
      .toBuffer()
    await canvas.composite([{ input: buf, gravity: 'center' }]).png().toFile(file)
    console.log('Wrote', file)
  }

  // Apple touch icon (180x180)
  const apple = path.join(pub, 'apple-touch-icon.png')
  await sharp(src).resize({ width: 180, height: 180, fit: 'cover' }).png().toFile(apple)
  console.log('Wrote', apple)

  // Favicons (png)
  const fav32 = path.join(pub, 'favicon-32.png')
  const fav16 = path.join(pub, 'favicon-16.png')
  await sharp(src).resize({ width: 32, height: 32, fit: 'cover' }).png().toFile(fav32)
  await sharp(src).resize({ width: 16, height: 16, fit: 'cover' }).png().toFile(fav16)
  console.log('Wrote', fav32)
  console.log('Wrote', fav16)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
