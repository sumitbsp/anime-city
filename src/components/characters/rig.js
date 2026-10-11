import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useMotion } from '../motion.js'

export const INK = '#140c1c'
export const HEAD_RADIUS = 0.6
export const APPEAR_DURATION = 1.3

const UP = new THREE.Vector3(0, 1, 0)

export const toonGradient = (() => {
  const tex = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.needsUpdate = true
  return tex
})()

export function surfaceZ(x, y, radius = HEAD_RADIUS) {
  return Math.sqrt(Math.max(radius * radius - x * x - y * y, 0.0001))
}

export function coneTransform(base, dir, length) {
  const d = dir.clone().normalize()
  return {
    position: base.clone().addScaledVector(d, length / 2).toArray(),
    quaternion: new THREE.Quaternion().setFromUnitVectors(UP, d).toArray(),
  }
}

// Cone spikes radiating from the scalp in rings, swept by `sweep`. Front-facing
// spikes are skipped so the face stays clear.
export function radialSpikes(rings, { sweep, baseRadius = 0.5, frontCutoff = 0.55 }) {
  const spikes = []
  rings.forEach(({ polar, count, length, radius }, ringIndex) => {
    for (let i = 0; i < count; i++) {
      const phi = (i / count) * Math.PI * 2 + ringIndex * 0.4
      const frontness = Math.cos(phi)
      if (polar > 0.5 && frontness > frontCutoff) continue
      if (polar > 1.5 && frontness > 0) continue

      const radial = new THREE.Vector3(
        Math.sin(polar) * Math.sin(phi),
        Math.cos(polar),
        Math.sin(polar) * Math.cos(phi),
      )
      const base = radial.clone().multiplyScalar(baseRadius)
      const dir = radial.clone().add(sweep)
      spikes.push({ ...coneTransform(base, dir, length), length, radius })
    }
  })
  return spikes
}

// Fringe spikes hanging down over the forehead.
export function bangSpikes({ xs, lengths, baseY = 0.4, radius = 0.12, surface = 0.62, dir = (x) => [x * 0.5, -1, 0.3] }) {
  return xs.map((x, i) => {
    const base = new THREE.Vector3(x, baseY, surfaceZ(x, baseY, surface) + 0.02)
    return { ...coneTransform(base, new THREE.Vector3(...dir(x, i)), lengths[i]), length: lengths[i], radius }
  })
}

export function easeOutBack(t) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

// Shared animation: spin-in appearance, breathing, looking at the pointer,
// arm sway, blinking, and a walk cycle driven by the Player's motion.
// Any ref left unattached is skipped.
//
// Walk tuning: `stride` is the peak hip swing in radians, `legLength` the
// hip-to-ground height (used so steps match distance travelled and the hips
// dip correctly), `lean` the forward body tilt, `waddle` a side-to-side rock.
export function useCharacterRig({
  onFrame,
  nod = 0,
  armSwing = 0.06,
  bob = 0.02,
  look = [0.45, 0.2],
  stride = 0.55,
  legLength = 0.85,
  lean = 0.07,
  waddle = 0,
} = {}) {
  const motion = useMotion()
  const root = useRef()
  const ring = useRef()
  const upperBody = useRef()
  const torso = useRef()
  const head = useRef()
  const leftEye = useRef()
  const rightEye = useRef()
  const leftArm = useRef()
  const rightArm = useRef()
  const leftElbow = useRef()
  const rightElbow = useRef()
  const leftLeg = useRef()
  const rightLeg = useRef()
  const leftKnee = useRef()
  const rightKnee = useRef()
  const leftFoot = useRef()
  const rightFoot = useRef()
  const elapsed = useRef(0)
  const nextBlink = useRef(2.5)
  const gaze = useRef({ x: 0, y: 0 })

  useFrame((state, delta) => {
    elapsed.current += delta
    const t = elapsed.current

    const p = Math.min(t / APPEAR_DURATION, 1)
    root.current.scale.setScalar(Math.max(easeOutBack(p), 0.0001))
    root.current.rotation.y = (1 - easeOutCubic(p)) * Math.PI * 2

    if (ring.current) {
      const ringP = Math.min(t / (APPEAR_DURATION * 1.6), 1)
      ring.current.scale.setScalar(0.4 + easeOutCubic(ringP) * 1.6)
      ring.current.material.opacity = (1 - ringP) * 0.9
      ring.current.rotation.z = t * 1.5
    }

    // One gait cycle (two steps) covers 4·L·sin(stride), so deriving the phase
    // from distance keeps the planted foot from sliding.
    const walk = motion?.current.walk ?? 0
    const cycleLength = Math.max(4 * legLength * Math.sin(stride), 1.1)
    const phase = ((motion?.current.distance ?? 0) / cycleLength) * Math.PI * 2
    const swing = Math.sin(phase)
    const idle = 1 - walk

    // Hips are lowest when the legs are spread and highest as they pass.
    root.current.position.y = -legLength * (1 - Math.cos(stride * walk * swing))
    root.current.rotation.z = swing * waddle * walk

    if (upperBody.current) {
      const ub = upperBody.current
      ub.userData.baseY ??= ub.position.y
      ub.position.y = ub.userData.baseY + Math.sin(t * 2) * bob * idle
      ub.rotation.x = lean * walk
      // Shoulders counter-rotate against the hips.
      ub.rotation.y = swing * 0.12 * walk
    }
    if (torso.current) torso.current.scale.y = 1 + Math.sin(t * 2) * 0.012

    // Right leg leads at phase 0, left is half a cycle behind. Forward is -x rotation.
    const legs = [
      [leftLeg, leftKnee, leftFoot, phase + Math.PI],
      [rightLeg, rightKnee, rightFoot, phase],
    ]
    for (const [leg, knee, foot, q] of legs) {
      const hip = -Math.sin(q) * stride * walk
      // The knee folds while the leg swings through (cos q > 0) and stays
      // nearly straight while the foot is planted.
      const kneeBend = (0.08 + Math.pow(Math.max(Math.cos(q), 0), 2) * stride * 1.8) * walk
      if (leg.current) leg.current.rotation.x = hip
      if (knee.current) knee.current.rotation.x = kneeBend
      // Keep the sole roughly level, leaving a little heel-strike / toe-off roll.
      if (foot.current) foot.current.rotation.x = -(hip + kneeBend) * 0.85
    }

    if (head.current) {
      const g = gaze.current
      g.y = THREE.MathUtils.damp(g.y, state.pointer.x * look[0], 4, delta)
      g.x = THREE.MathUtils.damp(g.x, -state.pointer.y * look[1], 4, delta)
      head.current.rotation.y = g.y - swing * 0.08 * walk
      head.current.rotation.x = g.x + Math.max(Math.sin(t * 3), 0) * nod - lean * walk * 0.8
      head.current.rotation.z = Math.sin(t * 1.3) * 0.03
    }

    // Arms swing opposite to the legs, elbows bend more on the forward swing.
    const sway = Math.sin(t * 2) * armSwing * idle
    const armAmp = stride * 0.8 * walk
    if (leftArm.current) leftArm.current.rotation.x = sway - swing * armAmp
    if (rightArm.current) rightArm.current.rotation.x = -sway + swing * armAmp
    if (leftElbow.current) leftElbow.current.rotation.x = -(0.25 + Math.max(swing, 0) * 0.5) * walk
    if (rightElbow.current) rightElbow.current.rotation.x = -(0.25 + Math.max(-swing, 0) * 0.5) * walk

    if (leftEye.current && rightEye.current && t > nextBlink.current) {
      const b = (t - nextBlink.current) / 0.16
      const openness = b < 1 ? Math.abs(1 - 2 * b) : 1
      leftEye.current.scale.y = rightEye.current.scale.y = Math.max(openness, 0.08)
      if (b >= 1) nextBlink.current = t + 2 + Math.random() * 3
    }

    onFrame?.(t, delta, state)
  })

  return {
    root,
    ring,
    upperBody,
    torso,
    head,
    leftEye,
    rightEye,
    leftArm,
    rightArm,
    leftElbow,
    rightElbow,
    leftLeg,
    rightLeg,
    leftKnee,
    rightKnee,
    leftFoot,
    rightFoot,
  }
}
