import { useMemo } from 'react'
import * as THREE from 'three'
import Humanoid, { HumanHead } from './Humanoid.jsx'
import { useCharacterRig } from './rig.js'
import { Flat, Toon } from './toon.jsx'

const COLORS = {
  skin: '#ffd2b0',
  hair: '#7c4a2a',
  hardHat: '#facc15',
  denim: '#2f5fb3',
  denimDark: '#24498c',
  button: '#fbbf24',
  belt: '#92400e',
  pouch: '#b45309',
  boots: '#6b3f1d',
  steel: '#9ca3af',
  handle: '#d6a35c',
}

function makePlaid() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#d9581c'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = 'rgba(90, 30, 10, 0.5)'
  for (let i = 0; i < size; i += 16) {
    ctx.fillRect(i, 0, 7, size)
    ctx.fillRect(0, i, size, 7)
  }
  ctx.fillStyle = 'rgba(255, 230, 190, 0.45)'
  for (let i = 11; i < size; i += 16) {
    ctx.fillRect(i, 0, 2, size)
    ctx.fillRect(0, i, size, 2)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(3, 3)
  tex.magFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function HardHat() {
  return (
    <group position={[0, 0.16, 0]}>
      <Toon color={COLORS.hardHat}>
        <sphereGeometry args={[0.66, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </Toon>
      <Toon color={COLORS.hardHat} position={[0, 0.01, 0.06]}>
        <cylinderGeometry args={[0.8, 0.8, 0.05, 40]} />
      </Toon>
      <Toon color={COLORS.hardHat} rotation={[0, Math.PI / 2, 0]} outline={2}>
        <torusGeometry args={[0.66, 0.06, 8, 32, Math.PI]} />
      </Toon>
    </group>
  )
}

function Hair() {
  return (
    <>
      <Toon color={COLORS.hair} position={[0, 0.08, -0.06]} rotation={[-1.1, 0, 0]}>
        <sphereGeometry args={[0.615, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
      </Toon>
      {[-1, 1].map((side) => (
        <Toon key={side} color={COLORS.hair} position={[side * 0.55, 0.08, 0.08]} scale={[0.5, 1, 0.8]}>
          <sphereGeometry args={[0.13, 12, 10]} />
        </Toon>
      ))}
    </>
  )
}

function Overalls() {
  return (
    <>
      <Toon color={COLORS.denim} position={[0, -0.09, 0.32]} outline={2}>
        <boxGeometry args={[0.5, 0.42, 0.06]} />
      </Toon>
      <Flat color={COLORS.denimDark} position={[0, -0.06, 0.355]}>
        <boxGeometry args={[0.22, 0.14, 0.01]} />
      </Flat>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Toon color={COLORS.denim} position={[side * 0.19, 0.24, 0.27]} rotation={[-0.55, 0, 0]} outline={1.5}>
            <boxGeometry args={[0.09, 0.32, 0.04]} />
          </Toon>
          <Flat color={COLORS.button} position={[side * 0.19, 0.1, 0.36]}>
            <sphereGeometry args={[0.035, 10, 8]} />
          </Flat>
        </group>
      ))}
    </>
  )
}

function ToolBelt() {
  return (
    <group position={[0, 0.98, 0]}>
      <Toon color={COLORS.belt} rotation={[Math.PI / 2, 0, 0]} outline={1.5}>
        <torusGeometry args={[0.33, 0.05, 8, 32]} />
      </Toon>
      <Toon color={COLORS.pouch} position={[-0.3, -0.12, 0.12]} rotation={[0, -0.6, 0]}>
        <boxGeometry args={[0.18, 0.2, 0.1]} />
      </Toon>
      <group position={[0.36, -0.12, 0.05]} rotation={[0, 0, 0.1]}>
        <Toon color={COLORS.handle} position={[0, -0.08, 0]} outline={1.5}>
          <cylinderGeometry args={[0.025, 0.025, 0.36, 8]} />
        </Toon>
        <Toon color={COLORS.steel} position={[0, 0.12, 0]} outline={1.5}>
          <boxGeometry args={[0.07, 0.07, 0.2]} />
        </Toon>
      </group>
    </group>
  )
}

export default function BobTheBuilder(props) {
  const rig = useCharacterRig()
  const plaid = useMemo(() => makePlaid(), [])

  return (
    <Humanoid
      {...props}
      rig={rig}
      ringColor={COLORS.hardHat}
      shirtMap={plaid}
      sleeveMap={plaid}
      torsoWidth={1.22}
      colors={{
        skin: COLORS.skin,
        shirt: '#ffffff',
        sleeve: '#ffffff',
        pants: COLORS.denim,
        shoes: COLORS.boots,
      }}
      torsoExtras={<Overalls />}
      lowerExtras={<ToolBelt />}
      head={
        <HumanHead
          rig={rig}
          skin={COLORS.skin}
          eyes={{ look: 'dot', x: 0.2, y: 0.02, browY: 0.13 }}
          brow={COLORS.hair}
          browTilt={0}
          nose={{ color: '#f2a98a', size: 0.085, y: -0.1 }}
          mouth={{ width: 0.1, thickness: 0.014, y: -0.3 }}
          blush={{ opacity: 0.3 }}
        >
          <Hair />
          <HardHat />
        </HumanHead>
      }
    />
  )
}
