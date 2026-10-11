import { BLOCKS } from '../world.js'
import { seeded } from './state.js'

// One manhole per block, a few of which vent steam (see Steam.jsx).
export const MANHOLES = (() => {
  const rand = seeded(23)
  return BLOCKS.map(([a, b]) => [(rand() < 0.5 ? -1 : 1) * (1 + rand() * 1.8), 0.02, b + (a - b) * (0.3 + rand() * 0.4)])
})()
