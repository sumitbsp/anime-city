import { useRef } from 'react'
import Humanoid, { HumanHead } from './Humanoid.jsx'
import { bangSpikes, useCharacterRig } from './rig.js'
import { HairDome, Spikes, Toon } from './toon.jsx'

const COLORS = {
  skin: '#ffdcc4',
  hair: '#8b4a1f',
  hat: '#2563eb',
  hatBand: '#3b82f6',
  bell: '#facc15',
  shirt: '#dc2626',
  shorts: '#1d4ed8',
  neckerchief: '#facc15',
  shoes: '#dc2626',
}

const BANGS = bangSpikes({
  xs: [-0.36, -0.14, 0.12, 0.34],
  lengths: [0.22, 0.18, 0.18, 0.22],
  baseY: 0.34,
  radius: 0.1,
})

// Noddy's tall floppy blue hat with the bell on the tip.
function Hat({ tipRef }) {
  return (
    <group position={[0, 0.3, -0.03]} rotation={[-0.25, 0, 0]}>
      <Toon color={COLORS.hatBand} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.07, 10, 32]} />
      </Toon>
      <Toon color={COLORS.hat} position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.26, 0.57, 0.7, 28]} />
      </Toon>
      <group ref={tipRef} position={[0, 0.68, 0]} rotation={[0, 0, -0.8]}>
        <Toon color={COLORS.hat} position={[0, 0.33, 0]}>
          <coneGeometry args={[0.26, 0.7, 24]} />
        </Toon>
        <Toon color={COLORS.bell} position={[0, 0.72, 0]}>
          <sphereGeometry args={[0.11, 16, 12]} />
        </Toon>
      </group>
    </group>
  )
}

function Neckerchief() {
  return (
    <group>
      <Toon color={COLORS.neckerchief} position={[0, 1.86, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2, 0.07, 10, 24]} />
      </Toon>
      <Toon color={COLORS.neckerchief} position={[0, 1.7, 0.3]} rotation={[0.35, 0, 0]} scale={[1, 1, 0.25]}>
        <coneGeometry args={[0.16, 0.3, 3]} />
      </Toon>
    </group>
  )
}

export default function Noddy(props) {
  const hatTip = useRef()
  const rig = useCharacterRig({
    nod: 0.14,
    onFrame: (t) => {
      hatTip.current.rotation.z = -0.8 + Math.sin(t * 3) * 0.18
    },
  })

  return (
    <Humanoid
      {...props}
      rig={rig}
      ringColor={COLORS.bell}
      shorts
      colors={{
        skin: COLORS.skin,
        shirt: COLORS.shirt,
        sleeve: COLORS.shirt,
        pants: COLORS.shorts,
        shoes: COLORS.shoes,
      }}
      upperExtras={<Neckerchief />}
      head={
        <HumanHead
          rig={rig}
          skin={COLORS.skin}
          eyes={{ look: 'dot', y: 0, browY: 0.15 }}
          brow={COLORS.hair}
          browTilt={-0.2}
          nose={{ color: '#f8b4a0', size: 0.05, y: -0.1 }}
          mouth={{ width: 0.08, y: -0.27 }}
          blush={{ color: '#f43f5e', opacity: 0.75, size: 0.075 }}
        >
          <HairDome color={COLORS.hair} radius={0.615} tilt={-0.5} />
          <Spikes spikes={BANGS} color={COLORS.hair} />
          <Hat tipRef={hatTip} />
        </HumanHead>
      }
    />
  )
}
