import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { toon } from './textures.js'

const GEO = {
  limb: new THREE.CapsuleGeometry(0.1, 0.42, 4, 10).translate(0, -0.3, 0),
  arm: new THREE.CapsuleGeometry(0.075, 0.38, 4, 8).translate(0, -0.26, 0),
  torso: new THREE.CapsuleGeometry(0.27, 0.3, 6, 14),
  skirt: new THREE.CylinderGeometry(0.26, 0.42, 0.85, 14, 1, true),
  head: new THREE.SphereGeometry(0.42, 20, 16),
  hair: new THREE.SphereGeometry(0.44, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
  eye: new THREE.SphereGeometry(0.045, 8, 6),
  shoe: new THREE.SphereGeometry(0.12, 10, 8),
  bag: new THREE.BoxGeometry(0.3, 0.32, 0.12),
  umbrella: new THREE.ConeGeometry(0.85, 0.35, 10, 1, true),
  stick: new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6),
}

const cache = new Map()
const mat = (color) => {
  if (!cache.has(color)) cache.set(color, toon(color, { side: THREE.DoubleSide }))
  return cache.get(color)
}
const INK = mat('#1a1420')

// A chibi townsperson. Movement comes from `step(dt, pose)`, which must fill
// pose.x / y / z / heading and pose.speed (used for the walk cycle).
export default function Citizen({ look, step, scale = 1 }) {
  const pose = useRef({ x: 0, y: 0, z: 0, heading: 0, speed: 0, phase: 0 })
  const root = useRef()
  const body = useRef()
  const leftLeg = useRef()
  const rightLeg = useRef()
  const leftArm = useRef()
  const rightArm = useRef()

  useFrame((_, delta) => {
    const p = pose.current
    step(Math.min(delta, 0.1), p)
    p.phase += p.speed * Math.min(delta, 0.1) * 4.2
    const walk = Math.min(p.speed / 1.2, 1)
    const swing = Math.sin(p.phase) * walk
    root.current.position.set(p.x, p.y, p.z)
    root.current.rotation.y = p.heading
    body.current.position.y = Math.abs(Math.cos(p.phase)) * 0.05 * walk
    leftLeg.current.rotation.x = swing * 0.5
    rightLeg.current.rotation.x = -swing * 0.5
    leftArm.current.rotation.x = -swing * 0.45
    rightArm.current.rotation.x = look.prop === 'umbrella' ? -0.9 : swing * 0.45
  })

  return (
    <group ref={root} scale={look.scale * scale}>
      {[-1, 1].map((side, i) => (
        <group key={side} ref={i === 0 ? leftLeg : rightLeg} position={[side * 0.13, 0.78, 0]}>
          <mesh geometry={GEO.limb} material={mat(look.skirt ? look.skin : look.bottom)} castShadow />
          <mesh geometry={GEO.shoe} material={INK} position={[0, -0.7, 0.06]} scale={[0.9, 0.6, 1.4]} />
        </group>
      ))}
      <group ref={body}>
        {look.skirt && <mesh geometry={GEO.skirt} material={mat(look.skirt)} position={[0, 0.55, 0]} castShadow />}
        <mesh geometry={GEO.torso} material={mat(look.top)} position={[0, 1.15, 0]} castShadow />
        {[-1, 1].map((side, i) => (
          <group key={side} ref={i === 0 ? leftArm : rightArm} position={[side * 0.34, 1.38, 0]} rotation-z={side * 0.12}>
            <mesh geometry={GEO.arm} material={mat(look.top)} />
            <mesh geometry={GEO.eye} material={mat(look.skin)} position={[0, -0.58, 0]} scale={2} />
            {i === 1 && look.prop === 'bag' && <mesh geometry={GEO.bag} material={mat('#8d5524')} position={[0, -0.78, 0.05]} />}
            {i === 1 && look.prop === 'umbrella' && (
              <group position={[0, -0.55, 0.1]} rotation-x={0.9}>
                <mesh geometry={GEO.stick} material={INK} position={[0, 0.55, 0]} />
                <mesh geometry={GEO.umbrella} material={mat(look.top)} position={[0, 1.2, 0]} />
              </group>
            )}
          </group>
        ))}
        <group position={[0, 1.95, 0]}>
          <mesh geometry={GEO.head} material={mat(look.skin)} castShadow />
          <mesh geometry={GEO.hair} material={mat(look.hair)} position={[0, 0.05, -0.04]} rotation-x={-0.5} />
          {[-1, 1].map((side) => (
            <mesh key={side} geometry={GEO.eye} material={INK} position={[side * 0.15, -0.02, 0.38]} scale={[1, 1.4, 0.6]} />
          ))}
        </group>
      </group>
    </group>
  )
}
