import * as THREE from 'three'
import { SCALE } from './buildWorld.js'
import { pointInPolygon, polylineDistance } from './geometry.js'

// The wall of a building that faces a road: its midpoint, outward normal and
// the heading that turns a local +z axis to face out of that wall.
export function frontageToward(building, road, minLength = 2.5 * SCALE) {
  const pts = building.points
  let best = null
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const length = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (length < minLength) continue
    const dir = [(b[0] - a[0]) / length, (b[1] - a[1]) / length]
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    let normal = [-dir[1], dir[0]]
    if (pointInPolygon(mid[0] + normal[0] * 0.2, mid[1] + normal[1] * 0.2, pts)) normal = [-normal[0], -normal[1]]
    const score = polylineDistance(mid[0] + normal[0] * 2 * SCALE, mid[1] + normal[1] * 2 * SCALE, road.points)
    if (!best || score < best.score) best = { a, b, mid, normal, length, score, heading: Math.atan2(normal[0], normal[1]) }
  }
  return best
}

// Matrix placing an object on a frontage: x along the wall, y up, +z out of the wall.
export function frontageMatrix(front, along, y, out, scale = [1, 1, 1]) {
  const dirX = (front.b[0] - front.a[0]) / front.length
  const dirZ = (front.b[1] - front.a[1]) / front.length
  const position = new THREE.Vector3(
    front.mid[0] + dirX * along + front.normal[0] * out,
    y,
    front.mid[1] + dirZ * along + front.normal[1] * out,
  )
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, front.heading, 0))
  return new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(...scale))
}
