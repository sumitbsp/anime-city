// City layout: one long main street running along z, crossed by side streets
// at regular intervals. Everything else (buildings, props, traffic) is placed
// relative to these numbers.

export const ROAD_HALF_WIDTH = 4.5
export const LANE_X = 2.2
export const SIDEWALK_WIDTH = 3.5
export const FRONTAGE_X = ROAD_HALF_WIDTH + SIDEWALK_WIDTH
export const ROAD_START_Z = 52
export const ROAD_END_Z = -232

// Side streets: same road + sidewalk widths as the main street.
export const CROSS_HALF_WIDTH = ROAD_HALF_WIDTH
export const CROSS_CORRIDOR = CROSS_HALF_WIDTH + SIDEWALK_WIDTH
export const CROSS_STREET_REACH = 70
export const INTERSECTIONS = [24, -20, -64, -108, -152, -196]

// Zebra crossings sit in the side street's sidewalk band; cars stop just before them.
export const CROSSWALK_OFFSET = CROSS_HALF_WIDTH + 1.75
export const STOP_LINE_OFFSET = CROSS_CORRIDOR + 0.3

// Building blocks between side streets, as [startZ, endZ] with startZ > endZ.
export const BLOCKS = (() => {
  const edges = [ROAD_START_Z, ...INTERSECTIONS.flatMap((z) => [z + CROSS_CORRIDOR, z - CROSS_CORRIDOR]), ROAD_END_Z]
  const blocks = []
  for (let i = 0; i < edges.length; i += 2) blocks.push([edges[i], edges[i + 1]])
  return blocks.filter(([a, b]) => a - b > 6)
})()

export function nearestIntersection(z) {
  return INTERSECTIONS.reduce((best, zc) => (Math.abs(zc - z) < Math.abs(best - z) ? zc : best))
}

// Where the player may walk: the main street and its sidewalks, plus the side
// streets, never inside buildings or past the ends of the street.
export function isWalkable(x, z) {
  if (z > ROAD_START_Z - 8 || z < ROAD_END_Z + 8) return false
  if (Math.abs(x) <= FRONTAGE_X - 0.5) return true
  return Math.abs(x) <= CROSS_STREET_REACH - 10 && Math.abs(z - nearestIntersection(z)) <= CROSS_CORRIDOR - 0.5
}

export const CURB_HEIGHT = 0.14

// Height of the ground surface: raised sidewalks, roads at zero.
export function groundHeight(x, z) {
  if (Math.abs(x) < ROAD_HALF_WIDTH) return 0
  if (Math.abs(z - nearestIntersection(z)) < CROSS_HALF_WIDTH) return 0
  return CURB_HEIGHT
}
