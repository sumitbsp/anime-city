import kapilNagar from '../data/kapil-nagar.json'
import { buildWorld } from './realmap/buildWorld.js'
import { groundHeight, isWalkable } from './world.js'

// Every playable map. `load` builds the world once; worlds are cached.
export const MAPS = [
  {
    id: 'kapil-nagar',
    name: 'Kapil Nagar, Bilaspur',
    kind: 'real',
    load: () => buildWorld(kapilNagar),
  },
  {
    id: 'anime-city',
    name: 'Anime City',
    kind: 'city',
    load: () => ({
      meta: { name: 'Anime City', place: 'A city that never was' },
      spawn: [0, 0],
      isWalkable,
      groundHeight,
      streetAt: (x) => (Math.abs(x) < 8 ? 'Main Street' : 'Side street'),
    }),
  },
]

const worlds = new Map()

export function getWorld(id) {
  if (!worlds.has(id)) worlds.set(id, MAPS.find((m) => m.id === id).load())
  return worlds.get(id)
}
