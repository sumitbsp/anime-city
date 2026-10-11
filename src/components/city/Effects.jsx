import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { ambience } from './ambience.js'

// Bloom picks up anything brighter than white (lit windows, neon, lamps,
// signals); the composer renders in HDR so tone mapping happens last.
export default function Effects() {
  const bloom = useRef()
  useFrame(() => {
    if (bloom.current) bloom.current.intensity = ambience.bloom
  })
  return (
    <EffectComposer multisampling={4}>
      <Bloom ref={bloom} mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.25} radius={0.75} intensity={0.5} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.3} darkness={0.5} />
    </EffectComposer>
  )
}
