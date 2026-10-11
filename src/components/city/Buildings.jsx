import { useFrame } from '@react-three/fiber'
import { Instance, Instances } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BLOCKS, CURB_HEIGHT, FRONTAGE_X, ROAD_END_Z, ROAD_START_Z } from '../world.js'
import { ambience } from './ambience.js'
import { seeded } from './state.js'
import {
  AWNING_MATERIALS,
  FACADE_COLS,
  FACADE_FLOORS,
  FACADE_MATERIALS,
  FLOOR_H,
  makeNeonMaterial,
  makeSignMaterial,
  scaledBox,
  SHOP_FRAME_MATERIALS,
  SHOP_NAMES,
  SHOPFRONT_MATERIALS,
  toon,
  WINDOW_W,
} from './textures.js'

const BACK_ROW_X = FRONTAGE_X + 15.5
const NEON_WORDS = ['HOTEL', 'KARAOKE', 'BAR', 'GAMES', 'CINEMA', 'NOODLE', 'CLUB', 'MANGA']
const LETTER_H = 0.75

const MAT = {
  rooftop: toon('#9a9ca4'),
  tank: toon('#8a6a4f'),
  neonFrame: toon('#1c1b24'),
  beacon: new THREE.MeshBasicMaterial({ color: '#ff3030', toneMapped: false }),
  skyline: toon('#ffffff'),
}

const ONE = new THREE.Vector3(1, 1, 1)

function frameMatrix(x, z, rotY) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)), ONE)
}

function local(base, x, y, z, rx = 0) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, 0)), ONE)
  return base.clone().multiply(m)
}

// Lays out the whole city once. Building frames put local +z towards the
// street, local x along the frontage and y up; the front face sits at z = 0.
function generateCity() {
  const rand = seeded(2024)
  const pick = (list) => list[Math.floor(rand() * list.length)]
  const solids = new Map()
  const signs = []
  const neons = []
  const beacons = []
  const signCache = new Map()

  const add = (material, geometry, matrix) => {
    geometry.applyMatrix4(matrix)
    if (!solids.has(material)) solids.set(material, [])
    solids.get(material).push(geometry)
  }

  function rooftop(base, w, h, depth) {
    const units = 1 + Math.floor(rand() * 3)
    for (let i = 0; i < units; i++) {
      add(MAT.rooftop, new THREE.BoxGeometry(1.2, 0.8, 1), local(base, (rand() - 0.5) * (w - 2.5), h + 0.4, -depth / 2 + (rand() - 0.5) * (depth - 3)))
    }
    if (rand() < 0.3 && h < 30) {
      const tx = (rand() - 0.5) * (w - 3)
      const tz = -depth * 0.65
      add(MAT.tank, new THREE.CylinderGeometry(0.85, 0.85, 1.6, 14), local(base, tx, h + 1.5, tz))
      add(MAT.tank, new THREE.ConeGeometry(0.95, 0.6, 14), local(base, tx, h + 2.6, tz))
      add(MAT.rooftop, new THREE.BoxGeometry(1.4, 0.7, 1.4), local(base, tx, h + 0.35, tz))
    }
    if (h > 28) {
      add(MAT.rooftop, new THREE.CylinderGeometry(0.08, 0.12, 6, 6), local(base, 0, h + 3, -depth / 2))
      beacons.push(new THREE.Vector3(0, h + 6.1, -depth / 2).applyMatrix4(base))
    }
  }

  function shopfronts(base, w) {
    const count = w > 8.5 ? 2 : 1
    const shopW = w / count
    const floorY = CURB_HEIGHT
    for (let i = 0; i < count; i++) {
      const sx = -w / 2 + shopW * (i + 0.5)
      const frame = Math.floor(rand() * SHOPFRONT_MATERIALS.length)
      add(SHOPFRONT_MATERIALS[frame], new THREE.BoxGeometry(shopW - 0.6, 3, 0.3), local(base, sx, floorY + 1.5, 0.15))
      for (const edge of [-1, 1]) {
        add(SHOP_FRAME_MATERIALS[frame], new THREE.BoxGeometry(0.3, 3.3, 0.42), local(base, sx + edge * (shopW / 2 - 0.15), floorY + 1.65, 0.2))
      }
      if (rand() < 0.75) {
        const awning = pick(AWNING_MATERIALS)
        add(awning, scaledBox(shopW - 0.7, 0.06, 1.35, 2, 2), local(base, sx, floorY + 3.05, 0.78, 0.3))
        add(awning, scaledBox(shopW - 0.7, 0.28, 0.04, 2, 2), local(base, sx, floorY + 2.75, 1.43))
      }
      const name = pick(SHOP_NAMES)
      const color = Math.floor(rand() * 6)
      const key = `${name}:${color}`
      if (!signCache.has(key)) signCache.set(key, makeSignMaterial(name, color))
      const signW = Math.min(shopW - 1, 4.2)
      add(SHOP_FRAME_MATERIALS[frame], new THREE.BoxGeometry(signW + 0.18, 0.88, 0.12), local(base, sx, floorY + 3.75, 0.08))
      signs.push({
        material: signCache.get(key),
        matrix: local(base, sx, floorY + 3.75, 0.15).multiply(new THREE.Matrix4().makeScale(signW, 0.7, 1)),
      })
    }
  }

  function neonBlade(base, w, h) {
    const word = pick(NEON_WORDS)
    const length = word.length * LETTER_H
    if (4.8 + length > h - 1) return
    neons.push({
      material: makeNeonMaterial(word, Math.floor(rand() * 6)),
      matrix: local(base, w / 2 - 0.8, 4.8 + length / 2, 0.55),
      length,
      flicker: rand() < 0.3,
    })
  }

  function building({ x, z, rotY, w, h, depth, shops }) {
    const base = frameMatrix(x, z, rotY)
    const facade = pick(FACADE_MATERIALS)
    add(facade, scaledBox(w, h, depth, FACADE_COLS * WINDOW_W, FACADE_FLOORS * FLOOR_H), local(base, 0, h / 2, -depth / 2))
    // Slim cornice so rooflines read against the sky.
    add(MAT.rooftop, new THREE.BoxGeometry(w + 0.2, 0.35, depth + 0.2), local(base, 0, h + 0.1, -depth / 2))
    rooftop(base, w, h, depth)
    if (shops) {
      shopfronts(base, w)
      if (h > 11 && rand() < 0.45) neonBlade(base, w, h)
    }
  }

  function row(frontX, minDepth, heights, shops) {
    for (const [a, b] of BLOCKS) {
      for (const side of [-1, 1]) {
        let z = a - 0.2
        while (z > b + 3) {
          let w = 6 + rand() * 5
          if (z - w < b + 4.5) w = z - b - 0.2
          const tall = rand() < heights.towerChance
          const floors = Math.round((tall ? heights.tower : heights.base) * (0.7 + rand() * 0.6) / FLOOR_H)
          building({
            x: side * frontX,
            z: z - w / 2,
            rotY: -side * Math.PI / 2,
            w: w - 0.15,
            h: Math.max(floors, 4) * FLOOR_H + 0.5,
            depth: minDepth + rand() * 5,
            shops,
          })
          z -= w
        }
      }
    }
  }

  row(FRONTAGE_X, 10, { base: 14, tower: 34, towerChance: 0.15 }, true)
  row(BACK_ROW_X, 12, { base: 26, tower: 48, towerChance: 0.3 }, false)

  // Landmark towers closing off both ends of the main street.
  building({ x: 0, z: ROAD_END_Z - 2, rotY: 0, w: 34, h: 52, depth: 18, shops: true })
  building({ x: 0, z: ROAD_START_Z + 2, rotY: Math.PI, w: 34, h: 30, depth: 16, shops: true })

  const merged = [...solids].map(([material, geometries]) => ({ material, geometry: mergeGeometries(geometries) }))
  return { merged, signs, neons, beacons }
}

// Distant city blocks beyond the streets, mostly seen through the fog.
const SKYLINE = (() => {
  const rand = seeded(77)
  const tones = ['#8d95a8', '#a2a9b9', '#7c8397', '#b4b8c4', '#969cae']
  return Array.from({ length: 170 }, () => {
    const side = rand() < 0.5 ? -1 : 1
    return {
      position: [side * (48 + rand() * 120), 0, ROAD_START_Z + 80 - rand() * (ROAD_START_Z - ROAD_END_Z + 200)],
      scale: [8 + rand() * 14, 18 + Math.pow(rand(), 1.6) * 80, 8 + rand() * 14],
      color: tones[Math.floor(rand() * tones.length)],
    }
  })
})()
const SKYLINE_GEO = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0)

const SIGN_GEO = new THREE.PlaneGeometry(1, 1)
const CITY = generateCity()

function Neon({ material, matrix, length }) {
  // Lettering on both broad faces (±x), plain housing elsewhere.
  const materials = [material, material, MAT.neonFrame, MAT.neonFrame, MAT.neonFrame, MAT.neonFrame]
  return (
    <mesh material={materials} matrixAutoUpdate={false} matrix={matrix} castShadow>
      <boxGeometry args={[0.16, length + 0.3, 0.9]} />
    </mesh>
  )
}

export default function Buildings() {
  const city = CITY

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const glow = ambience.windows
    for (const m of FACADE_MATERIALS) m.emissiveIntensity = glow
    for (const m of SHOPFRONT_MATERIALS) m.emissiveIntensity = 0.08 + glow * 0.32
    for (const s of city.signs) s.material.emissiveIntensity = glow * 0.9
    for (const n of city.neons) {
      // A few neon signs buzz and stutter.
      const stutter = n.flicker && Math.sin(t * 23) * Math.sin(t * 7.3) > 0.55 ? 0.25 : 1
      n.material.color.setScalar((0.8 + glow * 3) * stutter)
    }
    MAT.beacon.color.setRGB(1, 0.15, 0.15).multiplyScalar(Math.sin(t * 2.5) > 0.6 ? 1 + glow * 3 : 0.15)
  })

  return (
    <group>
      {city.merged.map(({ material, geometry }, i) => (
        <mesh key={i} geometry={geometry} material={material} castShadow receiveShadow />
      ))}
      {city.signs.map((s, i) => (
        <mesh key={i} geometry={SIGN_GEO} material={s.material} matrixAutoUpdate={false} matrix={s.matrix} />
      ))}
      {city.neons.map((n, i) => (
        <Neon key={i} {...n} />
      ))}
      <Instances limit={city.beacons.length} material={MAT.beacon}>
        <sphereGeometry args={[0.22, 10, 8]} />
        {city.beacons.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>
      <Instances limit={SKYLINE.length} geometry={SKYLINE_GEO} material={MAT.skyline}>
        {SKYLINE.map((b, i) => (
          <Instance key={i} position={b.position} scale={b.scale} color={b.color} />
        ))}
      </Instances>
    </group>
  )
}

