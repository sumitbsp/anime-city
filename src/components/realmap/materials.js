import * as THREE from 'three'
import { seeded } from '../city/state.js'
import { toon } from '../city/textures.js'
import { FLOOR_HEIGHT, SCALE } from './buildWorld.js'

function canvasTexture(width, height, draw, repeat = true) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  draw(canvas.getContext('2d'), width, height)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

// --- House facades ---------------------------------------------------------------
// One texture tile = 2 window bays × 2 floors. Walls are white in the texture
// and tinted by the material colour; glass, frames and grills stay dark/white.

const BAY = 3.3 * SCALE
const TILE_W = 2 * BAY
const TILE_H = 2 * FLOOR_HEIGHT
const PX = 128

function drawWindow(ctx, x, y) {
  // Sunshade (chajja) shadow band, frame, glass and a simple grill.
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.fillRect(x + 22, y + 26, 84, 10)
  ctx.fillStyle = '#ece8df'
  ctx.fillRect(x + 20, y + 20, 88, 8)
  ctx.fillStyle = '#f7f4ee'
  ctx.fillRect(x + 30, y + 38, 68, 58)
  ctx.fillStyle = '#4b6075'
  ctx.fillRect(x + 35, y + 43, 58, 48)
  ctx.fillStyle = 'rgba(190, 220, 240, 0.35)'
  ctx.fillRect(x + 35, y + 43, 22, 48)
  ctx.fillStyle = '#2d3138'
  for (let gx = x + 42; gx < x + 93; gx += 9) ctx.fillRect(gx, y + 43, 2, 48)
  ctx.fillRect(x + 35, y + 66, 58, 2)
}

const facadeMap = canvasTexture(PX * 2, PX * 2, (ctx) => {
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, PX * 2, PX * 2)
  // Floor slab lines.
  ctx.fillStyle = 'rgba(0,0,0,0.08)'
  ctx.fillRect(0, PX - 6, PX * 2, 6)
  ctx.fillRect(0, PX * 2 - 6, PX * 2, 6)
  for (const [bx, by] of [[0, 0], [PX, 0], [0, PX], [PX, PX]]) drawWindow(ctx, bx, by)
})

function facadeEmissive(pattern) {
  return canvasTexture(PX * 2, PX * 2, (ctx) => {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, PX * 2, PX * 2)
    ;[[0, 0], [PX, 0], [0, PX], [PX, PX]].forEach(([bx, by], i) => {
      if (!pattern[i]) return
      ctx.fillStyle = i % 2 ? '#ffe2a6' : '#fff1d0'
      ctx.fillRect(bx + 35, by + 43, 58, 48)
    })
  })
}

// Three lighting variants: a dark house and two partly lit ones.
const EMISSIVE_VARIANTS = [[0, 0, 0, 0], [1, 0, 0, 1], [0, 1, 1, 1]].map(facadeEmissive)

for (const tex of [facadeMap, ...EMISSIVE_VARIANTS]) {
  // Extruded side-wall UVs run v = 1 - height, i.e. downwards. A negative
  // repeat turns the texture the right way up and the offset starts floors at ground level.
  tex.repeat.set(1 / TILE_W, -1 / TILE_H)
  tex.offset.set(0, 1 / TILE_H)
}

export function makeWallMaterials(colors) {
  return colors.map((color) =>
    EMISSIVE_VARIANTS.map((emissiveMap, lit) =>
      toon(color, { map: facadeMap, emissiveMap, emissive: new THREE.Color(lit ? '#ffffff' : '#000000'), emissiveIntensity: 0 }),
    ),
  )
}

export const ROOF_MATERIAL = toon('#d4cfc4')
export const PARAPET_MATERIAL = toon('#efebe3')
export const TANK_MATERIAL = toon('#25272c')

// --- Ground and roads --------------------------------------------------------------

function noiseTexture(base, speckles, count, seed) {
  return canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = base
    ctx.fillRect(0, 0, 256, 256)
    const rand = seeded(seed)
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = speckles[Math.floor(rand() * speckles.length)]
      const r = 1 + rand() * 3
      ctx.beginPath()
      ctx.arc(rand() * 256, rand() * 256, r, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

// UV scale for world-space mapped surfaces (1 texture tile ≈ 6 m).
export const GROUND_UV = 1 / (6 * SCALE)

export const GROUND_MATERIAL = toon('#ffffff', {
  map: noiseTexture('#c9b98f', ['rgba(120,150,80,0.35)', 'rgba(150,120,80,0.3)', 'rgba(230,215,180,0.4)', 'rgba(100,130,70,0.25)'], 900, 3),
})
export const CONCRETE_MATERIAL = toon('#ffffff', {
  map: canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#bdb8ae'
    ctx.fillRect(0, 0, 256, 256)
    const rand = seeded(8)
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = `rgba(${90 + rand() * 60},${90 + rand() * 60},${85 + rand() * 50},0.25)`
      ctx.fillRect(rand() * 256, rand() * 256, 2, 2)
    }
    // Expansion joints in the concrete lane.
    ctx.fillStyle = 'rgba(70,70,70,0.25)'
    ctx.fillRect(0, 0, 256, 2)
  }),
})
export const ASPHALT_MATERIAL = toon('#ffffff', {
  map: noiseTexture('#45474e', ['rgba(110,110,115,0.5)', 'rgba(30,30,35,0.5)', 'rgba(140,135,125,0.3)'], 1600, 4),
})
export const PARK_MATERIAL = toon('#ffffff', {
  map: noiseTexture('#7fb35a', ['rgba(60,120,50,0.5)', 'rgba(150,190,90,0.5)', 'rgba(240,220,90,0.35)'], 1200, 5),
})
export const MARKING_MATERIAL = new THREE.MeshBasicMaterial({ color: '#efece2' })
export const STONE_MATERIAL = toon('#b6aa96')

// --- Shops and signs ------------------------------------------------------------------

export const SHUTTER_MATERIAL = toon('#ffffff', {
  map: canvasTexture(
    64,
    64,
    (ctx) => {
      ctx.fillStyle = '#a7adb5'
      ctx.fillRect(0, 0, 64, 64)
      ctx.fillStyle = 'rgba(40,45,55,0.35)'
      for (let y = 0; y < 64; y += 6) ctx.fillRect(0, y, 64, 2)
    },
    true,
  ),
})

const SIGN_FONT = '"Kohinoor Devanagari", "Noto Sans Devanagari", "Nirmala UI", "Mangal", "Avenir Next", system-ui, sans-serif'

// Two-line signboard: Hindi above, English below (either may be omitted).
export function makeSignMaterial({ hi, en, bg = '#c1121f', fg = '#fff8e7', border = '#ffd166' }) {
  const w = 512
  const h = 160
  const draw = (glow) => (ctx) => {
    ctx.fillStyle = glow ? '#000' : bg
    ctx.fillRect(0, 0, w, h)
    if (!glow) {
      ctx.strokeStyle = border
      ctx.lineWidth = 8
      ctx.strokeRect(6, 6, w - 12, h - 12)
    }
    ctx.fillStyle = glow ? '#ffe9bf' : fg
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const lines = [hi && { text: hi, size: 60 }, en && { text: en, size: hi ? 38 : 64 }].filter(Boolean)
    const total = lines.reduce((s, l) => s + l.size * 1.15, 0)
    let y = h / 2 - total / 2
    for (const l of lines) {
      ctx.font = `800 ${l.size}px ${SIGN_FONT}`
      y += (l.size * 1.15) / 2
      ctx.fillText(l.text, w / 2, y + 2, w - 40)
      y += (l.size * 1.15) / 2
    }
  }
  return toon('#ffffff', {
    map: canvasTexture(w, h, draw(false), false),
    emissiveMap: canvasTexture(w, h, draw(true), false),
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 0,
  })
}

// Generic neighbourhood shop types for buildings along the main road.
export const SHOP_SIGNS = [
  { hi: 'किराना स्टोर', en: 'KIRANA STORE', bg: '#c1121f' },
  { hi: 'मेडिकल स्टोर', en: 'MEDICAL STORE', bg: '#2a9d8f' },
  { hi: 'मोबाइल शॉप', en: 'MOBILE SHOP', bg: '#1d4ed8' },
  { hi: 'मिठाई भंडार', en: 'SWEETS', bg: '#f77f00' },
  { hi: 'हार्डवेयर', en: 'HARDWARE', bg: '#3d405b' },
  { hi: 'टेलर्स', en: 'TAILORS', bg: '#6a4c93' },
  { hi: 'चाय नाश्ता', en: 'TEA & SNACKS', bg: '#8d5524' },
  { hi: 'जनरल स्टोर', en: 'GENERAL STORE', bg: '#2b9348' },
  { hi: 'इलेक्ट्रिकल्स', en: 'ELECTRICALS', bg: '#e63946' },
  { hi: 'फोटो स्टूडियो', en: 'PHOTO STUDIO', bg: '#005f73' },
]
