import { useRef } from 'react'
import * as THREE from 'three'
import Humanoid, { HumanHead } from './Humanoid.jsx'
import { bangSpikes, INK, radialSpikes, useCharacterRig } from './rig.js'
import { Flat, HairDome, Spikes, Toon } from './toon.jsx'

const COLORS = {
  skin: '#ffd7b5',
  hair: '#151821',
  gi: '#f97316',
  undershirt: '#1e3a8a',
  sash: '#1d4ed8',
  boots: '#1e40af',
  bootTrim: '#dc2626',
  aura: '#fde68a',
}

const SPIKES = radialSpikes(
  [
    { polar: 0.1, count: 4, length: 0.85, radius: 0.24 },
    { polar: 0.6, count: 8, length: 0.95, radius: 0.25 },
    { polar: 1.1, count: 9, length: 0.8, radius: 0.23 },
    { polar: 1.6, count: 7, length: 0.55, radius: 0.19 },
  ],
  { sweep: new THREE.Vector3(0, 0.45, -0.25), frontCutoff: 0.7 },
)

const BANGS = bangSpikes({
  xs: [-0.36, -0.14, 0.12, 0.36],
  lengths: [0.5, 0.36, 0.3, 0.42],
  baseY: 0.42,
  radius: 0.13,
  dir: (x) => [x * 1.4, -1, 0.35],
})

function GiFront() {
  return (
    <>
      <Flat color={COLORS.undershirt} position={[0, 0.27, 0.33]} rotation={[-0.4, 0, -Math.PI / 2]}>
        <circleGeometry args={[0.17, 3]} />
      </Flat>
      <group position={[0.2, 0.06, 0.35]} rotation={[0, 0.35, 0]}>
        <Flat color="#ffffff">
          <circleGeometry args={[0.085, 24]} />
        </Flat>
        <Flat color={INK} position={[0, 0.02, 0.005]}>
          <planeGeometry args={[0.09, 0.012]} />
        </Flat>
        <Flat color={INK} position={[0, -0.005, 0.005]}>
          <planeGeometry args={[0.012, 0.1]} />
        </Flat>
        <Flat color={INK} position={[0, -0.03, 0.005]}>
          <planeGeometry args={[0.07, 0.012]} />
        </Flat>
      </group>
    </>
  )
}

function Wristband() {
  return (
    <Toon color={COLORS.sash} position={[0, -0.64, 0]}>
      <cylinderGeometry args={[0.105, 0.105, 0.14, 16]} />
    </Toon>
  )
}

function Aura({ auraRef }) {
  return (
    <mesh ref={auraRef} position={[0, 1.55, 0]} scale={[1.15, 1.9, 1]}>
      <sphereGeometry args={[1, 32, 24]} />
      <meshBasicMaterial
        color={COLORS.aura}
        transparent
        opacity={0.15}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}

export default function Goku(props) {
  const aura = useRef()
  const rig = useCharacterRig({
    armSwing: 0.04,
    onFrame: (t) => {
      const pulse = 1 + Math.sin(t * 7) * 0.025
      aura.current.scale.set(1.15 * pulse, 1.9 * pulse, pulse)
      aura.current.material.opacity = 0.12 + Math.sin(t * 5) * 0.04
    },
  })

  return (
    <Humanoid
      {...props}
      rig={rig}
      ringColor={COLORS.aura}
      sleeves="short"
      torsoWidth={1.3}
      shoulderX={0.5}
      colors={{
        skin: COLORS.skin,
        shirt: COLORS.gi,
        sleeve: COLORS.undershirt,
        belt: COLORS.sash,
        pants: COLORS.gi,
        boots: COLORS.boots,
        bootTrim: COLORS.bootTrim,
        shoes: COLORS.boots,
      }}
      torsoExtras={<GiFront />}
      armExtras={() => <Wristband />}
      lowerExtras={<Aura auraRef={aura} />}
      head={
        <HumanHead
          rig={rig}
          skin={COLORS.skin}
          eyes={{ iris: '#1f2937', irisLight: '#6b7280', browY: 0.22 }}
          brow={COLORS.hair}
          browTilt={0.28}
          mouth={{ width: 0.07, thickness: 0.013 }}
        >
          <HairDome color={COLORS.hair} radius={0.63} tilt={-0.45} coverage={0.58} />
          <Spikes spikes={SPIKES} color={COLORS.hair} />
          <Spikes spikes={BANGS} color={COLORS.hair} />
        </HumanHead>
      }
    />
  )
}
