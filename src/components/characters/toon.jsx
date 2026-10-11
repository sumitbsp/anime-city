import { Outlines } from '@react-three/drei'
import * as THREE from 'three'
import { HEAD_RADIUS, INK, surfaceZ, toonGradient } from './rig.js'

export function Toon({ color, map, outline = 3, children, ...props }) {
  return (
    <mesh castShadow {...props}>
      {children}
      <meshToonMaterial color={color} map={map} gradientMap={toonGradient} />
      {outline > 0 && <Outlines thickness={outline} color={INK} />}
    </mesh>
  )
}

export function Flat({ color, children, ...props }) {
  return (
    <mesh {...props}>
      {children}
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

function AnimeEyeball({ side, iris, irisLight }) {
  const lashArc = 2.3
  return (
    <>
      <Flat color="#ffffff" scale={[0.12, 0.16, 0.04]}>
        <sphereGeometry args={[1, 24, 16]} />
      </Flat>
      <Flat color={iris} position={[side * -0.01, -0.01, 0.02]} scale={[0.085, 0.12, 0.04]}>
        <sphereGeometry args={[1, 24, 16]} />
      </Flat>
      <Flat color={irisLight} position={[side * -0.01, -0.07, 0.045]} scale={[0.055, 0.04, 0.02]}>
        <sphereGeometry args={[1, 16, 12]} />
      </Flat>
      <Flat color="#1a1020" position={[side * -0.01, 0, 0.035]} scale={[0.045, 0.07, 0.035]}>
        <sphereGeometry args={[1, 16, 12]} />
      </Flat>
      <Flat color="#ffffff" position={[0.03, 0.05, 0.075]}>
        <sphereGeometry args={[0.028, 12, 8]} />
      </Flat>
      <Flat color="#ffffff" position={[-0.03, -0.04, 0.072]}>
        <sphereGeometry args={[0.014, 12, 8]} />
      </Flat>
      <Flat color={INK} position={[0, 0.005, 0.03]} rotation={[0, 0, Math.PI / 2 - lashArc / 2]} scale={[1, 1.25, 1]}>
        <torusGeometry args={[0.125, 0.018, 8, 24, lashArc]} />
      </Flat>
    </>
  )
}

function DotEyeball() {
  return (
    <>
      <Flat color={INK} scale={[0.055, 0.085, 0.03]}>
        <sphereGeometry args={[1, 16, 12]} />
      </Flat>
      <Flat color="#ffffff" position={[0.018, 0.035, 0.028]}>
        <sphereGeometry args={[0.016, 10, 8]} />
      </Flat>
    </>
  )
}

function CartoonEyeball({ side }) {
  return (
    <>
      <Toon color="#ffffff" outline={2} scale={[0.13, 0.17, 0.06]}>
        <sphereGeometry args={[1, 24, 16]} />
      </Toon>
      <Flat color={INK} position={[side * -0.025, -0.01, 0.05]} scale={[0.05, 0.065, 0.03]}>
        <sphereGeometry args={[1, 16, 12]} />
      </Flat>
      <Flat color="#ffffff" position={[side * -0.01, 0.015, 0.075]}>
        <sphereGeometry args={[0.014, 10, 8]} />
      </Flat>
    </>
  )
}

// look: 'anime' (big glossy iris), 'dot' (classic toy/kids-TV dot eyes) or
// 'cartoon' (big white eyes with a black pupil).
export function Eye({
  side,
  eyeRef,
  look = 'anime',
  x = 0.22,
  y = -0.02,
  radius = HEAD_RADIUS,
  size = 1,
  iris,
  irisLight,
  brow,
  browY = 0.24,
  browTilt = -0.12,
}) {
  const ex = x * side
  const z = surfaceZ(ex, y, radius)

  return (
    <group position={[ex, y, z + 0.01]} rotation={[0, Math.atan2(ex, z), 0]} scale={size}>
      <group ref={eyeRef}>
        {look === 'anime' && <AnimeEyeball side={side} iris={iris} irisLight={irisLight} />}
        {look === 'dot' && <DotEyeball />}
        {look === 'cartoon' && <CartoonEyeball side={side} />}
      </group>
      {brow && (
        <Flat color={brow} position={[side * 0.01, browY, 0.02]} rotation={[0, 0, side * browTilt]}>
          <boxGeometry args={[0.16, 0.03, 0.02]} />
        </Flat>
      )}
    </group>
  )
}

export function Mouth({ y = -0.28, radius = HEAD_RADIUS, width = 0.055, thickness = 0.011, frown = false, color = INK }) {
  const z = surfaceZ(0, y, radius)
  return (
    <Flat color={color} position={[0, y, z + 0.005]} rotation={[Math.atan2(-y, z), 0, frown ? 0 : Math.PI]}>
      <torusGeometry args={[width, thickness, 8, 16, Math.PI]} />
    </Flat>
  )
}

export function Blush({ x = 0.33, y = -0.15, radius = HEAD_RADIUS, size = 0.055, color = '#ff7aa2', opacity = 0.45 }) {
  return [-1, 1].map((side) => (
    <mesh
      key={side}
      position={[side * x, y, surfaceZ(x, y, radius) + 0.01]}
      rotation={[0.3, side * 0.6, 0]}
      scale={[1.5, 1, 1]}
    >
      <circleGeometry args={[size, 24]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  ))
}

export function Spikes({ spikes, color }) {
  return spikes.map((s, i) => (
    <Toon key={i} color={color} position={s.position} quaternion={s.quaternion}>
      <coneGeometry args={[s.radius, s.length, 8]} />
    </Toon>
  ))
}

// Hair shell covering the crown and back of the head.
export function HairDome({ color, radius = 0.64, tilt = -0.6, coverage = 0.55 }) {
  return (
    <Toon color={color} position={[0, 0.04, -0.03]} rotation={[tilt, 0, 0]}>
      <sphereGeometry args={[radius, 40, 24, 0, Math.PI * 2, 0, Math.PI * coverage]} />
    </Toon>
  )
}

// Wraps a character with the summoning ring and the animated root group.
export function CharacterStage({ rig, ringColor, children, ...props }) {
  const { ring, root } = rig
  return (
    <group {...props}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.85, 1, 6, 1]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.9} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <group ref={root} scale={0.0001}>
        {children}
      </group>
    </group>
  )
}
