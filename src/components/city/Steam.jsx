import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ambience } from './ambience.js'
import { MANHOLES } from './layout.js'
import { SOFT_GLOW } from './textures.js'

const PUFFS_PER_VENT = 6
const LIFETIME = 4
const WHITE = new THREE.Color('#ffffff')

// Soft puffs rising and spreading from street vents, tinted by the sky.
function Vent({ position, seed }) {
  const sprites = useRef([])
  const materials = useMemo(
    () =>
      Array.from(
        { length: PUFFS_PER_VENT },
        () => new THREE.SpriteMaterial({ map: SOFT_GLOW, transparent: true, depthWrite: false, opacity: 0 }),
      ),
    [],
  )

  useFrame(({ clock }) => {
    const tint = ambience.fog
    materials.forEach((m, i) => {
      const life = ((clock.elapsedTime + seed + (i * LIFETIME) / PUFFS_PER_VENT) % LIFETIME) / LIFETIME
      const s = sprites.current[i]
      s.position.set(position[0] + Math.sin(life * 5 + i) * 0.3 * life, 0.3 + life * 3.2, position[2] + life * 0.6)
      s.scale.setScalar(0.8 + life * 2.6)
      m.opacity = Math.sin(life * Math.PI) * 0.32
      m.color.copy(tint).lerp(WHITE, 0.6)
    })
  })

  return materials.map((m, i) => <sprite key={i} ref={(el) => (sprites.current[i] = el)} material={m} />)
}

export default function Steam() {
  return MANHOLES.filter((_, i) => i % 2 === 0).map((p, i) => <Vent key={i} position={p} seed={i * 1.7} />)
}
