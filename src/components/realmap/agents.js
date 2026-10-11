import * as THREE from 'three'
import { player } from '../city/state.js'
import { SCALE } from './buildWorld.js'

// Wanders the road graph: at each junction it picks a random onward road
// (avoiding U-turns where possible). Keeps to the left edge of the lane, as
// traffic does in India, and waits or sidesteps when the player is in the way.
export function graphWanderer(graph, rand, { speed, edge = 0.8, pauseChance = 0, pauseTime = [2, 6], onPlayer = 'wait', mainRoads = false }) {
  const usable = graph.filter((n) => n.links.some((l) => mainRoads || !l.road.main))
  let from = usable[Math.floor(rand() * usable.length)] ?? graph[0]
  let link = pick(from, null)
  let t = rand() * edgeLength()
  let pause = 0
  let lateral = 0
  let current = 0

  function pick(node, cameFrom) {
    const options = node.links.filter((l) => (mainRoads || !l.road.main) && l.to !== cameFrom)
    const pool = options.length ? options : node.links
    return pool[Math.floor(rand() * pool.length)]
  }
  function edgeLength() {
    return Math.hypot(link.to.x - from.x, link.to.z - from.z) || 0.001
  }

  return (dt, pose) => {
    const len = edgeLength()
    const dx = (link.to.x - from.x) / len
    const dz = (link.to.z - from.z) / len

    // Who/what is just ahead of us?
    const px = player.position.x - pose.x
    const pz = player.position.z - pose.z
    const ahead = px * dx + pz * dz
    const side = px * -dz + pz * dx
    const blocked = ahead > 0 && ahead < 3.5 * SCALE && Math.abs(side) < 1.4 * SCALE

    let target = pause > 0 ? 0 : speed
    if (blocked && onPlayer === 'wait') target = 0
    current = THREE.MathUtils.damp(current, target, 4, dt)
    if (pause > 0) pause -= dt
    else if (pauseChance && rand() < pauseChance * dt) pause = pauseTime[0] + rand() * (pauseTime[1] - pauseTime[0])

    t += current * dt
    while (t >= edgeLength()) {
      t -= edgeLength()
      const prev = from
      from = link.to
      link = pick(from, prev)
    }

    // Offset from the centre line towards the left edge (-right normal).
    const halfWidth = link.road.width / 2
    const dodge = blocked && onPlayer === 'dodge' ? -Math.sign(side || 1) * 1.2 * SCALE : 0
    lateral = THREE.MathUtils.damp(lateral, -(halfWidth - edge * SCALE) + dodge, 3, dt)
    const nl = edgeLength()
    const ux = (link.to.x - from.x) / nl
    const uz = (link.to.z - from.z) / nl
    pose.x = from.x + ux * t + -uz * lateral
    pose.z = from.z + uz * t + ux * lateral
    pose.y = 0
    pose.heading = THREE.MathUtils.damp(pose.heading, pose.heading + shortestAngle(pose.heading, Math.atan2(ux, uz)), 8, dt)
    pose.speed = current
  }
}

export function shortestAngle(from, to) {
  const diff = (to - from) % (Math.PI * 2)
  return ((diff + Math.PI * 3) % (Math.PI * 2)) - Math.PI
}
