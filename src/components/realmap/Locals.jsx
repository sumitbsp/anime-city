import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Citizen from '../city/Citizen.jsx'
import { PALETTES, randomLook } from '../city/citizenLooks.js'
import { seeded } from '../city/state.js'
import { toon } from '../city/textures.js'
import { graphWanderer } from './agents.js'
import { SCALE } from './buildWorld.js'
import { closestPointOnPolyline } from './geometry.js'

const PEOPLE = 26
const WANDERING_COWS = 5
const RESTING_COWS = 4
// Townsfolk are modelled in the old city's units; this makes them person-sized here.
const PERSON_SCALE = 1.25

const COW = {
  hide: toon('#ece6da'),
  patch: toon('#c9bba4'),
  horn: toon('#d8c9a3'),
  dark: toon('#2b2622'),
  nose: toon('#d9a5a0'),
}
const BOX = new THREE.BoxGeometry(1, 1, 1)
const SPHERE = new THREE.SphereGeometry(1, 14, 10)
const LEG = new THREE.CylinderGeometry(0.07, 0.06, 0.75, 8).translate(0, -0.375, 0)
const HORN = new THREE.ConeGeometry(0.05, 0.28, 8)

// Indian street cow (Bos indicus): pale hide, shoulder hump, upturned horns.
function CowModel({ legsRef, headRef, tailRef, lying }) {
  const legY = lying ? 0.62 : 0.82
  return (
    <group scale={SCALE}>
      <group position={[0, lying ? -0.5 : 0, 0]}>
        <mesh geometry={SPHERE} material={COW.hide} position={[0, 1.05, 0]} scale={[0.42, 0.42, 0.95]} castShadow />
        <mesh geometry={SPHERE} material={COW.patch} position={[0.05, 1.12, -0.35]} scale={[0.36, 0.3, 0.4]} />
        <mesh geometry={SPHERE} material={COW.hide} position={[0, 1.42, 0.55]} scale={[0.22, 0.2, 0.25]} castShadow />
        <mesh geometry={SPHERE} material={COW.hide} position={[0, 0.88, 0.62]} scale={[0.14, 0.24, 0.2]} />
        <group ref={headRef} position={[0, 1.25, 0.95]}>
          <mesh geometry={SPHERE} material={COW.hide} position={[0, 0, 0.12]} scale={[0.2, 0.22, 0.32]} castShadow />
          <mesh geometry={SPHERE} material={COW.nose} position={[0, -0.08, 0.4]} scale={[0.13, 0.11, 0.08]} />
          {[-1, 1].map((s) => (
            <group key={s}>
              <mesh geometry={HORN} material={COW.horn} position={[s * 0.12, 0.25, 0.02]} rotation={[0.2, 0, -s * 0.5]} />
              <mesh geometry={SPHERE} material={COW.hide} position={[s * 0.25, 0.06, -0.02]} scale={[0.14, 0.05, 0.07]} rotation-z={s * 0.4} />
              <mesh geometry={SPHERE} material={COW.dark} position={[s * 0.13, 0.06, 0.28]} scale={0.03} />
            </group>
          ))}
        </group>
        {[
          [-0.22, 0.55],
          [0.22, 0.55],
          [-0.22, -0.6],
          [0.22, -0.6],
        ].map(([x, z], i) => (
          <group key={i} ref={legsRef ? (el) => (legsRef.current[i] = el) : undefined} position={[x, legY, z]} rotation-x={lying ? Math.PI / 2 * (z > 0 ? -1 : 1) : 0}>
            <mesh geometry={LEG} material={COW.hide} castShadow />
            <mesh geometry={BOX} material={COW.dark} position={[0, -0.75, 0]} scale={[0.12, 0.08, 0.14]} />
          </group>
        ))}
        <group ref={tailRef} position={[0, 1.2, -0.95]}>
          <mesh geometry={BOX} material={COW.hide} position={[0, -0.35, 0]} scale={[0.04, 0.7, 0.04]} />
          <mesh geometry={SPHERE} material={COW.dark} position={[0, -0.72, 0]} scale={[0.06, 0.12, 0.06]} />
        </group>
      </group>
    </group>
  )
}

function WanderingCow({ step }) {
  const root = useRef()
  const head = useRef()
  const tail = useRef()
  const legs = useRef([])
  const pose = useRef({ x: 0, y: 0, z: 0, heading: 0, speed: 0, phase: 0 })

  useFrame(({ clock }, delta) => {
    const p = pose.current
    step(Math.min(delta, 0.1), p)
    p.phase += p.speed * Math.min(delta, 0.1) * 2.2
    root.current.position.set(p.x, 0, p.z)
    root.current.rotation.y = p.heading
    const walk = Math.min(p.speed / (0.5 * SCALE), 1)
    // Diagonal pairs move together: front-left with back-right, front-right with back-left.
    legs.current.forEach((leg, i) => (leg.rotation.x = Math.sin(p.phase + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.35 * walk))
    // Grazing nod when standing still, gentle bob when walking.
    head.current.rotation.x = walk < 0.2 ? 0.5 + Math.sin(clock.elapsedTime * 1.3) * 0.15 : Math.sin(p.phase * 2) * 0.05
    tail.current.rotation.z = Math.sin(clock.elapsedTime * 2.1) * 0.35
  })

  return (
    <group ref={root}>
      <CowModel legsRef={legs} headRef={head} tailRef={tail} />
    </group>
  )
}

function RestingCow({ x, z, heading }) {
  const head = useRef()
  const tail = useRef()
  useFrame(({ clock }) => {
    // Chewing the cud.
    head.current.rotation.y = Math.sin(clock.elapsedTime * 0.4) * 0.35
    head.current.position.y = 1.25 + Math.sin(clock.elapsedTime * 6) * 0.01
    tail.current.rotation.z = Math.sin(clock.elapsedTime * 1.4) * 0.3
  })
  return (
    <group position={[x, 0, z]} rotation-y={heading}>
      <CowModel headRef={head} tailRef={tail} lying />
    </group>
  )
}

function createLocals(world) {
  const rand = seeded(4242)
  const people = Array.from({ length: PEOPLE }, () => ({
    look: randomLook(rand, PALETTES.bilaspur),
    step: graphWanderer(world.graph, rand, { speed: (1.1 + rand() * 0.5) * PERSON_SCALE, edge: 0.6, onPlayer: 'dodge', pauseChance: 0.02, pauseTime: [1, 4] }),
  }))
  const cows = Array.from({ length: WANDERING_COWS }, () => ({
    step: graphWanderer(world.graph, rand, { speed: 0.45 * SCALE, edge: 1.2, onPlayer: 'wait', pauseChance: 0.12, pauseTime: [4, 14] }),
  }))
  // Resting cows sit on the verge of a random lane.
  const lanes = world.roads.filter((r) => !r.main && r.points.length > 1)
  const resting = Array.from({ length: RESTING_COWS }, () => {
    const road = lanes[Math.floor(rand() * lanes.length)]
    const i = Math.floor(rand() * (road.points.length - 1))
    const [ax, az] = road.points[i]
    const [bx, bz] = road.points[i + 1]
    const t = rand()
    const x = ax + (bx - ax) * t
    const z = az + (bz - az) * t
    const near = closestPointOnPolyline(x, z, road.points)
    const off = road.width / 2 + 0.8 * SCALE
    return { x: x - Math.cos(near.heading) * off, z: z + Math.sin(near.heading) * off, heading: near.heading + (rand() - 0.5) * 0.8 }
  })
  return { people, cows, resting }
}

export default function Locals({ world }) {
  const locals = useMemo(() => createLocals(world), [world])
  return (
    <group>
      {locals.people.map((p, i) => (
        <Citizen key={i} look={p.look} step={p.step} scale={PERSON_SCALE} />
      ))}
      {locals.cows.map((c, i) => (
        <WanderingCow key={i} step={c.step} />
      ))}
      {locals.resting.map((c, i) => (
        <RestingCow key={i} {...c} />
      ))}
    </group>
  )
}
