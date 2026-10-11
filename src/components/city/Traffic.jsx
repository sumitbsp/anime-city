import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { INTERSECTIONS, LANE_X, ROAD_END_Z, ROAD_START_Z, STOP_LINE_OFFSET } from '../world.js'
import { ambience } from './ambience.js'
import { mainSignal, player, seeded } from './state.js'
import { SOFT_GLOW, toon } from './textures.js'

// Cars drive out of / into the landmark buildings at each end of the street.
const TRACK_START = ROAD_START_Z + 4
const TRACK_END = ROAD_END_Z - 4
const TRACK_LENGTH = TRACK_START - TRACK_END
const CARS_PER_LANE = 6

// Lane +x drives towards -z, lane -x towards +z (right-hand traffic).
const LANES = [
  { x: LANE_X, dir: -1 },
  { x: -LANE_X, dir: 1 },
]

const toZ = (lane, s) => (lane.dir < 0 ? TRACK_START - s : TRACK_END + s)
const toS = (lane, z) => (lane.dir < 0 ? TRACK_START - z : z - TRACK_END)
const wrap = (s) => ((s % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH

const BOX = new THREE.BoxGeometry(1, 1, 1)
const WHEEL = new THREE.CylinderGeometry(1, 1, 1, 16).rotateZ(Math.PI / 2)
const SPILL = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)

const MAT = {
  glass: toon('#27313f'),
  tyre: toon('#1b1b1f'),
  bumper: toon('#9aa0a8'),
  headlight: new THREE.MeshBasicMaterial({ color: '#fff6dd', toneMapped: false }),
  taxiSign: new THREE.MeshBasicMaterial({ color: '#ffb000', toneMapped: false }),
  spill: new THREE.MeshBasicMaterial({
    map: SOFT_GLOW,
    color: '#fff0c8',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }),
}
const paints = new Map()
const paint = (color) => {
  if (!paints.has(color)) paints.set(color, toon(color))
  return paints.get(color)
}

const MODELS = {
  sedan: { length: 4.2, width: 1.85, wheelR: 0.36, wheelZ: 1.35, cruise: [8, 10] },
  taxi: { length: 4.2, width: 1.85, wheelR: 0.36, wheelZ: 1.35, cruise: [8.5, 10.5] },
  van: { length: 4.9, width: 1.95, wheelR: 0.4, wheelZ: 1.6, cruise: [7, 8.5] },
  bus: { length: 9.6, width: 2.4, wheelR: 0.5, wheelZ: 3.4, cruise: [6, 7] },
}
const CAR_COLORS = ['#e63946', '#f1faee', '#457b9d', '#1d3557', '#2a9d8f', '#8d99ae', '#ffb4a2', '#6a4c93', '#264653']

function Body({ type, color }) {
  const m = MODELS[type]
  const p = paint(color)
  const half = m.length / 2
  if (type === 'bus') {
    return (
      <>
        <mesh geometry={BOX} material={p} position={[0, 1.7, 0]} scale={[m.width, 2.7, m.length]} castShadow />
        <mesh geometry={BOX} material={MAT.glass} position={[0, 2.15, 0.1]} scale={[m.width + 0.04, 0.95, m.length - 0.6]} />
        <mesh geometry={BOX} material={paint('#f1faee')} position={[0, 0.95, 0]} scale={[m.width + 0.02, 0.35, m.length + 0.02]} />
        <mesh geometry={BOX} material={MAT.taxiSign} position={[0, 2.9, half + 0.01]} scale={[1.4, 0.3, 0.04]} />
      </>
    )
  }
  if (type === 'van') {
    return (
      <>
        <mesh geometry={BOX} material={p} position={[0, 1.15, -0.2]} scale={[m.width, 1.75, m.length - 0.4]} castShadow />
        <mesh geometry={BOX} material={p} position={[0, 0.7, half - 0.4]} scale={[m.width, 0.85, 0.8]} castShadow />
        <mesh geometry={BOX} material={MAT.glass} position={[0, 1.55, half - 0.75]} scale={[m.width + 0.04, 0.6, 0.5]} />
      </>
    )
  }
  return (
    <>
      <mesh geometry={BOX} material={p} position={[0, 0.65, 0]} scale={[m.width, 0.62, m.length]} castShadow />
      <mesh geometry={BOX} material={p} position={[0, 1.2, -0.25]} scale={[m.width - 0.2, 0.55, 2.1]} castShadow />
      <mesh geometry={BOX} material={MAT.glass} position={[0, 1.2, -0.25]} scale={[m.width - 0.16, 0.36, 2.0]} />
      <mesh geometry={BOX} material={MAT.bumper} position={[0, 0.42, half]} scale={[m.width + 0.04, 0.16, 0.12]} />
      {type === 'taxi' && <mesh geometry={BOX} material={MAT.taxiSign} position={[0, 1.6, -0.25]} scale={[0.6, 0.22, 0.3]} />}
    </>
  )
}

function Vehicle({ car }) {
  const group = useRef()
  const wheels = useRef([])
  const m = MODELS[car.type]
  const half = m.length / 2

  useFrame((_, delta) => {
    const g = group.current
    g.position.set(car.lane.x, 0, toZ(car.lane, car.s))
    g.rotation.y = car.lane.dir < 0 ? Math.PI : 0
    for (const w of wheels.current) w.rotation.x += (car.speed * delta) / m.wheelR
    car.tail.color.set('#ff2a2a').multiplyScalar(car.braking ? 2.4 : 0.6 + ambience.lamps * 0.4)
  })

  return (
    <group ref={group}>
      <Body type={car.type} color={car.color} />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            ref={(el) => (wheels.current[(sx + 1) + (sz + 1) / 2] = el)}
            geometry={WHEEL}
            material={MAT.tyre}
            position={[sx * (m.width / 2 - 0.1), m.wheelR, sz * m.wheelZ]}
            scale={[0.28, m.wheelR, m.wheelR]}
          />
        )),
      )}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <mesh geometry={BOX} material={MAT.headlight} position={[sx * (m.width / 2 - 0.3), 0.75, half + 0.01]} scale={[0.34, 0.14, 0.04]} />
          <mesh geometry={BOX} material={car.tail} position={[sx * (m.width / 2 - 0.25), 0.78, -half - 0.01]} scale={[0.3, 0.14, 0.04]} />
        </group>
      ))}
      <mesh geometry={SPILL} material={MAT.spill} position={[0, 0.03, half + 3]} scale={[3.6, 1, 6]} />
    </group>
  )
}

function createCars() {
  const rand = seeded(808)
  const types = ['sedan', 'sedan', 'taxi', 'sedan', 'van', 'taxi', 'sedan', 'bus']
  return LANES.flatMap((lane, li) =>
    Array.from({ length: CARS_PER_LANE }, (_, i) => {
      const type = types[(i * 3 + li * 5) % types.length]
      const [lo, hi] = MODELS[type].cruise
      return {
        lane,
        type,
        color: type === 'taxi' ? '#ffcc00' : type === 'bus' ? '#2a9d8f' : CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)],
        length: MODELS[type].length,
        s: wrap((i / CARS_PER_LANE) * TRACK_LENGTH + rand() * 12),
        speed: 0,
        cruise: lo + rand() * (hi - lo),
        braking: false,
        tail: new THREE.MeshBasicMaterial({ color: '#ff2a2a', toneMapped: false }),
      }
    }),
  )
}

// Simple car-following model: each car aims for its cruise speed but slows
// for the car ahead, red/yellow signals at stop lines, and the player.
function stepTraffic(cars, t, delta) {
  const signal = mainSignal(t)
  for (const car of cars) {
    const lane = car.lane
    const front = car.s + car.length / 2
    let target = car.cruise

    if (signal !== 'green') {
      for (const zc of INTERSECTIONS) {
        const stop = toS(lane, zc - lane.dir * STOP_LINE_OFFSET)
        const d = stop - front
        if (d < -0.3 || d > 35) continue
        // Too close to stop safely on yellow: carry on through.
        if (signal === 'yellow' && d < 6) continue
        target = Math.min(target, Math.max(0, d - 0.5) * 0.9)
      }
    }

    for (const other of cars) {
      if (other === car || other.lane !== lane) continue
      const gap = wrap(other.s - other.length / 2 - front)
      target = Math.min(target, Math.max(0, gap - 2.2) * 1.1)
    }

    if (Math.abs(player.position.x - lane.x) < 2) {
      const gap = wrap(toS(lane, player.position.z) - front)
      if (gap < 16) target = Math.min(target, Math.max(0, gap - 1.8) * 1.2)
    }

    const change = THREE.MathUtils.clamp(target - car.speed, -10 * delta, 3 * delta)
    car.speed = Math.max(0, car.speed + change)
    car.braking = target < car.speed - 0.3 || (car.speed < 0.3 && target < 0.5)
    car.s = wrap(car.s + car.speed * delta)
  }
}

export default function Traffic() {
  const cars = useMemo(() => createCars(), [])

  useFrame(({ clock }, delta) => {
    stepTraffic(cars, clock.elapsedTime, Math.min(delta, 0.1))
    MAT.headlight.color.set('#fff6dd').multiplyScalar(0.8 + ambience.lamps * 1.4)
    MAT.spill.opacity = ambience.lamps * 0.12
  })

  return cars.map((car, i) => <Vehicle key={i} car={car} />)
}
