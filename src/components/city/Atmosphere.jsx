import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { ambience, stepAmbience } from './ambience.js'
import { player, seeded } from './state.js'
import { toon } from './textures.js'

const SHADOW_RANGE = 40

// Gradient sky dome: horizon colour matches the fog so distant streets melt
// into the sky, plus a sun disc and halo.
function makeSkyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color() },
      horizon: { value: new THREE.Color() },
      sunColor: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3() },
      sunGlow: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 top;
      uniform vec3 horizon;
      uniform vec3 sunColor;
      uniform vec3 sunDir;
      uniform float sunGlow;
      varying vec3 vDir;
      void main() {
        vec3 dir = normalize(vDir);
        float h = clamp(dir.y, 0.0, 1.0);
        vec3 col = mix(horizon, top, pow(h, 0.5));
        float s = max(dot(dir, normalize(sunDir)), 0.0);
        col += sunColor * (pow(s, 1200.0) * 6.0 + pow(s, 14.0) * 0.45 * sunGlow + pow(s, 3.0) * 0.12 * sunGlow);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
}

const SKY_MATERIAL = makeSkyMaterial()
const CLOUD_MATERIAL = toon('#ffffff', { fog: false })
const CLOUD_GEO = new THREE.SphereGeometry(1, 14, 10)
const CLOUDS = (() => {
  const rand = seeded(99)
  return Array.from({ length: 22 }, () => ({
    position: [(rand() - 0.5) * 300, 70 + rand() * 30, 80 - rand() * 380],
    scale: 5 + rand() * 6,
    speed: 0.4 + rand() * 0.6,
  }))
})()

function Cloud({ position, scale, speed }) {
  const ref = useRef()
  useFrame((_, delta) => {
    const p = ref.current.position
    p.x += speed * delta
    if (p.x > 140) p.x = -140
  })
  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh geometry={CLOUD_GEO} material={CLOUD_MATERIAL} scale={[1.8, 0.9, 1.1]} />
      <mesh geometry={CLOUD_GEO} material={CLOUD_MATERIAL} position={[1.4, -0.15, 0.2]} scale={[1.2, 0.75, 0.9]} />
      <mesh geometry={CLOUD_GEO} material={CLOUD_MATERIAL} position={[-1.3, -0.2, -0.1]} scale={[1.1, 0.7, 0.9]} />
      <mesh geometry={CLOUD_GEO} material={CLOUD_MATERIAL} position={[0.3, 0.45, 0]} scale={[0.9, 0.7, 0.8]} />
    </group>
  )
}

export default function Atmosphere({ timeOfDay }) {
  const sky = useRef()
  const fog = useRef()
  const hemi = useRef()
  const sun = useRef()
  const sunTarget = useRef()
  const playerLight = useRef()
  const stars = useRef()
  const dust = useRef()

  useEffect(() => {
    sun.current.target = sunTarget.current
  }, [])

  useFrame(({ camera }, delta) => {
    stepAmbience(timeOfDay, delta)
    const a = ambience
    const p = player.position

    sky.current.position.copy(camera.position)
    const u = SKY_MATERIAL.uniforms
    u.top.value.copy(a.skyTop)
    u.horizon.value.copy(a.skyHorizon)
    u.sunColor.value.copy(a.sunColor)
    u.sunDir.value.copy(a.sunDir)
    u.sunGlow.value = a.sunGlow

    fog.current.color.copy(a.fog)
    fog.current.density = a.fogDensity

    hemi.current.color.copy(a.hemiSky)
    hemi.current.groundColor.copy(a.hemiGround)
    hemi.current.intensity = a.hemiIntensity

    // The shadow-casting sun follows the player so shadows stay crisp nearby.
    sun.current.position.copy(p).addScaledVector(a.sunDir, 80)
    sunTarget.current.position.copy(p)
    sun.current.color.copy(a.sunColor)
    sun.current.intensity = a.sunIntensity

    playerLight.current.position.set(p.x, p.y + 4.5, p.z + 1.5)
    playerLight.current.intensity = a.playerLight * 6

    stars.current.position.copy(camera.position)
    stars.current.visible = a.stars > 0.3
    dust.current.position.copy(p)

    CLOUD_MATERIAL.color.copy(a.cloud)
  })

  return (
    <>
      <fogExp2 ref={fog} attach="fog" args={['#ffffff', 0.01]} />
      <mesh ref={sky} material={SKY_MATERIAL} renderOrder={-1} frustumCulled={false}>
        <sphereGeometry args={[450, 32, 16]} />
      </mesh>

      <hemisphereLight ref={hemi} />
      <directionalLight
        ref={sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-SHADOW_RANGE}
        shadow-camera-right={SHADOW_RANGE}
        shadow-camera-top={SHADOW_RANGE}
        shadow-camera-bottom={-SHADOW_RANGE}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-bias={-0.0004}
        shadow-normalBias={0.05}
      />
      <object3D ref={sunTarget} />
      {/* Warm fill so the player reads clearly under street lighting after dark. */}
      <pointLight ref={playerLight} color="#ffc98a" distance={10} decay={1.4} intensity={0} />

      <group ref={stars}>
        <Stars radius={260} depth={60} count={2500} factor={5} saturation={0} fade speed={0.6} />
      </group>
      {CLOUDS.map((c, i) => (
        <Cloud key={i} {...c} />
      ))}
      <group ref={dust}>
        <Sparkles count={70} scale={[16, 6, 16]} position={[0, 3, 0]} size={2.2} speed={0.25} opacity={0.55} color="#fff1cf" />
      </group>
    </>
  )
}
