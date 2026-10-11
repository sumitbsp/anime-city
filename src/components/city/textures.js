import * as THREE from 'three'
import { toonGradient } from '../characters/rig.js'
import { seeded } from './state.js'

export function toon(color, extra) {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonGradient, ...extra })
}

function canvasTexture(width, height, draw, { repeat = false, nearest = false } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  draw(canvas.getContext('2d'), width, height)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  if (nearest) tex.magFilter = THREE.NearestFilter
  return tex
}

// A box whose UVs are scaled to world size, so a repeating texture keeps the
// same physical scale (window size, tile size) whatever the box dimensions.
export function scaledBox(sx, sy, sz, tileU, tileV = tileU) {
  const geo = new THREE.BoxGeometry(sx, sy, sz)
  const uv = geo.attributes.uv
  // Face order: +x, -x, +y, -y, +z, -z — four vertices each.
  const faceSize = [
    [sz, sy],
    [sz, sy],
    [sx, sz],
    [sx, sz],
    [sx, sy],
    [sx, sy],
  ]
  for (let face = 0; face < 6; face++) {
    const [w, h] = faceSize[face]
    for (let v = face * 4; v < face * 4 + 4; v++) uv.setXY(v, uv.getX(v) * (w / tileU), uv.getY(v) * (h / tileV))
  }
  return geo
}

// --- Building facades -------------------------------------------------------
// Each tile covers FACADE_COLS × FACADE_FLOORS windows. The colour map draws the
// wall and windows; the emissive map lights a random subset of windows at night.

export const FACADE_COLS = 6
export const FACADE_FLOORS = 5
export const WINDOW_W = 1.8
export const FLOOR_H = 1.7

const FACADE_STYLES = [
  { wall: '#b5654a', trim: '#e8d8c8', glass: '#5c6f86', kind: 'brick' },
  { wall: '#dccaa8', trim: '#f6efe2', glass: '#62809c', kind: 'sill' },
  { wall: '#6f93b8', trim: '#c9dbea', glass: '#3c5c80', kind: 'glass' },
  { wall: '#ecebe6', trim: '#b9c2cc', glass: '#56708a', kind: 'ribbon' },
  { wall: '#e7a8a0', trim: '#fbe7e2', glass: '#5d6d8a', kind: 'sill' },
  { wall: '#7fb5ad', trim: '#e3f2ef', glass: '#4d6b80', kind: 'sill' },
  { wall: '#8d8f9c', trim: '#d4d6de', glass: '#444f66', kind: 'glass' },
]

function facadeWindows(style, draw) {
  const cw = 64
  const ch = 64
  for (let r = 0; r < FACADE_FLOORS; r++) {
    for (let c = 0; c < FACADE_COLS; c++) {
      const x = c * cw
      const y = r * ch
      if (style.kind === 'glass') draw(x + 3, y + 4, cw - 6, ch - 8, r, c)
      else if (style.kind === 'ribbon') draw(x, y + 20, cw, 26, r, c)
      else draw(x + 16, y + 14, cw - 32, ch - 24, r, c)
    }
  }
}

function makeFacade(style, index) {
  const w = FACADE_COLS * 64
  const h = FACADE_FLOORS * 64
  const map = canvasTexture(
    w,
    h,
    (ctx) => {
      ctx.fillStyle = style.wall
      ctx.fillRect(0, 0, w, h)
      if (style.kind === 'brick') {
        ctx.fillStyle = 'rgba(80, 30, 20, 0.18)'
        for (let y = 0; y < h; y += 8) {
          ctx.fillRect(0, y, w, 1)
          for (let x = (y / 8) % 2 ? 0 : 8; x < w; x += 16) ctx.fillRect(x, y, 1, 8)
        }
      }
      facadeWindows(style, (x, y, ww, wh) => {
        ctx.fillStyle = style.trim
        ctx.fillRect(x - 3, y - 3, ww + 6, wh + 6)
        const g = ctx.createLinearGradient(x, y, x + ww, y + wh)
        g.addColorStop(0, style.glass)
        g.addColorStop(0.55, '#a9c3db')
        g.addColorStop(0.6, style.glass)
        ctx.fillStyle = g
        ctx.fillRect(x, y, ww, wh)
        if (style.kind === 'sill' || style.kind === 'brick') {
          ctx.fillStyle = style.trim
          ctx.fillRect(x - 5, y + wh + 2, ww + 10, 4)
          ctx.fillRect(x + ww / 2 - 1, y, 2, wh)
        }
      })
    },
    { repeat: true },
  )

  const rand = seeded(101 + index * 17)
  const warm = ['#ffd38a', '#ffe2b0', '#fff1d6', '#ffc477', '#cfe3ff']
  const emissiveMap = canvasTexture(
    w,
    h,
    (ctx) => {
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)
      facadeWindows(style, (x, y, ww, wh) => {
        if (rand() > 0.48) return
        ctx.fillStyle = warm[Math.floor(rand() * warm.length)]
        ctx.globalAlpha = 0.55 + rand() * 0.45
        ctx.fillRect(x, y, ww, wh)
        ctx.globalAlpha = 1
      })
    },
    { repeat: true },
  )

  return toon('#ffffff', { map, emissiveMap, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0 })
}

export const FACADE_MATERIALS = FACADE_STYLES.map(makeFacade)
export const ROOF_MATERIAL = toon('#7d7f87')

// --- Shopfronts ------------------------------------------------------------------

const SHOP_FRAMES = ['#2f3e46', '#7a2e2e', '#2e4a7a', '#3d6b47', '#5a3d7a', '#8a5a2b']

function makeShopfront(frame) {
  const w = 256
  const h = 128
  const map = canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = frame
    ctx.fillRect(0, 0, w, h)
    const g = ctx.createLinearGradient(0, 20, 170, 120)
    g.addColorStop(0, '#9fc2d8')
    g.addColorStop(0.5, '#e6f3fb')
    g.addColorStop(0.55, '#8fb1c8')
    g.addColorStop(1, '#6f93ab')
    ctx.fillStyle = g
    ctx.fillRect(12, 16, 172, 100)
    // shelves and goods behind the glass
    ctx.fillStyle = 'rgba(60, 40, 30, 0.45)'
    for (let y = 50; y < 116; y += 28) ctx.fillRect(16, y, 164, 4)
    const goods = ['#e76f51', '#f4a261', '#e9c46a', '#2a9d8f', '#e5989b', '#b5838d']
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = goods[i % goods.length]
      ctx.fillRect(20 + (i % 9) * 18, 34 + Math.floor(i / 9) * 28, 12, 16)
    }
    // door
    ctx.fillStyle = '#c9dfec'
    ctx.fillRect(198, 22, 46, 106)
    ctx.fillStyle = frame
    ctx.fillRect(198, 70, 46, 4)
    ctx.fillStyle = '#d4af37'
    ctx.fillRect(234, 78, 4, 14)
  })
  const emissiveMap = canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#ffdca8'
    ctx.fillRect(12, 16, 172, 100)
    ctx.fillStyle = '#ffe9c7'
    ctx.fillRect(198, 22, 46, 106)
  })
  return toon('#ffffff', { map, emissiveMap, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0 })
}

export const SHOPFRONT_MATERIALS = SHOP_FRAMES.map(makeShopfront)
export const SHOP_FRAME_MATERIALS = SHOP_FRAMES.map((c) => toon(c))

// --- Awnings and signs ---------------------------------------------------------

const AWNING_COLORS = [
  ['#d62828', '#f8f1e5'],
  ['#2a9d8f', '#f8f1e5'],
  ['#264653', '#e9c46a'],
  ['#f4a261', '#fff7ea'],
  ['#6d597a', '#f8e1f4'],
  ['#3a86ff', '#ffffff'],
]

export const AWNING_MATERIALS = AWNING_COLORS.map(([a, b]) => {
  const map = canvasTexture(
    64,
    8,
    (ctx) => {
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 ? b : a
        ctx.fillRect(i * 8, 0, 8, 8)
      }
    },
    { repeat: true, nearest: true },
  )
  return toon('#ffffff', { map })
})

export const SHOP_NAMES = [
  'CAFÉ',
  'RAMEN',
  'BOOKS',
  'PIZZA',
  'FLOWERS',
  'ARCADE',
  'BAKERY',
  'SUSHI',
  'TOYS',
  'MUSIC',
  'GROCERY',
  'MANGA',
  'TEA HOUSE',
  'DONUTS',
  'GELATO',
  'DINER',
]

const SIGN_COLORS = ['#1d3557', '#fefae0', '#283618', '#9d0208', '#22223b', '#ffb703']
const NEON_COLORS = ['#ff4fd8', '#38f8ff', '#ffe347', '#7cff6b', '#ff7847', '#b48bff']

function signFont(px) {
  return `800 ${px}px "Avenir Next", "Trebuchet MS", system-ui, sans-serif`
}

// Flat shop sign above the awning; the lettering glows after dark.
export function makeSignMaterial(text, colorIndex) {
  const bg = SIGN_COLORS[colorIndex % SIGN_COLORS.length]
  const light = ['#fefae0', '#ffb703'].includes(bg)
  const fg = light ? '#1d3557' : '#fff7e0'
  const w = 512
  const h = 96
  const draw = (glow) => (ctx) => {
    ctx.fillStyle = glow ? '#000' : bg
    ctx.fillRect(0, 0, w, h)
    if (!glow) {
      ctx.strokeStyle = fg
      ctx.lineWidth = 4
      ctx.strokeRect(8, 8, w - 16, h - 16)
    }
    ctx.fillStyle = glow ? '#ffe8b8' : fg
    ctx.font = signFont(58)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, w / 2, h / 2 + 3, w - 40)
  }
  return toon('#ffffff', {
    map: canvasTexture(w, h, draw(false)),
    emissiveMap: canvasTexture(w, h, draw(true)),
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 0,
  })
}

// Vertical blade sign sticking out from the building, lettered top to bottom.
export function makeNeonMaterial(text, colorIndex) {
  const color = NEON_COLORS[colorIndex % NEON_COLORS.length]
  const w = 96
  const h = 96 * Math.max(text.length, 3)
  const map = canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = '#16141f'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = color
    ctx.lineWidth = 6
    ctx.strokeRect(6, 6, w - 12, h - 12)
    ctx.fillStyle = color
    ctx.font = signFont(64)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ;[...text].forEach((ch, i) => ctx.fillText(ch, w / 2, 96 * i + 52))
  })
  return new THREE.MeshBasicMaterial({ map, color: '#ffffff', toneMapped: false })
}

// --- Ground ----------------------------------------------------------------------

export const SIDEWALK_TILE = 1.5

export const SIDEWALK_MATERIAL = toon('#ffffff', {
  map: canvasTexture(
    64,
    64,
    (ctx) => {
      ctx.fillStyle = '#d9d4cc'
      ctx.fillRect(0, 0, 64, 64)
      ctx.fillStyle = '#b9b2a8'
      ctx.fillRect(0, 0, 64, 2)
      ctx.fillRect(0, 0, 2, 64)
      ctx.fillStyle = 'rgba(0,0,0,0.04)'
      ctx.fillRect(20, 30, 14, 10)
    },
    { repeat: true },
  ),
})

export const ASPHALT_MATERIAL = toon('#ffffff', {
  map: canvasTexture(
    128,
    128,
    (ctx) => {
      ctx.fillStyle = '#41454f'
      ctx.fillRect(0, 0, 128, 128)
      const rand = seeded(5)
      for (let i = 0; i < 900; i++) {
        const v = 50 + Math.floor(rand() * 40)
        ctx.fillStyle = `rgba(${v},${v + 2},${v + 8},0.5)`
        ctx.fillRect(rand() * 128, rand() * 128, 1.5, 1.5)
      }
    },
    { repeat: true },
  ),
})

// Soft radial blob used for lamp light pools, headlight spill and steam.
export const SOFT_GLOW = canvasTexture(128, 128, (ctx) => {
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.4, 'rgba(255,255,255,0.45)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
})
