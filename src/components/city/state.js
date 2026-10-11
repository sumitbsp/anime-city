import * as THREE from 'three'

// Live world state shared between systems that don't render each other:
// the Player writes its position, traffic and pedestrians react to it.
export const player = { position: new THREE.Vector3() }

// Main-street signal timing (seconds). Side-street signals are the inverse.
const GREEN = 9
const YELLOW = 2.5
const RED = 7
const CYCLE = GREEN + YELLOW + RED

export function mainSignal(t) {
  const c = t % CYCLE
  if (c < GREEN) return 'green'
  if (c < GREEN + YELLOW) return 'yellow'
  return 'red'
}

// Deterministic pseudo-random numbers so the city is the same on every load.
export function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}
