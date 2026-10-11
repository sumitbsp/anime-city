import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ambience } from '../city/ambience.js'
import { player, seeded } from '../city/state.js'
import { SOFT_GLOW, toon } from '../city/textures.js'
import { graphWanderer } from './agents.js'
import { SCALE } from './buildWorld.js'
import { offsetPolyline, polylineLength, samplePolyline } from './geometry.js'

const LANE_SCOOTERS = 6

const BOX = new THREE.BoxGeometry(1, 1, 1)
const WHEEL = new THREE.CylinderGeometry(1, 1, 1, 14).rotateZ(Math.PI / 2)
const SPHERE = new THREE.SphereGeometry(1, 12, 10)
const SPILL = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)

const paints = new Map()
const paint = (c) => {
  if (!paints.has(c)) paints.set(c, toon(c))
  return paints.get(c)
}
const MAT = {
  glass: toon('#2a3442'),
  tyre: toon('#1b1b1f'),
  canopy: toon('#1c1c1e'),
  skin: toon('#c98e60'),
  headlight: new THREE.MeshBasicMaterial({ color: '#fff6dd', toneMapped: false }),
  spill: new THREE.MeshBasicMaterial({ map: SOFT_GLOW, color: '#fff0c8', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
}

// Model dimensions in metres; `length` is used for spacing in traffic.
const TYPES = {
  auto: { length: 2.7, cruise: [7, 9], wheel: 0.25 },
  bike: { length: 1.9, cruise: [9, 12], wheel: 0.3 },
  car: { length: 3.8, cruise: [9, 12], wheel: 0.3 },
  truck: { length: 7.6, cruise: [6, 7.5], wheel: 0.5 },
}
const MIX = ['auto', 'bike', 'car', 'bike', 'auto', 'truck', 'bike', 'car', 'auto', 'bike']
const CAR_COLORS = ['#f1faee', '#c0c4c9', '#e63946', '#1d3557', '#8d99ae', '#f4a261']
const BIKE_COLORS = ['#1d1d1f', '#c1121f', '#1d4ed8', '#e9ecef', '#2b9348']
const HELMETS = ['#ffd166', '#ef476f', '#118ab2', '#f8f9fa', '#073b4c']

function Wheel({ i, x, z, r, width = 0.22, wheels }) {
  return <mesh ref={(el) => wheels(i, el)} geometry={WHEEL} material={MAT.tyre} position={[x, r, z]} scale={[width, r, r]} />
}

function AutoRickshaw({ wheels, tail }) {
  return (
    <>
      <mesh geometry={BOX} material={paint('#f6c90e')} position={[0, 0.6, -0.2]} scale={[1.3, 0.6, 2.2]} castShadow />
      <mesh geometry={BOX} material={paint('#2a9d5c')} position={[0, 1.05, 0.95]} scale={[0.95, 1.1, 0.4]} castShadow />
      <mesh geometry={BOX} material={MAT.glass} position={[0, 1.55, 0.95]} scale={[0.9, 0.5, 0.42]} />
      <mesh geometry={BOX} material={MAT.canopy} position={[0, 1.88, -0.25]} scale={[1.36, 0.14, 2.2]} castShadow />
      <mesh geometry={BOX} material={MAT.canopy} position={[0, 1.35, -1.25]} scale={[1.3, 1.0, 0.06]} />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={BOX} material={MAT.canopy} position={[s * 0.66, 1.35, -0.75]} scale={[0.05, 1.0, 1.0]} />
      ))}
      <mesh geometry={SPHERE} material={MAT.skin} position={[0, 1.4, 0.45]} scale={0.18} />
      <mesh geometry={BOX} material={MAT.headlight} position={[0, 1.05, 1.16]} scale={[0.2, 0.14, 0.04]} />
      <mesh geometry={BOX} material={tail} position={[0, 0.7, -1.32]} scale={[0.8, 0.1, 0.04]} />
      <Wheel i={0} x={0} z={0.95} r={0.25} wheels={wheels} />
      <Wheel i={1} x={-0.58} z={-0.85} r={0.25} wheels={wheels} />
      <Wheel i={2} x={0.58} z={-0.85} r={0.25} wheels={wheels} />
    </>
  )
}

function Bike({ wheels, tail, color, helmet, shirt }) {
  return (
    <>
      <mesh geometry={BOX} material={paint(color)} position={[0, 0.62, 0]} scale={[0.28, 0.42, 1.3]} castShadow />
      <mesh geometry={BOX} material={MAT.canopy} position={[0, 0.88, -0.15]} scale={[0.3, 0.1, 0.7]} />
      <mesh geometry={BOX} material={MAT.canopy} position={[0, 1.15, 0.55]} scale={[0.7, 0.05, 0.05]} />
      <mesh geometry={BOX} material={paint(shirt)} position={[0, 1.3, -0.1]} rotation-x={0.25} scale={[0.42, 0.62, 0.3]} castShadow />
      <mesh geometry={SPHERE} material={paint(helmet)} position={[0, 1.78, 0.02]} scale={0.18} castShadow />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={BOX} material={paint('#2b2d42')} position={[s * 0.16, 0.8, 0.1]} rotation-x={-0.9} scale={[0.12, 0.55, 0.14]} />
      ))}
      <mesh geometry={BOX} material={MAT.headlight} position={[0, 1.0, 0.68]} scale={[0.14, 0.12, 0.04]} />
      <mesh geometry={BOX} material={tail} position={[0, 0.85, -0.66]} scale={[0.14, 0.08, 0.04]} />
      <Wheel i={0} x={0} z={0.65} r={0.3} width={0.1} wheels={wheels} />
      <Wheel i={1} x={0} z={-0.65} r={0.3} width={0.1} wheels={wheels} />
    </>
  )
}

function Car({ wheels, tail, color }) {
  return (
    <>
      <mesh geometry={BOX} material={paint(color)} position={[0, 0.65, 0]} scale={[1.65, 0.7, 3.8]} castShadow />
      <mesh geometry={BOX} material={paint(color)} position={[0, 1.25, -0.25]} scale={[1.5, 0.55, 2.1]} castShadow />
      <mesh geometry={BOX} material={MAT.glass} position={[0, 1.25, -0.25]} scale={[1.53, 0.36, 1.95]} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh geometry={BOX} material={MAT.headlight} position={[s * 0.55, 0.78, 1.91]} scale={[0.32, 0.14, 0.04]} />
          <mesh geometry={BOX} material={tail} position={[s * 0.6, 0.8, -1.91]} scale={[0.28, 0.14, 0.04]} />
        </group>
      ))}
      {[-1, 1].flatMap((sx, a) => [-1, 1].map((sz, b) => <Wheel key={`${sx}${sz}`} i={a * 2 + b} x={sx * 0.74} z={sz * 1.25} r={0.3} wheels={wheels} />))}
    </>
  )
}

function Truck({ wheels, tail }) {
  return (
    <>
      <mesh geometry={BOX} material={paint('#ff9f1c')} position={[0, 1.55, 2.85]} scale={[2.3, 2.1, 1.8]} castShadow />
      <mesh geometry={BOX} material={MAT.glass} position={[0, 2.0, 3.76]} scale={[2.0, 0.75, 0.05]} />
      <mesh geometry={BOX} material={paint('#1f7a8c')} position={[0, 2.05, -0.75]} scale={[2.4, 2.2, 5.0]} castShadow />
      <mesh geometry={BOX} material={paint('#e63946')} position={[0, 3.05, -0.75]} scale={[2.42, 0.2, 5.02]} />
      <mesh geometry={BOX} material={MAT.tyre} position={[0, 0.7, 0.3]} scale={[1.8, 0.35, 7.2]} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh geometry={BOX} material={MAT.headlight} position={[s * 0.8, 1.0, 3.76]} scale={[0.35, 0.18, 0.04]} />
          <mesh geometry={BOX} material={tail} position={[s * 0.9, 1.0, -3.26]} scale={[0.3, 0.18, 0.04]} />
        </group>
      ))}
      {[-1, 1].flatMap((sx, a) => [2.6, -1.4, -2.5].map((z, b) => <Wheel key={`${sx}${z}`} i={a * 3 + b} x={sx * 0.95} z={z} r={0.5} width={0.35} wheels={wheels} />))}
    </>
  )
}

const MODELS = { auto: AutoRickshaw, bike: Bike, car: Car, truck: Truck }

function Vehicle({ v }) {
  const group = useRef()
  const wheels = useRef([])
  const Model = MODELS[v.type]
  const registerWheel = (i, el) => {
    wheels.current[i] = el
  }

  useFrame((_, delta) => {
    group.current.position.set(v.pose.x, 0, v.pose.z)
    group.current.rotation.y = v.pose.heading
    for (const w of wheels.current) if (w) w.rotation.x += (v.speed * Math.min(delta, 0.1)) / (TYPES[v.type].wheel * SCALE)
    v.tail.color.set('#ff2a2a').multiplyScalar(v.braking ? 2.4 : 0.5 + ambience.lamps * 0.4)
  })

  return (
    <group ref={group}>
      <group scale={SCALE}>
        <Model wheels={registerWheel} tail={v.tail} color={v.color} helmet={v.helmet} shirt={v.shirt} />
        {v.type !== 'bike' && <mesh geometry={SPILL} material={MAT.spill} position={[0, 0.03, TYPES[v.type].length / 2 + 3]} scale={[3.2, 1, 5]} />}
      </group>
    </group>
  )
}

function createTraffic(world) {
  const rand = seeded(606)
  const vehicles = []
  let n = 0
  const make = (type, extra) => {
    const t = TYPES[type]
    return {
      type,
      length: t.length * SCALE,
      cruise: (t.cruise[0] + rand() * (t.cruise[1] - t.cruise[0])) * SCALE,
      speed: 0,
      braking: false,
      pose: { x: 0, z: 0, heading: 0, speed: 0 },
      tail: new THREE.MeshBasicMaterial({ color: '#ff2a2a', toneMapped: false }),
      color: type === 'bike' ? BIKE_COLORS[Math.floor(rand() * BIKE_COLORS.length)] : CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)],
      helmet: HELMETS[Math.floor(rand() * HELMETS.length)],
      shirt: ['#f4f1e8', '#2a9d8f', '#e76f51', '#457b9d', '#ffb703'][Math.floor(rand() * 5)],
      ...extra,
    }
  }

  // Main-road lanes: keep left, so each direction is offset to the left of travel.
  for (const route of world.routes) {
    const road = world.roads.find((r) => r.main)
    const laneOffset = (road?.width ?? 11 * SCALE) / 4
    for (const points of [route, [...route].reverse()]) {
      const path = offsetPolyline(points, -laneOffset)
      const length = polylineLength(path)
      const count = Math.max(3, Math.round(length / (45 * SCALE)))
      for (let i = 0; i < count; i++) {
        vehicles.push(make(MIX[n++ % MIX.length], { path, pathLength: length, s: (i / count) * length + rand() * 10 }))
      }
    }
  }

  // Scooters pottering around the colony lanes.
  for (let i = 0; i < LANE_SCOOTERS; i++) {
    vehicles.push(make('bike', { wander: graphWanderer(world.graph, rand, { speed: 5.5 * SCALE, edge: 0.9, onPlayer: 'wait' }) }))
  }
  return vehicles
}

function stepTraffic(vehicles, delta) {
  for (const v of vehicles) {
    if (v.wander) {
      v.wander(delta, v.pose)
      v.speed = v.pose.speed
      continue
    }
    const front = v.s + v.length / 2
    let target = v.cruise
    for (const o of vehicles) {
      if (o === v || o.path !== v.path) continue
      const gap = (((o.s - o.length / 2 - front) % v.pathLength) + v.pathLength) % v.pathLength
      target = Math.min(target, Math.max(0, gap - 2.5 * SCALE) * 1.1)
    }
    // Slow down for the player standing in the lane ahead.
    const dx = Math.sin(v.pose.heading)
    const dz = Math.cos(v.pose.heading)
    const px = player.position.x - v.pose.x
    const pz = player.position.z - v.pose.z
    const ahead = px * dx + pz * dz - v.length / 2
    if (ahead > -0.5 && ahead < 16 * SCALE && Math.abs(px * -dz + pz * dx) < 1.8 * SCALE) {
      target = Math.min(target, Math.max(0, ahead - 2 * SCALE) * 1.2)
    }
    const change = THREE.MathUtils.clamp(target - v.speed, -12 * SCALE * delta, 3 * SCALE * delta)
    v.speed = Math.max(0, v.speed + change)
    v.braking = target < v.speed - 0.3 || (v.speed < 0.3 && target < 0.5)
    v.s = (v.s + v.speed * delta) % v.pathLength
    samplePolyline(v.path, v.s, v.pose)
  }
}

export default function Vehicles({ world }) {
  const vehicles = useMemo(() => createTraffic(world), [world])
  useFrame((_, delta) => {
    stepTraffic(vehicles, Math.min(delta, 0.1))
    MAT.headlight.color.set('#fff6dd').multiplyScalar(0.8 + ambience.lamps * 1.4)
    MAT.spill.opacity = ambience.lamps * 0.12
  })
  return vehicles.map((v, i) => <Vehicle key={i} v={v} />)
}
