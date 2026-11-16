/**
 * 生成 tabBar 图标与默认头像（纯 Node 实现 PNG 编码，无外部依赖）
 * 用法：node scripts/gen-icons.mjs
 * 输出：src/static/tabbar/*.png、src/static/avatar-default.png
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SIZE = 81 // 微信 tabBar 推荐尺寸
const SS = 3 // 超采样倍数（抗锯齿）

/* ---------- PNG 编码 ---------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePNG(width, height, rgba) {
  const stride = width * 4 + 1
  const raw = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0 // filter: none
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ---------- 超采样画布 ---------- */

class Canvas {
  constructor(size) {
    this.size = size
    this.n = size * SS
    this.buf = new Float64Array(this.n * this.n * 4) // RGBA，初始全透明
  }

  set(x, y, [r, g, b, a]) {
    if (x < 0 || y < 0 || x >= this.n || y >= this.n || a <= 0) return
    const i = (y * this.n + x) * 4
    const d = this.buf
    const da = d[i + 3]
    const outA = a + da * (1 - a)
    if (outA <= 0) return
    d[i] = (r * a + d[i] * da * (1 - a)) / outA
    d[i + 1] = (g * a + d[i + 1] * da * (1 - a)) / outA
    d[i + 2] = (b * a + d[i + 2] * da * (1 - a)) / outA
    d[i + 3] = outA
  }

  fillCircle(cx, cy, r, color) {
    const s = SS
    const cxs = cx * s
    const cys = cy * s
    const rs = r * s
    for (let y = Math.floor(cys - rs); y <= Math.ceil(cys + rs); y++) {
      for (let x = Math.floor(cxs - rs); x <= Math.ceil(cxs + rs); x++) {
        const dx = x + 0.5 - cxs
        const dy = y + 0.5 - cys
        if (dx * dx + dy * dy <= rs * rs) this.set(x, y, color)
      }
    }
  }

  // 圆内横带（精灵球中间的黑带）
  fillCircleBand(cx, cy, r, halfBand, color) {
    const s = SS
    const cxs = cx * s
    const cys = cy * s
    const rs = r * s
    const hb = halfBand * s
    for (let y = Math.floor(cys - rs); y <= Math.ceil(cys + rs); y++) {
      const dy = y + 0.5 - cys
      if (Math.abs(dy) > hb) continue
      for (let x = Math.floor(cxs - rs); x <= Math.ceil(cxs + rs); x++) {
        const dx = x + 0.5 - cxs
        if (dx * dx + dy * dy <= rs * rs) this.set(x, y, color)
      }
    }
  }

  fillRect(x0, y0, w, h, color) {
    const s = SS
    const xa = Math.round(x0 * s)
    const ya = Math.round(y0 * s)
    const xb = Math.round((x0 + w) * s)
    const yb = Math.round((y0 + h) * s)
    for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) this.set(x, y, color)
  }

  fillRoundRect(x0, y0, w, h, r, color) {
    this.fillRect(x0 + r, y0, w - 2 * r, h, color)
    this.fillRect(x0, y0 + r, w, h - 2 * r, color)
    this.fillCircle(x0 + r, y0 + r, r, color)
    this.fillCircle(x0 + w - r, y0 + r, r, color)
    this.fillCircle(x0 + r, y0 + h - r, r, color)
    this.fillCircle(x0 + w - r, y0 + h - r, r, color)
  }

  // 椭圆上半部分（人形肩膀）
  fillEllipseTopHalf(cx, cy, rx, ry, color) {
    const s = SS
    const cxs = cx * s
    const cys = cy * s
    const rxs = rx * s
    const rys = ry * s
    for (let y = Math.floor(cys - rys); y <= Math.ceil(cys); y++) {
      const dy = y + 0.5 - cys
      for (let x = Math.floor(cxs - rxs); x <= Math.ceil(cxs + rxs); x++) {
        const dx = x + 0.5 - cxs
        if ((dx * dx) / (rxs * rxs) + (dy * dy) / (rys * rys) <= 1) this.set(x, y, color)
      }
    }
  }

  toPNG() {
    const { size, n } = this
    const out = Buffer.alloc(size * size * 4)
    const cnt = SS * SS
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let r = 0
        let g = 0
        let b = 0
        let a = 0
        for (let sy = 0; sy < SS; sy++) {
          for (let sx = 0; sx < SS; sx++) {
            const i = ((y * SS + sy) * n + (x * SS + sx)) * 4
            const pa = this.buf[i + 3]
            r += this.buf[i] * pa
            g += this.buf[i + 1] * pa
            b += this.buf[i + 2] * pa
            a += pa
          }
        }
        const avgA = a / cnt
        const o = (y * size + x) * 4
        out[o] = avgA > 0 ? Math.round(r / cnt / avgA) : 0
        out[o + 1] = avgA > 0 ? Math.round(g / cnt / avgA) : 0
        out[o + 2] = avgA > 0 ? Math.round(b / cnt / avgA) : 0
        out[o + 3] = Math.round(avgA * 255)
      }
    }
    return encodePNG(size, size, out)
  }
}

/* ---------- 图标绘制 ---------- */

const RED = [238, 21, 21, 1]
const RED_55 = [238, 21, 21, 0.55]
const RED_30 = [238, 21, 21, 0.3]
const RED_18 = [238, 21, 21, 0.18]
const GRAY = [154, 160, 166, 1]
const GRAY_55 = [154, 160, 166, 0.55]
const GRAY_30 = [154, 160, 166, 0.3]
const GRAY_18 = [154, 160, 166, 0.18]
const DARK = [48, 49, 51, 1]
const WHITE = [255, 255, 255, 1]
const BG = [240, 241, 245, 1]

function pokeball(body) {
  const c = new Canvas(SIZE)
  c.fillCircle(40.5, 40.5, 30, body)
  c.fillCircleBand(40.5, 40.5, 30, 6, DARK)
  c.fillCircle(40.5, 40.5, 12, DARK)
  c.fillCircle(40.5, 40.5, 8, WHITE)
  return c.toPNG()
}

function chart(c1, c2, c3, c4) {
  const c = new Canvas(SIZE)
  const m = 13
  const g = 5
  const w = (SIZE - 2 * m - g) / 2
  c.fillRoundRect(m, m, w, w, 6, c1)
  c.fillRoundRect(m + w + g, m, w, w, 6, c2)
  c.fillRoundRect(m, m + w + g, w, w, 6, c3)
  c.fillRoundRect(m + w + g, m + w + g, w, w, 6, c4)
  return c.toPNG()
}

function person(color) {
  const c = new Canvas(SIZE)
  c.fillCircle(40.5, 27, 13, color)
  c.fillEllipseTopHalf(40.5, 66, 22, 20, color)
  return c.toPNG()
}

function avatarDefault() {
  const c = new Canvas(SIZE)
  c.fillCircle(40.5, 40.5, 40, BG)
  c.fillCircle(40.5, 32, 12, GRAY)
  c.fillEllipseTopHalf(40.5, 70, 20, 18, GRAY)
  return c.toPNG()
}

/* ---------- 输出 ---------- */

const outDir = path.resolve(__dirname, '../src/static/tabbar')
mkdirSync(outDir, { recursive: true })

const files = {
  'dex.png': pokeball(GRAY),
  'dex-active.png': pokeball(RED),
  'chart.png': chart(GRAY, GRAY_55, GRAY_30, GRAY_18),
  'chart-active.png': chart(RED, RED_55, RED_30, RED_18),
  'user.png': person(GRAY),
  'user-active.png': person(RED),
}

for (const [name, buf] of Object.entries(files)) {
  writeFileSync(path.join(outDir, name), buf)
  console.log('生成', name, buf.length, 'bytes')
}

writeFileSync(path.resolve(__dirname, '../src/static/avatar-default.png'), avatarDefault())
console.log('生成 avatar-default.png')
