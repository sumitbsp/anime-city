import { Instance, Instances } from '@react-three/drei'
import * as THREE from 'three'
import {
  BLOCKS,
  CROSS_CORRIDOR,
  CROSS_HALF_WIDTH,
  CROSS_STREET_REACH,
  CROSSWALK_OFFSET,
  CURB_HEIGHT,
  INTERSECTIONS,
  ROAD_END_Z,
  ROAD_HALF_WIDTH,
  ROAD_START_Z,
  SIDEWALK_WIDTH,
  STOP_LINE_OFFSET,
} from '../world.js'
import { MANHOLES } from './layout.js'
import { ASPHALT_MATERIAL, SIDEWALK_MATERIAL, SIDEWALK_TILE, scaledBox, toon } from './textures.js'

const ROAD_LENGTH = ROAD_START_Z - ROAD_END_Z
const ROAD_MID_Z = (ROAD_START_Z + ROAD_END_Z) / 2
const ASPHALT_TILE = 6

const MAT = {
  ground: toon('#77787e'),
  curb: toon('#bdb6ab'),
  white: new THREE.MeshBasicMaterial({ color: '#eceae4' }),
  yellow: new THREE.MeshBasicMaterial({ color: '#f2c230' }),
  manhole: toon('#2b2d33'),
}
const PLANE = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
const DISC = new THREE.CylinderGeometry(0.45, 0.45, 0.03, 20)

function Sidewalk({ x, z, sx, sz }) {
  return (
    <mesh
      geometry={scaledBox(sx, CURB_HEIGHT, sz, SIDEWALK_TILE)}
      material={SIDEWALK_MATERIAL}
      position={[x, CURB_HEIGHT / 2, z]}
      receiveShadow
    />
  )
}

function Sidewalks() {
  const pieces = []
  const mainX = ROAD_HALF_WIDTH + SIDEWALK_WIDTH / 2
  for (const [a, b] of BLOCKS) {
    for (const side of [-1, 1]) pieces.push({ x: side * mainX, z: (a + b) / 2, sx: SIDEWALK_WIDTH, sz: a - b })
  }
  const crossLength = CROSS_STREET_REACH - ROAD_HALF_WIDTH
  for (const zc of INTERSECTIONS) {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        pieces.push({
          x: sx * (ROAD_HALF_WIDTH + crossLength / 2),
          z: zc + sz * (CROSS_HALF_WIDTH + SIDEWALK_WIDTH / 2),
          sx: crossLength,
          sz: SIDEWALK_WIDTH,
        })
      }
    }
  }
  return pieces.map((p, i) => <Sidewalk key={i} {...p} />)
}

// Curb stones along every roadside edge of the sidewalks.
function Curbs() {
  const curbs = []
  for (const [a, b] of BLOCKS) {
    for (const side of [-1, 1]) curbs.push({ position: [side * (ROAD_HALF_WIDTH + 0.08), (a + b) / 2], scale: [0.16, a - b] })
  }
  const crossLength = CROSS_STREET_REACH - ROAD_HALF_WIDTH
  for (const zc of INTERSECTIONS) {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        curbs.push({ position: [sx * (ROAD_HALF_WIDTH + crossLength / 2), zc + sz * (CROSS_HALF_WIDTH + 0.08)], scale: [crossLength, 0.16] })
      }
    }
  }
  return (
    <Instances geometry={new THREE.BoxGeometry(1, 1, 1)} material={MAT.curb} limit={curbs.length} receiveShadow>
      {curbs.map((c, i) => (
        <Instance key={i} position={[c.position[0], CURB_HEIGHT / 2 + 0.005, c.position[1]]} scale={[c.scale[0], CURB_HEIGHT + 0.01, c.scale[1]]} />
      ))}
    </Instances>
  )
}

function Markings() {
  const white = []
  const yellow = []
  const crossLength = CROSS_STREET_REACH - ROAD_HALF_WIDTH

  // Double yellow centre line on the main street, broken at intersections.
  for (const [a, b] of BLOCKS) {
    for (const x of [-0.13, 0.13]) yellow.push({ position: [x, (a + b) / 2], scale: [0.1, a - b] })
  }
  for (const zc of INTERSECTIONS) {
    // Side-street centre lines.
    for (const sx of [-1, 1]) {
      for (const dz of [-0.13, 0.13]) {
        yellow.push({ position: [sx * (ROAD_HALF_WIDTH + SIDEWALK_WIDTH + crossLength / 2), zc + dz], scale: [crossLength - SIDEWALK_WIDTH * 2, 0.1] })
      }
    }
    // Stop lines on each approach lane.
    white.push({ position: [ROAD_HALF_WIDTH / 2, zc + STOP_LINE_OFFSET], scale: [ROAD_HALF_WIDTH - 0.3, 0.4] })
    white.push({ position: [-ROAD_HALF_WIDTH / 2, zc - STOP_LINE_OFFSET], scale: [ROAD_HALF_WIDTH - 0.3, 0.4] })
    // Zebra crossings across the main street…
    for (const dz of [-CROSSWALK_OFFSET, CROSSWALK_OFFSET]) {
      for (let x = -ROAD_HALF_WIDTH + 0.6; x < ROAD_HALF_WIDTH - 0.3; x += 1.1) white.push({ position: [x, zc + dz], scale: [0.55, 2.6] })
    }
    // …and across the side streets.
    for (const sx of [-1, 1]) {
      for (let dz = -CROSS_HALF_WIDTH + 0.6; dz < CROSS_HALF_WIDTH - 0.3; dz += 1.1) {
        white.push({ position: [sx * (ROAD_HALF_WIDTH + SIDEWALK_WIDTH / 2), zc + dz], scale: [2.6, 0.55] })
      }
    }
  }

  return (
    <>
      <Instances geometry={PLANE} material={MAT.white} limit={white.length}>
        {white.map((m, i) => (
          <Instance key={i} position={[m.position[0], 0.012, m.position[1]]} scale={[m.scale[0], 1, m.scale[1]]} />
        ))}
      </Instances>
      <Instances geometry={PLANE} material={MAT.yellow} limit={yellow.length}>
        {yellow.map((m, i) => (
          <Instance key={i} position={[m.position[0], 0.012, m.position[1]]} scale={[m.scale[0], 1, m.scale[1]]} />
        ))}
      </Instances>
    </>
  )
}

export default function Streets() {
  const crossLength = CROSS_STREET_REACH * 2
  return (
    <group>
      <mesh geometry={PLANE} material={MAT.ground} position={[0, -0.02, ROAD_MID_Z]} scale={[600, 1, ROAD_LENGTH + 400]} receiveShadow />
      <mesh
        geometry={scaledBox(ROAD_HALF_WIDTH * 2, 0.02, ROAD_LENGTH, ASPHALT_TILE)}
        material={ASPHALT_MATERIAL}
        position={[0, -0.005, ROAD_MID_Z]}
        receiveShadow
      />
      {INTERSECTIONS.map((zc) => (
        <mesh
          key={zc}
          geometry={scaledBox(crossLength, 0.02, CROSS_CORRIDOR * 2, ASPHALT_TILE)}
          material={ASPHALT_MATERIAL}
          position={[0, -0.006, zc]}
          receiveShadow
        />
      ))}
      <Sidewalks />
      <Curbs />
      <Markings />
      <Instances geometry={DISC} material={MAT.manhole} limit={MANHOLES.length} receiveShadow>
        {MANHOLES.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>
    </group>
  )
}
