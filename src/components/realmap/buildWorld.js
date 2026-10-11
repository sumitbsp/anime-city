import { seeded } from '../city/state.js'
import {
  centroid,
  pointInPolygon,
  polygonArea,
  polylineDistance,
  polylineLength,
  segmentDistance,
  SpatialGrid,
} from './geometry.js'

// World units per real metre. Characters are ~3.1 units tall, so this makes
// them read as roughly person-sized next to real buildings and roads.
export const SCALE = 1.7
export const FLOOR_HEIGHT = 3.1 * SCALE

// Carriageway widths in metres by OSM road class.
const ROAD_WIDTH = { trunk: 11, trunk_link: 7, primary: 10, secondary: 8, tertiary: 7, residential: 4.2, service: 3.2, unclassified: 4.5 }
const MAIN_ROADS = new Set(['trunk', 'primary', 'secondary'])

const WALL_COLORS = ['#f6dcae', '#f4b9c4', '#a9d6ea', '#f9e38f', '#bfe3a0', '#ffd2a8', '#cfbbe0', '#f3f0e8', '#ffb3a7', '#a8e6dc']

const titleCase = (s) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())

function scalePoints(points) {
  return points.map(([x, z]) => [x * SCALE, z * SCALE])
}

function buildRoads(data) {
  return data.roads.map((r) => {
    const kind = r.tags.highway
    return {
      id: r.id,
      kind,
      name: r.tags.name ? titleCase(r.tags.name) : null,
      main: MAIN_ROADS.has(kind),
      width: (ROAD_WIDTH[kind] ?? 4) * SCALE,
      points: scalePoints(r.points),
    }
  })
}

// Chains the main-road ways (split into pieces in OSM) into continuous routes for traffic.
function chainRoutes(roads) {
  const key = ([x, z]) => `${Math.round(x)},${Math.round(z)}`
  const pieces = roads.filter((r) => r.main).map((r) => r.points)
  const routes = []
  while (pieces.length) {
    let route = pieces.shift()
    let grown = true
    while (grown) {
      grown = false
      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i]
        const [head, tail] = [key(route[0]), key(route[route.length - 1])]
        if (key(p[0]) === tail) route = [...route, ...p.slice(1)]
        else if (key(p[p.length - 1]) === tail) route = [...route, ...[...p].reverse().slice(1)]
        else if (key(p[p.length - 1]) === head) route = [...p.slice(0, -1), ...route]
        else if (key(p[0]) === head) route = [...[...p].reverse().slice(0, -1), ...route]
        else continue
        pieces.splice(i, 1)
        grown = true
        break
      }
    }
    if (polylineLength(route) > 60) routes.push(route)
  }
  return routes
}

// Graph of every road for wandering pedestrians, bikes and cows.
function buildGraph(roads) {
  const nodes = new Map()
  const node = ([x, z]) => {
    const k = `${Math.round(x * 2)},${Math.round(z * 2)}`
    if (!nodes.has(k)) nodes.set(k, { x, z, links: [] })
    return nodes.get(k)
  }
  for (const r of roads) {
    for (let i = 0; i < r.points.length - 1; i++) {
      const a = node(r.points[i])
      const b = node(r.points[i + 1])
      if (a === b) continue
      a.links.push({ to: b, road: r })
      b.links.push({ to: a, road: r })
    }
  }
  return [...nodes.values()].filter((n) => n.links.length)
}

function nearestRoad(roads, x, z) {
  let best = { road: null, distance: Infinity }
  for (const r of roads) {
    const d = polylineDistance(x, z, r.points)
    if (d < best.distance) best = { road: r, distance: d }
  }
  return best
}

function buildBuildings(data, roads, rand) {
  const buildings = []
  for (const footprint of data.buildings) {
    const points = scalePoints(footprint.points)
    const [cx, cz] = centroid(points)
    // Footprints traced from imagery sometimes straddle a road: drop those whose
    // centre, or most of whose outline, sits on the carriageway.
    const onRoad = roads.some((r) => polylineDistance(cx, cz, r.points) < r.width / 2 + 0.3 * SCALE)
    const samples = points.flatMap((p, i) => {
      const q = points[(i + 1) % points.length]
      return [p, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]]
    })
    const onCarriageway = samples.filter(([x, z]) => roads.some((r) => polylineDistance(x, z, r.points) < r.width / 2 - 0.3 * SCALE)).length
    if (onRoad || onCarriageway / samples.length > 0.3) continue

    const area = polygonArea(points) / (SCALE * SCALE)
    const nearMain = roads.filter((r) => r.main).some((r) => polylineDistance(cx, cz, r.points) < r.width / 2 + 20 * SCALE)
    const roll = rand()
    let floors
    if (footprint.height) floors = Math.max(1, Math.round(footprint.height / 3.1))
    else if (nearMain) floors = roll < 0.3 ? 2 : roll < 0.8 ? 3 : 4
    else if (area < 45) floors = roll < 0.75 ? 1 : 2
    else if (area < 160) floors = roll < 0.25 ? 1 : roll < 0.85 ? 2 : 3
    else floors = roll < 0.5 ? 2 : 3

    buildings.push({
      points,
      centre: [cx, cz],
      area,
      floors,
      height: floors * FLOOR_HEIGHT,
      color: Math.floor(rand() * WALL_COLORS.length),
      lit: Math.floor(rand() * 3),
      commercial: nearMain,
      tank: rand() < 0.75,
      stairRoom: floors >= 2 && rand() < 0.55,
      seed: rand(),
    })
  }
  return buildings
}

// Scatter trees in open ground: yards, verges and the park.
function scatterTrees(extent, isFree, parks, rand) {
  const trees = []
  const [minX, minZ, maxX, maxZ] = extent
  const tryPlace = (x, z, inPark) => {
    if (!isFree(x, z, 2.5 * SCALE)) return
    trees.push({
      x,
      z,
      kind: inPark || rand() < 0.6 ? 'neem' : 'ashoka',
      size: (0.8 + rand() * 0.6) * SCALE,
      tint: Math.floor(rand() * 4),
    })
  }
  for (let i = 0; i < 2600 && trees.length < 340; i++) tryPlace(minX + rand() * (maxX - minX), minZ + rand() * (maxZ - minZ), false)
  for (const park of parks) {
    const xs = park.points.map((p) => p[0])
    const zs = park.points.map((p) => p[1])
    for (let i = 0; i < 160; i++) {
      const x = Math.min(...xs) + rand() * (Math.max(...xs) - Math.min(...xs))
      const z = Math.min(...zs) + rand() * (Math.max(...zs) - Math.min(...zs))
      if (pointInPolygon(x, z, park.points) && rand() < 0.35) tryPlace(x, z, true)
    }
  }
  return trees
}

// Electric poles every ~32 m along one side of each road, wired together.
function placePoles(roads, isFree) {
  const poles = []
  const spacing = 32 * SCALE
  for (const r of roads) {
    if (r.kind === 'service') continue
    const line = []
    let carried = spacing / 2
    for (let i = 0; i < r.points.length - 1; i++) {
      const [ax, az] = r.points[i]
      const [bx, bz] = r.points[i + 1]
      const len = Math.hypot(bx - ax, bz - az)
      const nx = -(bz - az) / len
      const nz = (bx - ax) / len
      const off = r.width / 2 + 0.7 * SCALE
      for (let d = carried; d < len; d += spacing) {
        const x = ax + ((bx - ax) * d) / len + nx * off
        const z = az + ((bz - az) * d) / len + nz * off
        if (isFree(x, z, 0.5 * SCALE)) line.push({ x, z, heading: Math.atan2(bx - ax, bz - az) })
      }
      carried = (carried - len) % spacing
      if (carried < 0) carried += spacing
    }
    if (line.length) poles.push(line)
  }
  return poles
}

export function buildWorld(data) {
  const rand = seeded(9001)
  const extent = data.meta.extent.map((v) => v * SCALE)
  const roads = buildRoads(data)
  const areas = data.areas.map((a) => ({ id: a.id, tags: a.tags, points: scalePoints(a.points) }))
  const water = areas.filter((a) => a.tags.natural === 'water')
  const parks = areas.filter((a) => a.tags.leisure === 'park')
  const buildings = buildBuildings(data, roads, rand)

  const grid = new SpatialGrid(12 * SCALE)
  for (const b of buildings) {
    const xs = b.points.map((p) => p[0])
    const zs = b.points.map((p) => p[1])
    grid.insert(b, Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs))
  }
  const insideBuilding = (x, z) => grid.query(x, z).some((b) => pointInPolygon(x, z, b.points))
  const inWater = (x, z) => water.some((w) => pointInPolygon(x, z, w.points))
  const onRoad = (x, z, margin = 0) => roads.some((r) => polylineDistance(x, z, r.points) < r.width / 2 + margin)

  // Keep the player a few metres inside the downloaded area.
  const margin = 25 * SCALE
  const inBounds = (x, z) => x > extent[0] + margin && x < extent[2] - margin && z > extent[1] + margin && z < extent[3] - margin

  const isFree = (x, z, clearance) =>
    inBounds(x, z) &&
    !onRoad(x, z, clearance) &&
    !inWater(x, z) &&
    ![[0, 0], [clearance, 0], [-clearance, 0], [0, clearance], [0, -clearance]].some(([dx, dz]) => insideBuilding(x + dx, z + dz))

  const PLAYER_RADIUS = 0.35 * SCALE
  const isWalkable = (x, z) =>
    inBounds(x, z) &&
    !inWater(x, z) &&
    ![[0, 0], [PLAYER_RADIUS, 0], [-PLAYER_RADIUS, 0], [0, PLAYER_RADIUS], [0, -PLAYER_RADIUS]].some(([dx, dz]) =>
      insideBuilding(x + dx, z + dz),
    )

  // Start on the colony lane nearest the centre of the area (not the busy main road).
  const startRoad = roads.filter((r) => !r.main).sort((a, b) => polylineDistance(0, 0, a.points) - polylineDistance(0, 0, b.points))[0]
  let spawn = [0, 0]
  if (startRoad) {
    let best = Infinity
    for (let i = 0; i < startRoad.points.length - 1; i++) {
      const a = startRoad.points[i]
      const b = startRoad.points[i + 1]
      const { distance, t } = segmentDistance(0, 0, a, b)
      if (distance < best) {
        best = distance
        spawn = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
      }
    }
  }

  const landmarks = data.landmarks.map((l) => {
    const [x, z] = [l.point[0] * SCALE, l.point[1] * SCALE]
    const near = nearestRoad(roads, x, z)
    return { id: l.id, tags: l.tags, name: titleCase(l.tags.name), x, z, road: near.road }
  })

  // Nudge the spawn along its road until it's somewhere the player can stand.
  if (startRoad && !isWalkable(...spawn)) {
    const step = 0.5 * SCALE
    const candidates = startRoad.points.flatMap((p, i) => {
      const q = startRoad.points[i + 1]
      if (!q) return []
      const n = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / step)
      return Array.from({ length: n }, (_, k) => [p[0] + ((q[0] - p[0]) * k) / n, p[1] + ((q[1] - p[1]) * k) / n])
    })
    const ok = candidates.filter((c) => isWalkable(...c))
    if (ok.length) spawn = ok.reduce((best, c) => (Math.hypot(c[0] - spawn[0], c[1] - spawn[1]) < Math.hypot(best[0] - spawn[0], best[1] - spawn[1]) ? c : best))
  }

  return {
    meta: data.meta,
    extent,
    roads,
    areas,
    water,
    parks,
    buildings,
    landmarks,
    trees: scatterTrees(extent, isFree, parks, rand),
    poles: placePoles(roads, isFree),
    routes: chainRoutes(roads),
    graph: buildGraph(roads),
    spawn,
    isWalkable,
    groundHeight: () => 0,
    // Fraction (0–1) along the segment a→b where it first enters a building, or 1 if clear.
    firstObstruction(ax, ay, az, bx, by, bz) {
      const length = Math.hypot(bx - ax, by - ay, bz - az)
      const steps = Math.max(1, Math.ceil(length / (0.25 * SCALE)))
      for (let i = 1; i <= steps; i++) {
        const t = i / steps
        const x = ax + (bx - ax) * t
        const y = ay + (by - ay) * t
        const z = az + (bz - az) * t
        const hit = grid.query(x, z).some(
          (b) => y < b.height + 1.2 * SCALE && pointInPolygon(x, z, b.points) && !pointInPolygon(ax, az, b.points),
        )
        if (hit) return (i - 1) / steps
      }
      return 1
    },
    // Name of the street the player is on or next to, if it has one.
    streetAt(x, z) {
      const { road, distance } = nearestRoad(roads, x, z)
      if (!road || distance > road.width / 2 + 6 * SCALE) return null
      return road.name ?? (road.main ? 'Main road' : 'Colony lane')
    },
    wallColors: WALL_COLORS,
  }
}
