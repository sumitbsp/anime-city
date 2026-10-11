import * as THREE from 'three'
import Humanoid, { HumanHead } from './Humanoid.jsx'
import { bangSpikes, INK, radialSpikes, surfaceZ, useCharacterRig } from './rig.js'
import { Flat, HairDome, Spikes, Toon } from './toon.jsx'

const COLORS = {
  skin: '#ffd7b5',
  hair: '#151821',
  cap: '#dc2626',
  capFront: '#f8fafc',
  logo: '#16a34a',
  vest: '#2563eb',
  sleeve: '#f8fafc',
  tee: '#111827',
  gloves: '#16a34a',
  jeans: '#2f4f8f',
  shoes: '#1f2937',
}

const SPIKES = radialSpikes(
  [
    { polar: 1.3, count: 9, length: 0.42, radius: 0.15 },
    { polar: 1.75, count: 8, length: 0.38, radius: 0.14 },
  ],
  { sweep: new THREE.Vector3(0, -0.3, -0.5), frontCutoff: 0.3 },
)

// Short tufts poking out sideways from under the cap brim.
const BANGS = bangSpikes({
  xs: [-0.44, -0.3, 0.3, 0.44],
  lengths: [0.24, 0.2, 0.2, 0.24],
  baseY: 0.2,
  radius: 0.1,
  dir: (x) => [Math.sign(x) * 1.2, -0.6, 0.3],
})

function Cap() {
  return (
    <group position={[0, 0.2, -0.02]} rotation={[-0.1, 0, 0]}>
      <Toon color={COLORS.cap}>
        <sphereGeometry args={[0.64, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </Toon>
      <Toon color={COLORS.capFront} outline={0}>
        <sphereGeometry args={[0.648, 24, 16, Math.PI / 2 - 0.65, 1.3, 0.12, Math.PI / 2 - 0.12]} />
      </Toon>
      <Flat color={COLORS.logo} position={[0, 0.2, surfaceZ(0, 0.2, 0.66)]} rotation={[-0.3, 0, 0.8]}>
        <torusGeometry args={[0.08, 0.025, 8, 20, Math.PI * 1.4]} />
      </Flat>
      <Toon color={COLORS.cap} position={[0, 0, 0.02]} rotation={[0.24, 0, 0]}>
        <cylinderGeometry args={[0.95, 0.95, 0.06, 24, 1, false, -0.85, 1.7]} />
      </Toon>
    </group>
  )
}

// Ash's trademark zig-zag cheek marks.
function CheekMarks() {
  return [-1, 1].map((side) => {
    const x = side * 0.32
    const y = -0.12
    return (
      <group key={side} position={[x, y, surfaceZ(x, y) + 0.008]} rotation={[0.2, Math.atan2(x, surfaceZ(x, y)), 0]}>
        <Flat color={INK} position={[0, 0.015, 0]} rotation={[0, 0, 0.5]}>
          <planeGeometry args={[0.06, 0.01]} />
        </Flat>
        <Flat color={INK} position={[0, -0.015, 0]} rotation={[0, 0, -0.5]}>
          <planeGeometry args={[0.06, 0.01]} />
        </Flat>
      </group>
    )
  })
}

function Pokeball() {
  return (
    <group position={[0, -0.9, 0.1]} rotation={[0.3, 0, 0]}>
      <Toon color="#ef4444" outline={2}>
        <sphereGeometry args={[0.12, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </Toon>
      <Toon color="#ffffff" outline={2}>
        <sphereGeometry args={[0.12, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
      </Toon>
      <Flat color={INK} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.012, 6, 24]} />
      </Flat>
      <Toon color="#ffffff" position={[0, 0, 0.115]} rotation={[Math.PI / 2, 0, 0]} outline={2}>
        <cylinderGeometry args={[0.035, 0.035, 0.02, 16]} />
      </Toon>
    </group>
  )
}

function VestFront() {
  return (
    <Flat color={COLORS.tee} position={[0, 0.2, 0.34]} rotation={[-0.3, 0, -Math.PI / 2]}>
      <circleGeometry args={[0.2, 3]} />
    </Flat>
  )
}

export default function AshKetchum(props) {
  const rig = useCharacterRig()

  return (
    <Humanoid
      {...props}
      rig={rig}
      ringColor={COLORS.cap}
      sleeves="short"
      colors={{
        skin: COLORS.skin,
        shirt: COLORS.vest,
        sleeve: COLORS.sleeve,
        hand: COLORS.gloves,
        cuff: COLORS.gloves,
        pants: COLORS.jeans,
        shoes: COLORS.shoes,
      }}
      torsoExtras={<VestFront />}
      armExtras={(side) => side > 0 && <Pokeball />}
      head={
        <HumanHead
          rig={rig}
          skin={COLORS.skin}
          eyes={{ iris: '#5b3a1a', irisLight: '#b7791f' }}
          mouth={{ width: 0.07, thickness: 0.013 }}
        >
          <HairDome color={COLORS.hair} radius={0.62} />
          <Spikes spikes={SPIKES} color={COLORS.hair} />
          <Spikes spikes={BANGS} color={COLORS.hair} />
          <CheekMarks />
          <Cap />
        </HumanHead>
      }
    />
  )
}
