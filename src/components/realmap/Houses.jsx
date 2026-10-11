import { useFrame } from '@react-three/fiber'
import { Instance, Instances } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { ambience } from '../city/ambience.js'
import { toon } from '../city/textures.js'
import { FLOOR_HEIGHT, SCALE } from './buildWorld.js'
import { frontageMatrix, frontageToward } from './frontage.js'
import { extrudeFootprint, pointInPolygon, polylineDistance } from './geometry.js'
import { makeSignMaterial, makeWallMaterials, ROOF_MATERIAL, SHOP_SIGNS, SHUTTER_MATERIAL, TANK_MATERIAL } from './materials.js'

const PARAPET_H = 0.9 * SCALE
const PARAPET_T = 0.22 * SCALE
const SHOP_W = 3.6 * SCALE
const TANK_R = 0.6 * SCALE
const TANK_H = 1.15 * SCALE
const STAIR_ROOM = [2.6 * SCALE, 2.5 * SCALE, 2.4 * SCALE]
const SHUTTER_H = 2.6 * SCALE

const BOX = () => new THREE.BoxGeometry(1, 1, 1)
const SIGN_PLANE = () => new THREE.PlaneGeometry(1, 1)

// Unit normal of edge a→b that points into the building.
function edgeInward(b, ax, az, bx, bz, len) {
  const n = [-(bz - az) / len, (bx - ax) / len]
  const mx = (ax + bx) / 2
  const mz = (az + bz) / 2
  return pointInPolygon(mx + n[0] * 0.3, mz + n[1] * 0.3, b.points) ? n : [-n[0], -n[1]]
}

function buildHouses(world) {
  const wallMaterials = makeWallMaterials(world.wallColors)
  const plainMaterials = world.wallColors.map((c) => toon(c))
  const signMaterials = SHOP_SIGNS.map((s) => makeSignMaterial(s))
  const groups = new Map()
  const add = (material, geometry) => {
    if (!groups.has(material)) groups.set(material, [])
    groups.get(material).push(geometry)
  }
  const tanks = []
  const mainRoads = world.roads.filter((r) => r.main)

  for (const b of world.buildings) {
    const { caps, sides } = extrudeFootprint(b.points, b.height)
    add(ROOF_MATERIAL, caps)
    add(wallMaterials[b.color][b.lit], sides)

    // Roof parapet: a low wall along every edge, set just inside the outline.
    for (let i = 0; i < b.points.length; i++) {
      const [ax, az] = b.points[i]
      const [bx, bz] = b.points[(i + 1) % b.points.length]
      const len = Math.hypot(bx - ax, bz - az)
      if (len < 0.1) continue
      const wall = BOX()
      const inward = edgeInward(b, ax, az, bx, bz, len)
      wall.applyMatrix4(
        new THREE.Matrix4().compose(
          new THREE.Vector3((ax + bx) / 2 + inward[0] * PARAPET_T / 2, b.height + PARAPET_H / 2, (az + bz) / 2 + inward[1] * PARAPET_T / 2),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(bx - ax, bz - az), 0)),
          new THREE.Vector3(PARAPET_T, PARAPET_H, len + PARAPET_T),
        ),
      )
      add(plainMaterials[b.color], wall)
    }

    // Rooftop stair room and the ubiquitous black water tank.
    const [cx, cz] = b.centre
    const corner = b.points[Math.floor(b.seed * b.points.length)]
    const toward = (k) => [cx + (corner[0] - cx) * k, cz + (corner[1] - cz) * k]
    const edge = [b.points[1][0] - b.points[0][0], b.points[1][1] - b.points[0][1]]
    const yaw = Math.atan2(edge[0], edge[1])
    let tankBase = b.height
    let tankAt = toward(0.45)
    if (b.stairRoom && b.area > 50) {
      const [sx, sy, sz] = STAIR_ROOM
      const at = toward(-0.25)
      const geo = BOX()
      geo.applyMatrix4(
        new THREE.Matrix4().compose(
          new THREE.Vector3(at[0], b.height + sy / 2, at[1]),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
          new THREE.Vector3(sx, sy, sz),
        ),
      )
      add(plainMaterials[b.color], geo)
      if (b.seed > 0.5) {
        tankBase = b.height + sy
        tankAt = at
      }
    }
    if (b.tank) tanks.push({ position: [tankAt[0], tankBase + TANK_H / 2, tankAt[1]] })

    // Shops on the ground floor of buildings that face the main road.
    if (b.commercial && mainRoads.length) {
      const road = mainRoads.reduce((best, r) =>
        polylineDistance(cx, cz, r.points) < polylineDistance(cx, cz, best.points) ? r : best,
      )
      const front = frontageToward(b, road, 3 * SCALE)
      if (front) {
        // A row of small shops side by side, each with its own shutter and board.
        const units = Math.max(1, Math.min(5, Math.floor(front.length / SHOP_W)))
        const unitW = front.length / units
        for (let u = 0; u < units; u++) {
          const along = -front.length / 2 + unitW * (u + 0.5)
          const shutter = BOX()
          shutter.applyMatrix4(frontageMatrix(front, along, SHUTTER_H / 2, 0.08 * SCALE, [unitW - 0.6 * SCALE, SHUTTER_H, 0.16 * SCALE]))
          add(SHUTTER_MATERIAL, shutter)
          const sign = SIGN_PLANE()
          const signW = unitW - 0.4 * SCALE
          sign.applyMatrix4(frontageMatrix(front, along, FLOOR_HEIGHT * 0.9, 0.2 * SCALE, [signW, Math.min(signW * 0.3125, 1.1 * SCALE), 1]))
          add(signMaterials[Math.floor(b.seed * 997 + u * 7) % signMaterials.length], sign)
        }
      }
    }
  }

  wallMaterials.forEach((variants) => variants.forEach((m, lit) => lit && WINDOW_GLOW.add(m)))
  signMaterials.forEach((m) => SIGN_GLOW.add(m))
  const meshes = [...groups].map(([material, list]) => ({ material, geometry: mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g))) }))
  return { meshes, tanks }
}

const cache = new WeakMap()
// Materials whose glow follows the time of day.
const WINDOW_GLOW = new Set()
const SIGN_GLOW = new Set()

export default function Houses({ world }) {
  if (!cache.has(world)) cache.set(world, buildHouses(world))
  const h = cache.get(world)

  useFrame(() => {
    for (const m of WINDOW_GLOW) m.emissiveIntensity = ambience.windows * 0.9
    for (const m of SIGN_GLOW) m.emissiveIntensity = ambience.windows * 0.8
  })

  return (
    <group>
      {h.meshes.map(({ material, geometry }, i) => (
        <mesh key={i} geometry={geometry} material={material} castShadow receiveShadow />
      ))}
      <Instances limit={h.tanks.length} material={TANK_MATERIAL} castShadow>
        <cylinderGeometry args={[TANK_R, TANK_R * 0.95, TANK_H, 14]} />
        {h.tanks.map((t, i) => (
          <Instance key={i} position={t.position} />
        ))}
      </Instances>
    </group>
  )
}
