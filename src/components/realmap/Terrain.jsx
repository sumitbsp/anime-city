import { useFrame } from '@react-three/fiber'
import { Instance, Instances } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { ambience } from '../city/ambience.js'
import { SCALE } from './buildWorld.js'
import { extrudeFootprint, insetPolygon, offsetPolyline, polylineLength, ribbonGeometry, samplePolyline, shapeFromPoints } from './geometry.js'
import {
  ASPHALT_MATERIAL,
  CONCRETE_MATERIAL,
  GROUND_MATERIAL,
  GROUND_UV,
  MARKING_MATERIAL,
  PARK_MATERIAL,
  STONE_MATERIAL,
} from './materials.js'

const WATER_LEVEL = -0.6 * SCALE
// Dusty verge either side of the main road: the ground texture, a shade darker.
const SHOULDER = GROUND_MATERIAL.clone()
SHOULDER.color = new THREE.Color('#b8a47e')

// Flat polygon (with optional holes) lying on y, UVs in world space.
function flatShape(points, holes, y, uvScale) {
  const geo = new THREE.ShapeGeometry(shapeFromPoints(points, holes))
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, y, 0)
  const uv = geo.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * uvScale, uv.getY(i) * uvScale)
  return geo
}

function makeWaterMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        time: { value: 0 },
        deep: { value: new THREE.Color('#2b5f5a') },
        shallow: { value: new THREE.Color('#5c9e8a') },
        sky: { value: new THREE.Color() },
      },
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec2 vXZ;
      void main() {
        vXZ = (modelMatrix * vec4(position, 1.0)).xz;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform vec3 deep;
      uniform vec3 shallow;
      uniform vec3 sky;
      varying vec2 vXZ;
      #include <fog_pars_fragment>
      void main() {
        vec2 p = vXZ * 0.18;
        float w = sin(p.x * 1.7 + time * 1.1) * sin(p.y * 1.3 - time * 0.8) + 0.5 * sin((p.x + p.y) * 3.1 + time * 1.9);
        vec3 col = mix(deep, shallow, 0.5 + 0.25 * w);
        col = mix(col, sky, 0.28);
        col += sky * smoothstep(0.9, 1.0, 0.5 + 0.5 * w) * 0.5;
        gl_FragColor = vec4(col, 0.93);
        #include <fog_fragment>
      }
    `,
  })
}
const WATER_MATERIAL = makeWaterMaterial()

const dashGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)

function buildTerrain(world) {
  const [minX, minZ, maxX, maxZ] = world.extent
  const pad = 400
  const outline = [
    [minX - pad, minZ - pad],
    [maxX + pad, minZ - pad],
    [maxX + pad, maxZ + pad],
    [minX - pad, maxZ + pad],
  ]
  const ground = flatShape(outline, world.water.map((w) => w.points), 0, GROUND_UV)
  const parks = world.parks.length ? mergeGeometries(world.parks.map((p) => flatShape(p.points, [], 0.02, GROUND_UV))) : null

  const rims = world.water.map((w) => {
    const { caps, sides } = extrudeFootprint(insetPolygon(w.points, -1.4 * SCALE), 1.4 * SCALE, -1.2 * SCALE, [w.points])
    return mergeGeometries([caps, sides])
  })
  const water = world.water.map((w) => flatShape(w.points, [], WATER_LEVEL, 1))

  const byMaterial = { asphalt: [], concrete: [], shoulder: [], lines: [] }
  for (const r of world.roads) {
    if (r.main) {
      byMaterial.shoulder.push(ribbonGeometry(r.points, r.width + 3.5 * SCALE, 0.015, GROUND_UV))
      byMaterial.asphalt.push(ribbonGeometry(r.points, r.width, 0.06, GROUND_UV))
      for (const side of [-1, 1]) byMaterial.lines.push(ribbonGeometry(offsetPolyline(r.points, side * (r.width / 2 - 0.5 * SCALE)), 0.15 * SCALE, 0.07, 1))
    } else if (r.kind === 'tertiary' || r.kind === 'trunk_link') {
      byMaterial.asphalt.push(ribbonGeometry(r.points, r.width, 0.05, GROUND_UV))
    } else {
      byMaterial.concrete.push(ribbonGeometry(r.points, r.width, 0.03, GROUND_UV))
    }
  }
  const merged = Object.fromEntries(Object.entries(byMaterial).map(([k, list]) => [k, list.length ? mergeGeometries(list) : null]))

  // Dashed centre line along each main-road route.
  const dashes = []
  const step = 7 * SCALE
  for (const route of world.routes) {
    const len = polylineLength(route)
    for (let s = step / 2; s < len; s += step) {
      const p = samplePolyline(route, s)
      dashes.push({ position: [p.x, 0.07, p.z], rotation: [0, p.heading, 0] })
    }
  }

  return { ground, parks, rims, water, roads: merged, dashes }
}

const cache = new WeakMap()

export default function Terrain({ world }) {
  if (!cache.has(world)) cache.set(world, buildTerrain(world))
  const t = cache.get(world)

  useFrame(({ clock }) => {
    WATER_MATERIAL.uniforms.time.value = clock.elapsedTime
    WATER_MATERIAL.uniforms.sky.value.copy(ambience.skyHorizon)
  })

  return (
    <group>
      <mesh geometry={t.ground} material={GROUND_MATERIAL} receiveShadow />
      {t.parks && <mesh geometry={t.parks} material={PARK_MATERIAL} receiveShadow />}
      {t.roads.shoulder && <mesh geometry={t.roads.shoulder} material={SHOULDER} receiveShadow />}
      {t.roads.concrete && <mesh geometry={t.roads.concrete} material={CONCRETE_MATERIAL} receiveShadow />}
      {t.roads.asphalt && <mesh geometry={t.roads.asphalt} material={ASPHALT_MATERIAL} receiveShadow />}
      {t.roads.lines && <mesh geometry={t.roads.lines} material={MARKING_MATERIAL} />}
      {t.dashes.length > 0 && (
        <Instances geometry={dashGeo} material={MARKING_MATERIAL} limit={t.dashes.length}>
          {t.dashes.map((d, i) => (
            <Instance key={i} position={d.position} rotation={d.rotation} scale={[0.18 * SCALE, 1, 3 * SCALE]} />
          ))}
        </Instances>
      )}
      {t.rims.map((g, i) => (
        <mesh key={i} geometry={g} material={STONE_MATERIAL} receiveShadow castShadow />
      ))}
      {t.water.map((g, i) => (
        <mesh key={i} geometry={g} material={WATER_MATERIAL} />
      ))}
    </group>
  )
}
