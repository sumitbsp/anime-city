import { useRef } from 'react'
import * as THREE from 'three'
import Humanoid, { HumanHead } from './Humanoid.jsx'
import { bangSpikes, radialSpikes, useCharacterRig } from './rig.js'
import { Flat, HairDome, Spikes, Toon } from './toon.jsx'

const COLORS = {
  skin: '#ffe0cc',
  hair: '#2b3a8f',
  jacket: '#1f2937',
  accent: '#14b8a6',
  scarf: '#dc2626',
  pants: '#374151',
  shoes: '#f3f4f6',
}

const SPIKES = radialSpikes(
  [
    { polar: 0.15, count: 3, length: 0.55, radius: 0.2 },
    { polar: 0.7, count: 7, length: 0.6, radius: 0.2 },
    { polar: 1.25, count: 8, length: 0.55, radius: 0.18 },
    { polar: 1.8, count: 6, length: 0.42, radius: 0.16 },
  ],
  { sweep: new THREE.Vector3(0, -0.15, -0.55) },
)

const BANGS = bangSpikes({
  xs: [-0.44, -0.26, -0.09, 0.09, 0.26, 0.44],
  lengths: [0.55, 0.32, 0.26, 0.26, 0.32, 0.55],
})

function Scarf({ tailRef }) {
  return (
    <group>
      <Toon color={COLORS.scarf} position={[0, 1.9, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.27, 0.1, 12, 28]} />
      </Toon>
      <group ref={tailRef} position={[0.16, 1.88, -0.26]} rotation={[0.5, 0, -0.2]}>
        <Toon color={COLORS.scarf} position={[0, -0.32, 0]}>
          <boxGeometry args={[0.17, 0.62, 0.05]} />
        </Toon>
        <Toon color={COLORS.scarf} position={[-0.14, -0.24, -0.02]} rotation={[0, 0, 0.25]}>
          <boxGeometry args={[0.15, 0.46, 0.05]} />
        </Toon>
      </group>
    </group>
  )
}

export default function AnimeKid(props) {
  const scarfTail = useRef()
  const rig = useCharacterRig({
    onFrame: (t) => {
      scarfTail.current.rotation.x = 0.5 + Math.sin(t * 3) * 0.12
      scarfTail.current.rotation.z = -0.2 + Math.sin(t * 2.2) * 0.08
    },
  })

  return (
    <Humanoid
      {...props}
      rig={rig}
      ringColor={COLORS.accent}
      colors={{
        skin: COLORS.skin,
        shirt: COLORS.jacket,
        sleeve: COLORS.jacket,
        cuff: COLORS.accent,
        belt: COLORS.accent,
        pants: COLORS.pants,
        shoes: COLORS.shoes,
      }}
      torsoExtras={
        <Flat color={COLORS.accent} position={[0, 0.02, 0.345]}>
          <boxGeometry args={[0.03, 0.45, 0.02]} />
        </Flat>
      }
      upperExtras={<Scarf tailRef={scarfTail} />}
      head={
        <HumanHead
          rig={rig}
          skin={COLORS.skin}
          eyes={{ iris: '#f59e0b', irisLight: '#fde68a' }}
          brow={COLORS.hair}
          blush={{}}
        >
          <HairDome color={COLORS.hair} />
          <Spikes spikes={SPIKES} color={COLORS.hair} />
          <Spikes spikes={BANGS} color={COLORS.hair} />
        </HumanHead>
      }
    />
  )
}
