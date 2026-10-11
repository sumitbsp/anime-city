import { useFrame } from '@react-three/fiber'
import { Instance, Instances } from '@react-three/drei'
import * as THREE from 'three'
import { BLOCKS, CURB_HEIGHT, FRONTAGE_X, INTERSECTIONS, LANE_X, ROAD_HALF_WIDTH, STOP_LINE_OFFSET } from '../world.js'
import { ambience } from './ambience.js'
import { mainSignal, seeded } from './state.js'
import { SOFT_GLOW, toon } from './textures.js'

const CURB_X = ROAD_HALF_WIDTH + 0.45
const LAMP_REACH = 1.7
const LAMP_HEIGHT = 5.2

const MAT = {
  metal: toon('#3c4250'),
  bulb: new THREE.MeshBasicMaterial({ color: '#ffe3a8', toneMapped: false }),
  pool: new THREE.MeshBasicMaterial({
    map: SOFT_GLOW,
    color: '#ffc477',
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }),
  pit: toon('#4a3a2c'),
  trunk: toon('#7a5230'),
  leaves: toon('#ffffff'),
  wood: toon('#a8703f'),
  bin: toon('#2f6b4f'),
  hydrant: toon('#d62828'),
  vending: toon('#ffffff'),
  vendingGlow: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
  glass: new THREE.MeshToonMaterial({ color: '#bfe3f2', transparent: true, opacity: 0.35 }),
  sign: toon('#2b6cb0'),
}

const BOX = new THREE.BoxGeometry(1, 1, 1)
const CYL = new THREE.CylinderGeometry(1, 1, 1, 10)
const CANOPY = new THREE.IcosahedronGeometry(1, 1)
const POOL = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)

const LAYOUT = (() => {
  const rand = seeded(314)
  const lamps = []
  const trees = []
  const benches = []
  const bins = []
  const hydrants = []
  const vending = []
  const busStops = []

  BLOCKS.forEach(([a, b], blockIndex) => {
    for (const side of [-1, 1]) {
      for (let z = a - 4; z > b + 2; z -= 14) {
        lamps.push({ side, z })
        if (z - 7 > b + 2) trees.push({ side, z: z - 7, size: 0.9 + rand() * 0.4, color: ['#5bbf5e', '#46a958', '#79c25a', '#3f9e6b'][Math.floor(rand() * 4)] })
      }
      const mid = (a + b) / 2
      if (blockIndex % 2 === 0 && side === 1) busStops.push({ side, z: mid })
      else benches.push({ side, z: mid + 2 + rand() * 4 })
      bins.push({ side, z: a - 1.4 })
      hydrants.push({ side, z: b + 3 })
      if (rand() < 0.65) {
        vending.push({ side, z: b + 3 + rand() * (a - b - 6), color: ['#d62828', '#1d4ed8', '#f8f8f2', '#f59e0b'][Math.floor(rand() * 4)] })
      }
    }
  })
  return { lamps, trees, benches, bins, hydrants, vending, busStops }
})()

// Instances helper: one draw call per part, each item placed in its own frame.
function Part({ geometry = BOX, material, items, castShadow = true }) {
  return (
    <Instances geometry={geometry} material={material} limit={items.length} castShadow={castShadow} receiveShadow>
      {items.map((it, i) => (
        <Instance key={i} position={it.position} rotation={it.rotation} scale={it.scale} color={it.color} />
      ))}
    </Instances>
  )
}

// Places a part relative to an item that faces the road (local +z → street).
function placed(item, x, y, z, scale, extra = {}) {
  const rot = -item.side * Math.PI / 2
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  const ox = item.x ?? item.side * CURB_X
  return {
    position: [ox + x * c + z * s, y, item.z - x * s + z * c],
    rotation: [0, rot, 0],
    scale,
    ...extra,
  }
}

function StreetLamps() {
  const { lamps } = LAYOUT
  const y = CURB_HEIGHT
  return (
    <>
      <Part geometry={CYL} material={MAT.metal} items={lamps.map((l) => placed(l, 0, y + LAMP_HEIGHT / 2, 0, [0.08, LAMP_HEIGHT, 0.08]))} />
      <Part material={MAT.metal} items={lamps.map((l) => placed(l, 0, y + LAMP_HEIGHT - 0.05, LAMP_REACH / 2, [0.08, 0.08, LAMP_REACH]))} />
      <Part material={MAT.metal} items={lamps.map((l) => placed(l, 0, y + LAMP_HEIGHT - 0.12, LAMP_REACH, [0.32, 0.16, 0.6]))} />
      <Part material={MAT.bulb} castShadow={false} items={lamps.map((l) => placed(l, 0, y + LAMP_HEIGHT - 0.22, LAMP_REACH, [0.26, 0.04, 0.46]))} />
      <Part material={MAT.pool} geometry={POOL} castShadow={false} items={lamps.map((l) => placed(l, 0, 0.17, LAMP_REACH - 0.3, [9, 1, 9]))} />
    </>
  )
}

function Trees() {
  const { trees } = LAYOUT
  const y = CURB_HEIGHT
  const at = (t) => ({ side: t.side, z: t.z, x: t.side * (ROAD_HALF_WIDTH + 1.25) })
  return (
    <>
      <Part material={MAT.pit} castShadow={false} items={trees.map((t) => placed(at(t), 0, y + 0.005, 0, [1.2, 0.02, 1.2]))} />
      <Part geometry={CYL} material={MAT.trunk} items={trees.map((t) => placed(at(t), 0, y + 1.1, 0, [0.14, 2.2, 0.14]))} />
      <Part
        geometry={CANOPY}
        material={MAT.leaves}
        items={trees.map((t) => placed(at(t), 0, y + 2.9 * t.size, 0, [1.5 * t.size, 1.3 * t.size, 1.5 * t.size], { color: t.color }))}
      />
      <Part
        geometry={CANOPY}
        material={MAT.leaves}
        items={trees.map((t) => placed(at(t), 0.4, y + 3.8 * t.size, -0.2, [0.95 * t.size, 0.85 * t.size, 0.95 * t.size], { color: t.color }))}
      />
    </>
  )
}

function Furniture() {
  const { benches, bins, hydrants, vending } = LAYOUT
  const y = CURB_HEIGHT
  const benchAt = (b) => ({ ...b, x: b.side * (FRONTAGE_X - 1.1) })
  const vendAt = (v) => ({ ...v, x: v.side * (FRONTAGE_X - 0.95) })
  return (
    <>
      <Part material={MAT.wood} items={benches.map((b) => placed(benchAt(b), 0, y + 0.45, 0, [1.8, 0.08, 0.5]))} />
      <Part material={MAT.wood} items={benches.map((b) => placed(benchAt(b), 0, y + 0.75, -0.24, [1.8, 0.45, 0.06]))} />
      <Part material={MAT.metal} items={benches.flatMap((b) => [-0.75, 0.75].map((x) => placed(benchAt(b), x, y + 0.22, 0, [0.08, 0.45, 0.45])))} />

      <Part geometry={CYL} material={MAT.bin} items={bins.map((b) => placed(b, 0, y + 0.45, 0, [0.28, 0.9, 0.28]))} />
      <Part geometry={CYL} material={MAT.hydrant} items={hydrants.map((h) => placed(h, 0, y + 0.35, 0, [0.15, 0.7, 0.15]))} />
      <Part geometry={CYL} material={MAT.hydrant} items={hydrants.map((h) => placed(h, 0, y + 0.72, 0, [0.19, 0.08, 0.19]))} />

      <Part material={MAT.vending} items={vending.map((v) => placed(vendAt(v), 0, y + 0.95, 0, [1, 1.9, 0.8], { color: v.color }))} />
      <Part material={MAT.vendingGlow} castShadow={false} items={vending.map((v) => placed(vendAt(v), -0.08, y + 1.15, 0.41, [0.62, 1.05, 0.02]))} />
    </>
  )
}

function BusStop({ side, z }) {
  const x = side * (FRONTAGE_X - 1.2)
  return (
    <group position={[x, CURB_HEIGHT, z]} rotation-y={-side * Math.PI / 2}>
      <mesh geometry={BOX} material={MAT.metal} position={[0, 2.4, 0]} scale={[3.4, 0.12, 1.5]} castShadow />
      <mesh geometry={BOX} material={MAT.glass} position={[0, 1.25, -0.65]} scale={[3.3, 2.1, 0.05]} />
      <mesh geometry={BOX} material={MAT.glass} position={[1.65, 1.25, 0]} scale={[0.05, 2.1, 1.3]} />
      {[-1.65, 1.65].map((px) => (
        <mesh key={px} geometry={BOX} material={MAT.metal} position={[px, 1.2, -0.65]} scale={[0.08, 2.4, 0.08]} />
      ))}
      <mesh geometry={BOX} material={MAT.wood} position={[0, 0.48, -0.35]} scale={[2.6, 0.08, 0.45]} />
      <mesh geometry={CYL} material={MAT.metal} position={[-2.1, 1.4, 0.5]} scale={[0.05, 2.8, 0.05]} />
      <mesh geometry={BOX} material={MAT.sign} position={[-2.1, 2.6, 0.5]} scale={[0.6, 0.6, 0.06]} />
    </group>
  )
}

// --- Traffic lights ------------------------------------------------------------

const SIGNAL_COLORS = { red: '#ff3b30', yellow: '#ffc400', green: '#2bd96b' }
const SIGNAL_MATS = {
  main: Object.fromEntries(Object.keys(SIGNAL_COLORS).map((k) => [k, new THREE.MeshBasicMaterial({ toneMapped: false })])),
  side: Object.fromEntries(Object.keys(SIGNAL_COLORS).map((k) => [k, new THREE.MeshBasicMaterial({ toneMapped: false })])),
}
const LENS = new THREE.CylinderGeometry(0.13, 0.13, 0.06, 16).rotateX(Math.PI / 2)
const SIDE_STATE = { green: 'red', yellow: 'red', red: 'green' }

function SignalHead({ mats, ...props }) {
  return (
    <group {...props}>
      <mesh geometry={BOX} material={MAT.metal} scale={[0.42, 1.2, 0.36]} castShadow />
      {['red', 'yellow', 'green'].map((k, i) => (
        <mesh key={k} geometry={LENS} material={mats[k]} position={[0, 0.38 - i * 0.38, 0.19]} />
      ))}
    </group>
  )
}

function TrafficLight({ x, z, facing }) {
  const reach = Math.abs(x) - LANE_X
  return (
    <group position={[x, CURB_HEIGHT, z]} rotation-y={facing}>
      <mesh geometry={CYL} material={MAT.metal} position={[0, 2.8, 0]} scale={[0.1, 5.6, 0.1]} castShadow />
      <mesh geometry={BOX} material={MAT.metal} position={[-reach / 2, 5.4, 0]} scale={[reach, 0.12, 0.12]} />
      <SignalHead mats={SIGNAL_MATS.main} position={[-reach, 4.75, 0]} />
      <SignalHead mats={SIGNAL_MATS.side} position={[0.25, 3.2, 0]} rotation-y={Math.PI / 2} scale={0.8} />
    </group>
  )
}

function TrafficLights() {
  useFrame(({ clock }) => {
    const main = mainSignal(clock.elapsedTime)
    const side = SIDE_STATE[main]
    for (const [group, active] of [
      ['main', main],
      ['side', side],
    ]) {
      for (const [k, mat] of Object.entries(SIGNAL_MATS[group])) {
        mat.color.set(SIGNAL_COLORS[k]).multiplyScalar(k === active ? 2.6 : 0.1)
      }
    }
  })
  return INTERSECTIONS.flatMap((zc) => [
    <TrafficLight key={`${zc}+`} x={CURB_X} z={zc + STOP_LINE_OFFSET + 0.8} facing={0} />,
    <TrafficLight key={`${zc}-`} x={-CURB_X} z={zc - STOP_LINE_OFFSET - 0.8} facing={Math.PI} />,
  ])
}

export default function StreetProps() {
  useFrame(() => {
    const lamps = ambience.lamps
    MAT.bulb.color.set('#ffe3a8').multiplyScalar(0.55 + lamps * 1.6)
    MAT.pool.opacity = lamps * 0.16
    MAT.vendingGlow.color.set('#eaf6ff').multiplyScalar(0.7 + ambience.windows * 0.9)
  })

  return (
    <group>
      <StreetLamps />
      <Trees />
      <Furniture />
      {LAYOUT.busStops.map((b, i) => (
        <BusStop key={i} {...b} />
      ))}
      <TrafficLights />
    </group>
  )
}
