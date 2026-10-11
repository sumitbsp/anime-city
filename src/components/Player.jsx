import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MotionContext } from './motion.js'
import { player } from './city/state.js'

const SPEED = 2.8
const ACCELERATION = 6

const KEY_DIRECTIONS = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
}

function usePressedKeys() {
  const pressed = useRef(new Set())

  useEffect(() => {
    const keys = pressed.current
    const down = (e) => {
      if (!(e.code in KEY_DIRECTIONS) || e.target.tagName === 'SELECT') return
      e.preventDefault()
      keys.add(e.code)
    }
    const up = (e) => keys.delete(e.code)
    const clear = () => keys.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [])

  return pressed
}

const toCamera = new THREE.Vector3()

// Pull the camera in front of any wall between it and the player, and let it
// drift back out to the player's chosen zoom once the view is clear.
function keepCameraClear(camera, target, world, zoom) {
  toCamera.subVectors(camera.position, target)
  const distance = toCamera.length()
  // Any change we didn't make ourselves is the player zooming.
  if (Math.abs(distance - zoom.applied) > 1e-3) zoom.wanted = distance
  toCamera.normalize()
  const far = zoom.wanted
  const t = world.firstObstruction(
    target.x,
    target.y,
    target.z,
    target.x + toCamera.x * far,
    target.y + toCamera.y * far,
    target.z + toCamera.z * far,
  )
  const allowed = Math.max(far * t - 0.4, 1.2)
  const next = Math.min(far, zoom.applied < 0 ? allowed : Math.min(allowed, zoom.applied + 0.25))
  camera.position.copy(target).addScaledVector(toCamera, next)
  zoom.applied = next
}

function shortestAngle(from, to) {
  const diff = (to - from) % (Math.PI * 2)
  return ((diff + Math.PI * 3) % (Math.PI * 2)) - Math.PI
}

const forward = new THREE.Vector3()
const right = new THREE.Vector3()
const target = new THREE.Vector3()

// Moves its children around the city with WASD / arrow keys relative to where
// the camera is looking, turns them to face the direction of travel and drags
// the orbit camera along.
export default function Player({ world, children }) {
  const group = useRef()
  const velocity = useRef(new THREE.Vector3())
  const motion = useRef({ walk: 0, distance: 0 })
  const pressed = usePressedKeys()
  const placed = useRef(false)
  // Camera collision: the distance the player chose, and the one we last applied.
  const zoom = useRef({ wanted: 0, applied: -1 })

  useFrame(({ camera, controls }, delta) => {
    // Drop the player (and camera) at the map's starting point on the first frame.
    if (!placed.current) {
      const [sx, sz] = world.spawn
      group.current.position.set(sx, world.groundHeight(sx, sz), sz)
      camera.position.set(sx, 2.8, sz + 7.5)
      if (controls) {
        controls.target.set(sx, 1.5, sz)
        controls.update()
      }
      player.position.copy(group.current.position)
      placed.current = true
    }

    let inputX = 0
    let inputY = 0
    for (const code of pressed.current) {
      inputX += KEY_DIRECTIONS[code][0]
      inputY += KEY_DIRECTIONS[code][1]
    }

    // Map W/S onto the camera's forward direction and A/D onto its right, flattened to the ground.
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    right.set(-forward.z, 0, forward.x)
    target.copy(forward).multiplyScalar(-inputY).addScaledVector(right, inputX)
    if (target.lengthSq() > 0) target.normalize().multiplyScalar(SPEED)

    // Ease into and out of walking rather than starting/stopping instantly.
    const vel = velocity.current
    vel.x = THREE.MathUtils.damp(vel.x, target.x, ACCELERATION, delta)
    vel.z = THREE.MathUtils.damp(vel.z, target.z, ACCELERATION, delta)

    // Move each axis separately so the player slides along walls and curbs
    // of the walkable area instead of sticking to them.
    const pos = group.current.position
    const prevX = pos.x
    const prevZ = pos.z
    const nextX = pos.x + vel.x * delta
    const nextZ = pos.z + vel.z * delta
    if (world.isWalkable(nextX, pos.z)) pos.x = nextX
    else vel.x = 0
    if (world.isWalkable(pos.x, nextZ)) pos.z = nextZ
    else vel.z = 0
    // Step up onto / down off the sidewalk.
    pos.y = THREE.MathUtils.damp(pos.y, world.groundHeight(pos.x, pos.z), 18, delta)
    const dx = pos.x - prevX
    const dz = pos.z - prevZ
    const travelled = Math.hypot(dx, dz)

    const m = motion.current
    m.distance += travelled
    m.walk = THREE.MathUtils.damp(m.walk, Math.min(travelled / delta / SPEED, 1), 10, delta)

    if (target.lengthSq() > 0) {
      const facing = Math.atan2(target.x, target.z)
      group.current.rotation.y += shortestAngle(group.current.rotation.y, facing) * (1 - Math.exp(-10 * delta))
    }

    player.position.copy(pos)

    camera.position.x += dx
    camera.position.z += dz
    if (controls) {
      controls.target.x += dx
      controls.target.z += dz
      if (world.firstObstruction) keepCameraClear(camera, controls.target, world, zoom.current)
    }
  })

  return (
    <MotionContext.Provider value={motion}>
      <group ref={group}>
        {children}
      </group>
    </MotionContext.Provider>
  )
}
