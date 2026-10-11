import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ambience } from './ambience.js'
import { player, seeded } from './state.js'
import { toon } from './textures.js'

const BODY = new THREE.SphereGeometry(0.18, 8, 6)
const WING = new THREE.BoxGeometry(0.55, 0.03, 0.22).translate(0.27, 0, 0)
const MAT = toon('#2d2f3a')

function Bird({ bird, center }) {
  const ref = useRef()
  const leftWing = useRef()
  const rightWing = useRef()

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * bird.speed + bird.offset
    const c = center.current
    const x = c.x + Math.cos(t) * bird.radius
    const z = c.z + Math.sin(t) * bird.radius * 0.7
    const y = bird.height + Math.sin(t * 2.3) * 1.2
    ref.current.position.set(x, y, z)
    // Face along the circle's tangent.
    ref.current.rotation.y = Math.atan2(-Math.sin(t), Math.cos(t) * 0.7)
    const flap = Math.sin(clock.elapsedTime * bird.flapRate + bird.offset) * 0.7
    leftWing.current.rotation.z = flap
    rightWing.current.rotation.z = Math.PI - flap
    ref.current.scale.setScalar(ambience.birds)
    ref.current.visible = ambience.birds > 0.05
  })

  return (
    <group ref={ref}>
      <mesh geometry={BODY} material={MAT} scale={[0.8, 0.7, 1.6]} />
      <mesh ref={leftWing} geometry={WING} material={MAT} />
      <mesh ref={rightWing} geometry={WING} material={MAT} />
    </group>
  )
}

// A small flock that wheels above the street, loosely following the player.
export default function Birds() {
  const center = useRef(new THREE.Vector3())
  const birds = useMemo(() => {
    const rand = seeded(55)
    return Array.from({ length: 9 }, () => ({
      radius: 9 + rand() * 9,
      height: 15 + rand() * 7,
      speed: 0.25 + rand() * 0.15,
      offset: rand() * Math.PI * 2,
      flapRate: 9 + rand() * 5,
    }))
  }, [])

  useFrame((_, delta) => {
    center.current.lerp(player.position, 1 - Math.exp(-0.4 * delta))
  })

  return birds.map((b, i) => <Bird key={i} bird={b} center={center} />)
}
