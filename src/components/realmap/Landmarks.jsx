import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ambience } from '../city/ambience.js'
import { player } from '../city/state.js'
import { toon } from '../city/textures.js'
import { SCALE } from './buildWorld.js'
import { frontageMatrix, frontageToward } from './frontage.js'
import { centroid, closestPointOnPolyline, polylineDistance } from './geometry.js'
import { makeSignMaterial, STONE_MATERIAL } from './materials.js'

// How each real OSM landmark is shown. Keys are OSM ids; `hi` is the Hindi
// signboard text, `en` the English line (taken from the OSM name).
const LANDMARK_STYLES = {
  4421978478: { kind: 'chowk', hi: 'कपिलनाथ कश्यप चौक', en: 'KAPILNATH KASHYAP CHOWK', bg: '#1b6b3a' },
  4422014579: { kind: 'chowk', hi: 'अशोक नगर चौक', en: 'ASHOK NAGAR CHOWK', bg: '#1b6b3a' },
  4421978476: { kind: 'gate', hi: 'मुक्तिधाम', en: 'MUKTIDHAM', bg: '#7a3e12' },
  4421978477: { kind: 'building', hi: 'देशी शराब दुकान', en: 'DESI SHARAB DUKAN', bg: '#5a189a' },
  4792705726: { kind: 'building', hi: 'पूजा पार्क', en: 'POOJA PARK', bg: '#9d0208' },
  10038316300: { kind: 'building', en: "DOMINO'S PIZZA", bg: '#0b6ba8', border: '#e31837' },
}
const PARK_SIGN = { hi: 'उद्यान', bg: '#2d6a4f' }

const MAT = {
  pole: toon('#5b6170'),
  pillar: toon('#f1e3c6'),
  pillarTrim: toon('#c0582b'),
}
const BOX = new THREE.BoxGeometry(1, 1, 1)
const CYL = new THREE.CylinderGeometry(1, 1, 1, 24)
const PLANE = new THREE.PlaneGeometry(1, 1)

// Floating map-pin style name label, drawn once to a canvas.
function makeLabel(text) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx.font = '700 44px "Avenir Next", system-ui, sans-serif'
  const w = Math.ceil(ctx.measureText(text).width) + 80
  canvas.width = w
  canvas.height = 96
  ctx.font = '700 44px "Avenir Next", system-ui, sans-serif'
  ctx.fillStyle = 'rgba(20, 18, 40, 0.78)'
  ctx.beginPath()
  ctx.roundRect(4, 4, w - 8, 72, 36)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(w / 2 - 14, 74)
  ctx.lineTo(w / 2 + 14, 74)
  ctx.lineTo(w / 2, 92)
  ctx.fill()
  ctx.fillStyle = '#ffd166'
  ctx.beginPath()
  ctx.arc(40, 40, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 60, 42)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return { map: tex, aspect: w / 96 }
}

function Label({ text, x, y, z }) {
  const { map, aspect } = makeLabelCached(text)
  const height = 1.1 * SCALE
  return (
    <sprite position={[x, y, z]} scale={[height * aspect, height, 1]} renderOrder={10}>
      <spriteMaterial map={map} transparent depthWrite={false} toneMapped={false} sizeAttenuation />
    </sprite>
  )
}
const labelCache = new Map()
function makeLabelCached(text) {
  if (!labelCache.has(text)) labelCache.set(text, makeLabel(text))
  return labelCache.get(text)
}

// Green road sign on two poles, standing beside the road.
function PoleSign({ material, x, z, heading }) {
  const w = 4.2 * SCALE
  const h = w * 0.3125
  const top = 4 * SCALE
  return (
    <group position={[x, 0, z]} rotation-y={heading}>
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={CYL} material={MAT.pole} position={[s * w * 0.42, top / 2, 0]} scale={[0.06 * SCALE, top, 0.06 * SCALE]} castShadow />
      ))}
      {/* Readable from both directions: one face each way, with a board between. */}
      <mesh geometry={BOX} material={MAT.pole} position={[0, top - h / 2, 0]} scale={[w + 0.1 * SCALE, h + 0.1 * SCALE, 0.03 * SCALE]} />
      <mesh geometry={PLANE} material={material} position={[0, top - h / 2, 0.03 * SCALE]} scale={[w, h, 1]} />
      <mesh geometry={PLANE} material={material} position={[0, top - h / 2, -0.03 * SCALE]} rotation-y={Math.PI} scale={[w, h, 1]} />
    </group>
  )
}

function Chowk({ landmark, material }) {
  const { x, z, road } = landmark
  const near = road ? closestPointOnPolyline(x, z, road.points) : { heading: 0 }
  const side = road ? road.width / 2 + 2.2 * SCALE : 4 * SCALE
  // Sign sits beside the road, facing traffic along it.
  const nx = Math.cos(near.heading)
  const nz = -Math.sin(near.heading)
  return (
    <group>
      <mesh geometry={CYL} material={STONE_MATERIAL} position={[x, 0.2 * SCALE, z]} scale={[2 * SCALE, 0.4 * SCALE, 2 * SCALE]} receiveShadow castShadow />
      <mesh geometry={CYL} material={MAT.pillar} position={[x, 0.9 * SCALE, z]} scale={[0.5 * SCALE, 1.2 * SCALE, 0.5 * SCALE]} castShadow />
      <mesh geometry={CYL} material={MAT.pillarTrim} position={[x, 1.55 * SCALE, z]} scale={[0.6 * SCALE, 0.15 * SCALE, 0.6 * SCALE]} />
      <PoleSign material={material} x={x + nx * side} z={z + nz * side} heading={near.heading} />
    </group>
  )
}

function Gate({ landmark, material }) {
  const { x, z, road } = landmark
  const near = road ? closestPointOnPolyline(x, z, road.points) : { x, z: z + 1 }
  const heading = Math.atan2(near.x - x, near.z - z)
  const span = 3.4 * SCALE
  const height = 4.6 * SCALE
  return (
    <group position={[x, 0, z]} rotation-y={heading}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * span, 0, 0]}>
          <mesh geometry={BOX} material={MAT.pillar} position={[0, height / 2, 0]} scale={[0.9 * SCALE, height, 0.9 * SCALE]} castShadow />
          <mesh geometry={BOX} material={MAT.pillarTrim} position={[0, height + 0.15 * SCALE, 0]} scale={[1.1 * SCALE, 0.3 * SCALE, 1.1 * SCALE]} />
        </group>
      ))}
      <mesh geometry={BOX} material={MAT.pillarTrim} position={[0, height - 0.2 * SCALE, 0]} scale={[span * 2 + 0.9 * SCALE, 0.4 * SCALE, 0.7 * SCALE]} castShadow />
      <mesh geometry={PLANE} material={material} position={[0, height - 1.1 * SCALE, 0.38 * SCALE]} scale={[span * 1.6, span * 1.6 * 0.3125, 1]} />
    </group>
  )
}

function BuildingSign({ world, landmark, material }) {
  const building = nearestBuilding(world, landmark.x, landmark.z)
  if (!building || !landmark.road) return null
  const front = frontageToward(building, landmark.road)
  if (!front) return null
  const w = Math.min(front.length - 0.6 * SCALE, 5.5 * SCALE)
  const matrix = frontageMatrix(front, 0, Math.min(building.height - 0.6 * SCALE, 3.3 * SCALE), 0.22 * SCALE, [w, w * 0.3125, 1])
  return <mesh geometry={PLANE} material={material} matrixAutoUpdate={false} matrix={matrix} />
}

function nearestBuilding(world, x, z) {
  let best = null
  let bestD = 25 * SCALE
  for (const b of world.buildings) {
    const d = Math.hypot(b.centre[0] - x, b.centre[1] - z)
    if (d < bestD) {
      best = b
      bestD = d
    }
  }
  return best
}

function ParkSign({ world, park, material }) {
  const [cx, cz] = centroid(park.points)
  const road = world.roads.reduce((best, r) => (polylineDistance(cx, cz, r.points) < polylineDistance(cx, cz, best.points) ? r : best))
  const near = closestPointOnPolyline(cx, cz, road.points)
  // Put the board on the park's edge nearest the road.
  const edge = park.points.reduce((best, p) => (Math.hypot(p[0] - near.x, p[1] - near.z) < Math.hypot(best[0] - near.x, best[1] - near.z) ? p : best))
  return <PoleSign material={material} x={edge[0]} z={edge[1]} heading={Math.atan2(near.x - cx, near.z - cz)} />
}

function buildLandmarks(world) {
  const items = world.landmarks.map((l) => {
    const style = LANDMARK_STYLES[l.id] ?? { kind: 'chowk', en: l.name.toUpperCase(), bg: '#1b6b3a' }
    return { landmark: l, style, material: makeSignMaterial({ ...style, fg: '#ffffff', border: style.border ?? '#ffffff' }) }
  })
  const parks = world.parks.map((p) => ({
    park: p,
    name: p.tags.name ? `${p.tags.name} Park` : 'Park',
    material: makeSignMaterial({ ...PARK_SIGN, en: (p.tags.name ? `${p.tags.name} PARK` : 'PARK').toUpperCase(), fg: '#ffffff', border: '#ffffff' }),
  }))
  for (const m of [...items.map((i) => i.material), ...parks.map((p) => p.material)]) SIGN_GLOW.add(m)
  return { items, parks }
}

const cache = new WeakMap()
const SIGN_GLOW = new Set()

export default function Landmarks({ world }) {
  if (!cache.has(world)) cache.set(world, buildLandmarks(world))
  const { items, parks } = cache.get(world)

  useFrame(() => {
    for (const m of SIGN_GLOW) m.emissiveIntensity = ambience.windows * 0.7
  })

  return (
    <group>
      {items.map(({ landmark, style, material }) => (
        <group key={landmark.id}>
          {style.kind === 'chowk' && <Chowk landmark={landmark} material={material} />}
          {style.kind === 'gate' && <Gate landmark={landmark} material={material} />}
          {style.kind === 'building' && <BuildingSign world={world} landmark={landmark} material={material} />}
          <Label text={landmark.name} x={landmark.x} y={(style.kind === 'building' ? 9 : 6.5) * SCALE} z={landmark.z} />
        </group>
      ))}
      {parks.map(({ park, name, material }) => {
        const [cx, cz] = centroid(park.points)
        return (
          <group key={park.id}>
            <ParkSign world={world} park={park} material={material} />
            <Label text={name.replace(/\b\w+/g, (w) => w[0] + w.slice(1).toLowerCase())} x={cx} y={6 * SCALE} z={cz} />
          </group>
        )
      })}
      <LabelFade />
    </group>
  )
}

// Hide labels far from the player so they don't clutter the view.
function LabelFade() {
  useFrame(({ scene }) => {
    scene.traverse((o) => {
      if (!o.isSprite || o.renderOrder !== 10) return
      const d = Math.hypot(o.position.x - player.position.x, o.position.z - player.position.z)
      o.material.opacity = THREE.MathUtils.clamp(1 - (d - 60 * SCALE) / (25 * SCALE), 0, 1)
    })
  })
  return null
}
