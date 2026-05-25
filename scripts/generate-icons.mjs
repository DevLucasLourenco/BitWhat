import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const buildDir = resolve(root, 'build')

mkdirSync(buildDir, { recursive: true })

const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n += 1) {
  let c = n
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  crcTable[n] = c >>> 0
}

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) {
    c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0)
  return Buffer.concat([length, typeBuffer, data, checksum])
}

function roundedRectMask(x, y, width, height, radius) {
  const left = radius
  const right = width - radius - 1
  const top = radius
  const bottom = height - radius - 1
  const dx = x < left ? left - x : x > right ? x - right : 0
  const dy = y < top ? top - y : y > bottom ? y - bottom : 0
  return dx * dx + dy * dy <= radius * radius
}

function drawLine(pixels, width, height, x1, y1, x2, y2, thickness, color) {
  const dx = x2 - x1
  const dy = y2 - y1
  const lengthSq = dx * dx + dy * dy

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSq))
      const px = x1 + t * dx
      const py = y1 + t * dy
      const distance = Math.hypot(x - px, y - py)
      if (distance <= thickness) {
        const index = (y * width + x) * 4
        pixels[index] = color[0]
        pixels[index + 1] = color[1]
        pixels[index + 2] = color[2]
        pixels[index + 3] = color[3]
      }
    }
  }
}

function createIconPng(size) {
  const pixels = Buffer.alloc(size * size * 4)
  const radius = Math.round(size * 0.18)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4
      const inside = roundedRectMask(x, y, size, size, radius)
      if (!inside) {
        pixels[index + 3] = 0
        continue
      }

      const vertical = y / Math.max(1, size - 1)
      const horizontal = x / Math.max(1, size - 1)
      pixels[index] = Math.round(14 + 20 * horizontal)
      pixels[index + 1] = Math.round(108 + 42 * vertical)
      pixels[index + 2] = Math.round(82 + 26 * horizontal)
      pixels[index + 3] = 255
    }
  }

  const bubbleMargin = Math.round(size * 0.17)
  const bubbleSize = size - bubbleMargin * 2
  const bubbleRadius = Math.round(size * 0.16)
  for (let y = bubbleMargin; y < bubbleMargin + bubbleSize; y += 1) {
    for (let x = bubbleMargin; x < bubbleMargin + bubbleSize; x += 1) {
      const localX = x - bubbleMargin
      const localY = y - bubbleMargin
      if (!roundedRectMask(localX, localY, bubbleSize, bubbleSize, bubbleRadius)) {
        continue
      }
      const index = (y * size + x) * 4
      pixels[index] = 245
      pixels[index + 1] = 250
      pixels[index + 2] = 247
      pixels[index + 3] = 255
    }
  }

  const tailColor = [245, 250, 247, 255]
  for (let y = Math.round(size * 0.63); y < Math.round(size * 0.83); y += 1) {
    const start = Math.round(size * 0.33)
    const end = Math.round(size * 0.5 - (y - size * 0.63) * 0.55)
    for (let x = start; x < end; x += 1) {
      const index = (y * size + x) * 4
      pixels[index] = tailColor[0]
      pixels[index + 1] = tailColor[1]
      pixels[index + 2] = tailColor[2]
      pixels[index + 3] = tailColor[3]
    }
  }

  const mark = [13, 118, 94, 255]
  drawLine(pixels, size, size, size * 0.32, size * 0.4, size * 0.42, size * 0.62, size * 0.045, mark)
  drawLine(pixels, size, size, size * 0.42, size * 0.62, size * 0.68, size * 0.35, size * 0.045, mark)

  const scanlines = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1)
    scanlines[rowStart] = 0
    pixels.copy(scanlines, rowStart + 1, y * size * 4, (y + 1) * size * 4)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(scanlines)),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function createIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)

  const entries = []
  const imageBuffers = []
  let offset = 6 + images.length * 16

  for (const image of images) {
    const entry = Buffer.alloc(16)
    entry[0] = image.size === 256 ? 0 : image.size
    entry[1] = image.size === 256 ? 0 : image.size
    entry[2] = 0
    entry[3] = 0
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(image.buffer.length, 8)
    entry.writeUInt32LE(offset, 12)
    entries.push(entry)
    imageBuffers.push(image.buffer)
    offset += image.buffer.length
  }

  return Buffer.concat([header, ...entries, ...imageBuffers])
}

const sizes = [16, 32, 48, 64, 128, 256]
const images = sizes.map((size) => ({ size, buffer: createIconPng(size) }))

writeFileSync(resolve(buildDir, 'icon.png'), images.at(-1).buffer)
writeFileSync(resolve(buildDir, 'tray.png'), images.find((image) => image.size === 32).buffer)
writeFileSync(resolve(buildDir, 'icon.ico'), createIco(images))

const svgPath = resolve(buildDir, 'icon.svg')
mkdirSync(dirname(svgPath), { recursive: true })
writeFileSync(
  svgPath,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="BitWhat">
  <rect width="256" height="256" rx="46" fill="#0f766e"/>
  <rect x="44" y="44" width="168" height="150" rx="36" fill="#f5faf7"/>
  <path d="M82 168 69 216l48-27Z" fill="#f5faf7"/>
  <path d="m82 106 27 48 65-72" fill="none" stroke="#0d765e" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`
)

console.log(`Generated icons in ${buildDir}`)
