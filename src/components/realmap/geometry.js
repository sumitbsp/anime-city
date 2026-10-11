import * as THREE from 'three'

// 2D helpers work on [x, z] pairs in world units (x east, z south).

export function polygonArea(points) {
  let a = 0
  for (let i = 0; i < points.length; i++) {
    const [x1, z1] = points[i]
    const [x2, z2] = points[(i + 1) % points.length]
    a += x1 * z2 - x2 * z1
  }
  return Math.abs(a) / 2
}

export function centroid(points) {
  const n = points.length
  return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n]
}

export function pointInPolygon(x, z, points) {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, zi] = points[i]
    const [xj, zj] = points[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside
  }
  return inside
}

// Distance from (x, z) to segment a–b, plus the closest point's parameter t.
export function segmentDistance(x, z, a, b) {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const len2 = dx * dx + dz * dz || 1e-9
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / len2))
  return { distance: Math.hypot(x - (a[0] + t * dx), z - (a[1] + t * dz)), t }
}

export function polylineDistance(x, z, points) {
  let best = Infinity
  for (let i = 0; i < points.length - 1; i++) best = Math.min(best, segmentDistance(x, z, points[i], points[i + 1]).distance)
  return best
}

export function polylineLength(points) {
  let len = 0
  for (let i = 0; i < points.length - 1; i++) len += Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1])
  return len
}

// Position and heading at distance s along a polyline (clamped to its ends).
export function samplePolyline(points, s, out = { x: 0, z: 0, heading: 0 }) {
  let remaining = Math.max(0, s)
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i]
    const [bx, bz] = points[i + 1]
    const seg = Math.hypot(bx - ax, bz - az)
    if (remaining <= seg || i === points.length - 2) {
      const t = seg > 0 ? Math.min(remaining / seg, 1) : 0
      out.x = ax + (bx - ax) * t
      out.z = az + (bz - az) * t
      out.heading = Math.atan2(bx - ax, bz - az)
      return out
    }
    remaining -= seg
  }
  return out
}

// Shift a polyline sideways; positive offset is to the right of travel.
export function offsetPolyline(points, offset) {
  return points.map((p, i) => {
    const prev = points[Math.max(i - 1, 0)]
    const next = points[Math.min(i + 1, points.length - 1)]
    const dx = next[0] - prev[0]
    const dz = next[1] - prev[1]
    const len = Math.hypot(dx, dz) || 1
    // Right-hand normal of travel direction (dx, dz) in an x-east / z-south plane.
    return [p[0] - (dz / len) * offset, p[1] + (dx / len) * offset]
  })
}

// Uniform grid for fast "what is near this point" lookups.
export class SpatialGrid {
  constructor(cell) {
    this.cell = cell
    this.cells = new Map()
  }
  key(cx, cz) {
    return `${cx},${cz}`
  }
  insert(item, minX, minZ, maxX, maxZ) {
    const c = this.cell
    for (let cx = Math.floor(minX / c); cx <= Math.floor(maxX / c); cx++) {
      for (let cz = Math.floor(minZ / c); cz <= Math.floor(maxZ / c); cz++) {
        const k = this.key(cx, cz)
        if (!this.cells.has(k)) this.cells.set(k, [])
        this.cells.get(k).push(item)
      }
    }
  }
  query(x, z) {
    return this.cells.get(this.key(Math.floor(x / this.cell), Math.floor(z / this.cell))) ?? []
  }
}

// --- Three.js geometry builders --------------------------------------------------

// Flat ribbon following a polyline, with world-space UVs so overlapping roads
// tile seamlessly. Round discs at each vertex fill the joints.
export function ribbonGeometry(points, width, y, uvScale) {
  const half = width / 2
  const positions = []
  const uvs = []
  const push = (x, z) => {
    positions.push(x, y, z)
    uvs.push(x * uvScale, z * uvScale)
  }
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i]
    const [bx, bz] = points[i + 1]
    const len = Math.hypot(bx - ax, bz - az) || 1
    const nx = (-(bz - az) / len) * half
    const nz = ((bx - ax) / len) * half
    // Counter-clockwise seen from above, so the faces point up.
    push(ax + nx, az + nz)
    push(bx + nx, bz + nz)
    push(ax - nx, az - nz)
    push(ax - nx, az - nz)
    push(bx + nx, bz + nz)
    push(bx - nx, bz - nz)
  }
  const segments = 12
  for (const [cx, cz] of points) {
    for (let k = 0; k < segments; k++) {
      const a0 = (k / segments) * Math.PI * 2
      const a1 = ((k + 1) / segments) * Math.PI * 2
      push(cx, cz)
      push(cx + Math.cos(a1) * half, cz + Math.sin(a1) * half)
      push(cx + Math.cos(a0) * half, cz + Math.sin(a0) * half)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(positions.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3))
  return geo
}

export function shapeFromPoints(points, holes = []) {
  // Shape lives in the XY plane; we map world (x, z) → shape (x, -z) so that
  // rotating by -90° about X stands extrusions up along +y.
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)))
  for (const hole of holes) shape.holes.push(new THREE.Path(hole.map(([x, z]) => new THREE.Vector2(x, -z))))
  return shape
}

// Prism from a footprint, standing on y = base. Returns the caps (top/bottom)
// and the side walls as separate geometries so they can take different materials.
export function extrudeFootprint(points, height, base = 0, holes = []) {
  const geo = new THREE.ExtrudeGeometry(shapeFromPoints(points, holes), { depth: height, bevelEnabled: false })
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, base, 0)
  return splitGroups(geo)
}

function splitGroups(geo) {
  const parts = geo.groups.map(({ start, count }) => {
    const part = new THREE.BufferGeometry()
    for (const [name, attr] of Object.entries(geo.attributes)) {
      const size = attr.itemSize
      part.setAttribute(name, new THREE.Float32BufferAttribute(attr.array.slice(start * size, (start + count) * size), size))
    }
    return part
  })
  return { caps: parts[0], sides: parts[1] }
}

// Polygon scaled towards its centroid so the result sits `inset` units inside.
export function insetPolygon(points, inset) {
  const [cx, cz] = centroid(points)
  const radius = Math.sqrt(polygonArea(points) / Math.PI)
  const k = Math.max(0.2, 1 - inset / Math.max(radius, 0.01))
  return points.map(([x, z]) => [cx + (x - cx) * k, cz + (z - cz) * k])
}

export function closestPointOnPolyline(x, z, points) {
  let best = { distance: Infinity, x, z, heading: 0 }
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const { distance, t } = segmentDistance(x, z, a, b)
    if (distance < best.distance) {
      best = { distance, x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, heading: Math.atan2(b[0] - a[0], b[1] - a[1]) }
    }
  }
  return best
}
