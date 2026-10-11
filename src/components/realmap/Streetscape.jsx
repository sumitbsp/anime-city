import { useFrame } from '@react-three/fiber'
import { Instance, Instances } from '@react-three/drei'
import * as THREE from 'three'
import { ambience } from '../city/ambience.js'
import { seeded } from '../city/state.js'
import { SOFT_GLOW, toon } from '../city/textures.js'
import { SCALE } from './buildWorld.js'
import { centroid, pointInPolygon } from './geometry.js'

const POLE_H = 8 * SCALE
const ARM_W = 1.6 * SCALE
const LEAF_TINTS = ['#4f9a45', '#3f8a4a', '#6aaa4c', '#2f7a45']

const MAT = {
  trunk: toon('#6e4b2e'),
  leaves: toon('#ffffff'),
  ashoka: toon('#2f6e3b'),
  pole: toon('#a5a39b'),
  wire: new THREE.LineBasicMaterial({ color: '#1d1d22' }),
  bulb: new THREE.MeshBasicMaterial({ color: '#fff1c7', toneMapped: false }),
  pool: new THREE.MeshBasicMaterial({
    map: SOFT_GLOW,
    color: '#ffd28a',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }),
  bench: toon('#b5651d'),
  frame: toon('#d62828'),
  seat: toon('#ffd166'),
}
const GEO = {
  trunk: new THREE.CylinderGeometry(0.75, 1, 1, 7),
  canopy: new THREE.IcosahedronGeometry(1, 1),
  cone: new THREE.ConeGeometry(1, 1, 8),
  box: new THREE.BoxGeometry(1, 1, 1),
  pool: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
}

function Part({ geometry, material, items, castShadow = true }) {
  if (!items.length) return null
  return (
    <Instances geometry={geometry} material={material} limit={items.length} castShadow={castShadow} receiveShadow>
      {items.map((it, i) => (
        <Instance key={i} position={it.position} rotation={it.rotation} scale={it.scale} color={it.color} />
      ))}
    </Instances>
  )
}

function buildStreetscape(world) {
  const neem = world.trees.filter((t) => t.kind === 'neem')
  const ashoka = world.trees.filter((t) => t.kind === 'ashoka')

  const poles = world.poles.flat()
  const lit = poles.filter((_, i) => i % 2 === 0)
  // Offset across the road from a pole; positive values reach out over the road.
  const armOffset = (p, along, up) => [p.x + Math.cos(p.heading) * along, up, p.z - Math.sin(p.heading) * along]

  // Sagging wires between consecutive poles on each line, three conductors each.
  const wire = []
  for (const line of world.poles) {
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i]
      const b = line[i + 1]
      if (Math.hypot(b.x - a.x, b.z - a.z) > 45 * SCALE) continue
      for (const along of [-ARM_W * 0.45, 0, ARM_W * 0.45]) {
        const p0 = armOffset(a, along, POLE_H - 0.1 * SCALE)
        const p1 = armOffset(b, along, POLE_H - 0.1 * SCALE)
        const steps = 8
        for (let k = 0; k < steps; k++) {
          for (const t of [k / steps, (k + 1) / steps]) {
            const sag = Math.sin(t * Math.PI) * 0.9 * SCALE
            wire.push(p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t - sag, p0[2] + (p1[2] - p0[2]) * t)
          }
        }
      }
    }
  }
  const wireGeo = new THREE.BufferGeometry()
  wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3))

  // A few benches and a swing set in each park.
  const rand = seeded(77)
  const benches = []
  const swings = []
  for (const park of world.parks) {
    const [cx, cz] = centroid(park.points)
    swings.push({ x: cx, z: cz })
    for (let i = 0; i < 30 && benches.length < 6; i++) {
      const x = cx + (rand() - 0.5) * 40 * SCALE
      const z = cz + (rand() - 0.5) * 40 * SCALE
      if (pointInPolygon(x, z, park.points)) benches.push({ x, z, yaw: rand() * Math.PI })
    }
  }

  return { neem, ashoka, poles, lit, armOffset, wireGeo, benches, swings }
}

const cache = new WeakMap()

export default function Streetscape({ world }) {
  if (!cache.has(world)) cache.set(world, buildStreetscape(world))
  const s = cache.get(world)

  useFrame(() => {
    MAT.bulb.color.set('#fff1c7').multiplyScalar(0.5 + ambience.lamps * 1.8)
    MAT.pool.opacity = ambience.lamps * 0.18
  })

  return (
    <group>
      {/* Neem: short trunk, broad layered canopy. */}
      <Part geometry={GEO.trunk} material={MAT.trunk} items={s.neem.map((t) => ({ position: [t.x, t.size * 1.6, t.z], scale: [0.22 * t.size, t.size * 3.2, 0.22 * t.size] }))} />
      <Part
        geometry={GEO.canopy}
        material={MAT.leaves}
        items={s.neem.map((t) => ({ position: [t.x, t.size * 4, t.z], scale: [t.size * 2.4, t.size * 1.7, t.size * 2.4], color: LEAF_TINTS[t.tint] }))}
      />
      <Part
        geometry={GEO.canopy}
        material={MAT.leaves}
        items={s.neem.map((t) => ({ position: [t.x + t.size * 0.8, t.size * 5.1, t.z - t.size * 0.4], scale: t.size * 1.5, color: LEAF_TINTS[(t.tint + 1) % 4] }))}
      />
      {/* Ashoka: tall, narrow and dark. */}
      <Part geometry={GEO.trunk} material={MAT.trunk} items={s.ashoka.map((t) => ({ position: [t.x, t.size, t.z], scale: [0.15 * t.size, t.size * 2, 0.15 * t.size] }))} />
      <Part geometry={GEO.cone} material={MAT.ashoka} items={s.ashoka.map((t) => ({ position: [t.x, t.size * 4.6, t.z], scale: [t.size * 1.1, t.size * 6.5, t.size * 1.1] }))} />

      {/* Electric poles, crossarms, wires and street lights. */}
      <Part geometry={GEO.box} material={MAT.pole} items={s.poles.map((p) => ({ position: [p.x, POLE_H / 2, p.z], rotation: [0, p.heading, 0], scale: [0.22 * SCALE, POLE_H, 0.22 * SCALE] }))} />
      <Part
        geometry={GEO.box}
        material={MAT.pole}
        items={s.poles.map((p) => ({ position: [p.x, POLE_H - 0.15 * SCALE, p.z], rotation: [0, p.heading, 0], scale: [ARM_W, 0.12 * SCALE, 0.12 * SCALE] }))}
      />
      <lineSegments geometry={s.wireGeo} material={MAT.wire} />
      <Part
        geometry={GEO.box}
        material={MAT.pole}
        items={s.lit.map((p) => ({ position: s.armOffset(p, 0.7 * SCALE, POLE_H * 0.72), rotation: [0, p.heading, 0], scale: [1.4 * SCALE, 0.1 * SCALE, 0.1 * SCALE] }))}
      />
      <Part
        geometry={GEO.box}
        material={MAT.bulb}
        castShadow={false}
        items={s.lit.map((p) => ({ position: s.armOffset(p, 1.35 * SCALE, POLE_H * 0.72 - 0.12 * SCALE), rotation: [0, p.heading, 0], scale: [0.6 * SCALE, 0.08 * SCALE, 0.3 * SCALE] }))}
      />
      <Part
        geometry={GEO.pool}
        material={MAT.pool}
        castShadow={false}
        items={s.lit.map((p) => ({ position: s.armOffset(p, 2.2 * SCALE, 0.12), scale: [9 * SCALE, 1, 9 * SCALE] }))}
      />

      {/* Park furniture. */}
      <Part geometry={GEO.box} material={MAT.bench} items={s.benches.map((b) => ({ position: [b.x, 0.45 * SCALE, b.z], rotation: [0, b.yaw, 0], scale: [1.8 * SCALE, 0.1 * SCALE, 0.5 * SCALE] }))} />
      <Part geometry={GEO.box} material={MAT.bench} items={s.benches.map((b) => ({ position: [b.x - Math.sin(b.yaw) * 0.25 * SCALE, 0.75 * SCALE, b.z - Math.cos(b.yaw) * 0.25 * SCALE], rotation: [0, b.yaw, 0], scale: [1.8 * SCALE, 0.5 * SCALE, 0.08 * SCALE] }))} />
      {s.swings.map((sw, i) => (
        <group key={i} position={[sw.x, 0, sw.z]}>
          {[-1, 1].map((side) => (
            <mesh key={side} geometry={GEO.box} material={MAT.frame} position={[side * 1.6 * SCALE, 1.25 * SCALE, 0]} rotation-z={side * 0.15} scale={[0.12 * SCALE, 2.6 * SCALE, 0.12 * SCALE]} castShadow />
          ))}
          <mesh geometry={GEO.box} material={MAT.frame} position={[0, 2.5 * SCALE, 0]} scale={[3.4 * SCALE, 0.12 * SCALE, 0.12 * SCALE]} castShadow />
          {[-0.7, 0.7].map((x) => (
            <group key={x} position={[x * SCALE, 2.5 * SCALE, 0]}>
              <mesh geometry={GEO.box} material={MAT.pole} position={[0, -0.9 * SCALE, 0]} scale={[0.03 * SCALE, 1.8 * SCALE, 0.03 * SCALE]} />
              <mesh geometry={GEO.box} material={MAT.seat} position={[0, -1.8 * SCALE, 0]} scale={[0.6 * SCALE, 0.06 * SCALE, 0.3 * SCALE]} castShadow />
            </group>
          ))}
        </group>
      ))}
    </group>
  )
}
