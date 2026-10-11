import * as THREE from 'three'

// Lighting/atmosphere settings per time of day. The live `ambience` object eases
// toward the selected preset every frame (see stepAmbience) and every city
// component reads from it, so switching time of day cross-fades smoothly.
export const TIME_PRESETS = {
  day: {
    label: 'Day',
    skyTop: '#4f9de8',
    skyHorizon: '#cfe5f5',
    fog: '#cfe5f5',
    fogDensity: 0.0065,
    sunDir: [0.45, 0.8, 0.3],
    sunColor: '#fff3dc',
    sunIntensity: 2.6,
    sunGlow: 0.5,
    hemiSky: '#d6ecff',
    hemiGround: '#8c857a',
    hemiIntensity: 1.1,
    windows: 0.05,
    lamps: 0,
    stars: 0,
    cloud: '#ffffff',
    bloom: 0.35,
    playerLight: 0,
    birds: 1,
  },
  sunset: {
    label: 'Sunset',
    skyTop: '#4a5aa8',
    skyHorizon: '#ffae80',
    fog: '#e8a184',
    fogDensity: 0.013,
    sunDir: [-0.3, 0.17, -0.94],
    sunColor: '#ffa45c',
    sunIntensity: 2.4,
    sunGlow: 1.3,
    hemiSky: '#ffc6a3',
    hemiGround: '#5e4a6b',
    hemiIntensity: 1.0,
    windows: 0.9,
    lamps: 0.8,
    stars: 0,
    cloud: '#ffc2a6',
    bloom: 1.1,
    playerLight: 0.6,
    birds: 1,
  },
  night: {
    label: 'Night',
    skyTop: '#03050f',
    skyHorizon: '#1a2246',
    fog: '#161d3d',
    fogDensity: 0.016,
    sunDir: [0.35, 0.75, 0.25],
    sunColor: '#8fa6ff',
    sunIntensity: 0.6,
    sunGlow: 0.15,
    hemiSky: '#3c4c86',
    hemiGround: '#11131f',
    hemiIntensity: 0.65,
    windows: 1.8,
    lamps: 2.2,
    stars: 1,
    cloud: '#283152',
    bloom: 1.8,
    playerLight: 1.6,
    birds: 0,
  },
}

const COLOR_KEYS = ['skyTop', 'skyHorizon', 'fog', 'sunColor', 'hemiSky', 'hemiGround', 'cloud']
const NUMBER_KEYS = [
  'fogDensity',
  'sunIntensity',
  'sunGlow',
  'hemiIntensity',
  'windows',
  'lamps',
  'stars',
  'bloom',
  'playerLight',
  'birds',
]

function resolve(preset) {
  const out = { sunDir: new THREE.Vector3(...preset.sunDir).normalize() }
  for (const k of COLOR_KEYS) out[k] = new THREE.Color(preset[k])
  for (const k of NUMBER_KEYS) out[k] = preset[k]
  return out
}

const RESOLVED = Object.fromEntries(Object.entries(TIME_PRESETS).map(([k, p]) => [k, resolve(p)]))

export const DEFAULT_TIME = 'sunset'
export const ambience = resolve(TIME_PRESETS[DEFAULT_TIME])

export function stepAmbience(timeKey, delta) {
  const target = RESOLVED[timeKey]
  const k = 1 - Math.exp(-2.5 * delta)
  ambience.sunDir.lerp(target.sunDir, k).normalize()
  for (const key of COLOR_KEYS) ambience[key].lerp(target[key], k)
  for (const key of NUMBER_KEYS) ambience[key] += (target[key] - ambience[key]) * k
}
