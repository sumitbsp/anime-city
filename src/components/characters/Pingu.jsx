import { useRef } from 'react'
import { useCharacterRig } from './rig.js'
import { CharacterStage, Eye, Toon } from './toon.jsx'

const COLORS = {
  body: '#232838',
  belly: '#f8fafc',
  beak: '#f2552c',
  feet: '#f97316',
  ring: '#38bdf8',
}

const HEAD_R = 0.58
const NOOT_EVERY = 5
const NOOT_LENGTH = 0.9

function Flipper({ side, armRef }) {
  return (
    <group ref={armRef} position={[side * 0.6, 1.5, 0]} rotation={[0, 0, side * 0.35]}>
      <Toon color={COLORS.body} position={[0, -0.32, 0]} scale={[1, 1, 0.45]}>
        <capsuleGeometry args={[0.12, 0.45, 8, 16]} />
      </Toon>
    </group>
  )
}

export default function Pingu(props) {
  const upperBeak = useRef()
  const lowerBeak = useRef()
  const rig = useCharacterRig({
    armSwing: 0.1,
    bob: 0.03,
    stride: 0.5,
    legLength: 0.35,
    lean: 0.03,
    waddle: 0.12,
    onFrame: (t) => {
      // "Noot noot!" — every few seconds the beak stretches open and the flippers fly up.
      const cycle = t % NOOT_EVERY
      const open = t > 2 && cycle < NOOT_LENGTH ? Math.sin((cycle / NOOT_LENGTH) * Math.PI) : 0
      lowerBeak.current.rotation.x = open * 0.55
      upperBeak.current.scale.z = 1 + open * 0.7
      rig.leftArm.current.rotation.z = -(0.35 + open * 0.9)
      rig.rightArm.current.rotation.z = 0.35 + open * 0.9
    },
  })
  const { upperBody, torso, head, leftEye, rightEye, leftArm, rightArm, leftLeg, rightLeg } = rig

  return (
    <CharacterStage rig={rig} ringColor={COLORS.ring} {...props}>
      {[-1, 1].map((side) => (
        <group key={side} ref={side < 0 ? leftLeg : rightLeg} position={[side * 0.22, 0.35, 0]}>
          <Toon color={COLORS.feet} position={[0, -0.29, 0.2]} scale={[1, 0.45, 1.6]}>
            <sphereGeometry args={[0.17, 16, 12]} />
          </Toon>
        </group>
      ))}

      <group ref={upperBody}>
        <group ref={torso} position={[0, 1.0, 0]}>
          <Toon color={COLORS.body} scale={[0.75, 0.95, 0.7]}>
            <sphereGeometry args={[1, 40, 32]} />
          </Toon>
          <Toon color={COLORS.belly} position={[0, -0.08, 0.24]} scale={[0.58, 0.78, 0.5]} outline={0}>
            <sphereGeometry args={[1, 32, 24]} />
          </Toon>
        </group>

        <Flipper side={-1} armRef={leftArm} />
        <Flipper side={1} armRef={rightArm} />

        <group ref={head} position={[0, 2.05, 0]}>
          <Toon color={COLORS.body}>
            <sphereGeometry args={[HEAD_R, 40, 32]} />
          </Toon>
          <Eye side={-1} eyeRef={leftEye} look="cartoon" x={0.16} y={0.13} radius={HEAD_R} size={1.1} />
          <Eye side={1} eyeRef={rightEye} look="cartoon" x={0.16} y={0.13} radius={HEAD_R} size={1.1} />

          <group ref={upperBeak} position={[0, -0.08, 0.48]}>
            <Toon color={COLORS.beak} position={[0, 0, 0.06]} scale={[1.35, 0.45, 1]}>
              <sphereGeometry args={[0.2, 24, 16]} />
            </Toon>
          </group>
          <group ref={lowerBeak} position={[0, -0.14, 0.42]}>
            <Toon color={COLORS.beak} position={[0, -0.01, 0.1]} scale={[1.2, 0.35, 1]}>
              <sphereGeometry args={[0.17, 24, 16]} />
            </Toon>
          </group>
        </group>
      </group>
    </CharacterStage>
  )
}
