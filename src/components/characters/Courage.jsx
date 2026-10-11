import { useRef } from 'react'
import { useCharacterRig } from './rig.js'
import { CharacterStage, Eye, Mouth, Toon } from './toon.jsx'

const COLORS = {
  fur: '#eea2cb',
  spots: '#1c1a22',
  ears: '#1c1a22',
  nose: '#1c1a22',
  ring: '#c084fc',
}

const HEAD_R = 0.42

function Ear({ side, earRef }) {
  return (
    <group ref={earRef} position={[side * 0.26, 0.26, -0.05]} rotation={[0, 0, -side * 0.9]}>
      <Toon color={COLORS.ears} position={[0, 0.24, 0]} scale={[0.09, 0.28, 0.05]}>
        <sphereGeometry args={[1, 16, 12]} />
      </Toon>
    </group>
  )
}

function Arm({ side, armRef }) {
  return (
    <group ref={armRef} position={[side * 0.27, 1.3, 0.02]} rotation={[0, 0, side * 0.25]}>
      <Toon color={COLORS.fur} position={[0, -0.22, 0]}>
        <capsuleGeometry args={[0.06, 0.36, 6, 12]} />
      </Toon>
      <Toon color={COLORS.fur} position={[0, -0.46, 0.02]}>
        <sphereGeometry args={[0.08, 12, 10]} />
      </Toon>
    </group>
  )
}

export default function Courage(props) {
  const leftEar = useRef()
  const rightEar = useRef()
  const rig = useCharacterRig({
    look: [0.6, 0.25],
    stride: 0.5,
    legLength: 0.9,
    lean: 0.04,
    onFrame: (t) => {
      // Courage is always a little scared: a constant nervous tremble.
      rig.root.current.position.x = Math.sin(t * 55) * 0.012
      leftEar.current.rotation.z = 0.9 + Math.sin(t * 40) * 0.06
      rightEar.current.rotation.z = -0.9 - Math.sin(t * 40) * 0.06
    },
  })
  const { upperBody, torso, head, leftEye, rightEye, leftArm, rightArm, leftLeg, rightLeg } = rig

  return (
    <CharacterStage rig={rig} ringColor={COLORS.ring} {...props}>
      <group scale={1.2}>
        {[-1, 1].map((side) => (
          <group key={side} ref={side < 0 ? leftLeg : rightLeg} position={[side * 0.13, 0.75, 0]}>
            <Toon color={COLORS.fur} position={[0, -0.33, 0]}>
              <capsuleGeometry args={[0.075, 0.5, 6, 12]} />
            </Toon>
            <Toon color={COLORS.fur} position={[0, -0.69, 0.08]} scale={[1, 0.6, 1.6]}>
              <sphereGeometry args={[0.11, 14, 10]} />
            </Toon>
          </group>
        ))}

        <group ref={upperBody}>
          <group ref={torso} position={[0, 1.05, 0]}>
            <Toon color={COLORS.fur} scale={[1.1, 1, 0.95]}>
              <capsuleGeometry args={[0.22, 0.42, 8, 16]} />
            </Toon>
            {[
              [0.08, 0.1],
              [-0.1, -0.06],
              [0.06, -0.22],
            ].map(([x, y], i) => (
              <Toon key={i} color={COLORS.spots} outline={0} position={[x, y, -0.18]} scale={[1, 1, 0.45]}>
                <sphereGeometry args={[0.08, 12, 10]} />
              </Toon>
            ))}
            <Toon color={COLORS.fur} position={[0, -0.28, -0.24]} rotation={[-0.9, 0, 0]}>
              <coneGeometry args={[0.05, 0.22, 8]} />
            </Toon>
          </group>

          <Toon color={COLORS.fur} position={[0, 1.48, 0]}>
            <cylinderGeometry args={[0.07, 0.09, 0.22, 12]} />
          </Toon>

          <Arm side={-1} armRef={leftArm} />
          <Arm side={1} armRef={rightArm} />

          <group ref={head} position={[0, 1.85, 0]}>
            <Toon color={COLORS.fur} scale={[1, 0.95, 1]}>
              <sphereGeometry args={[HEAD_R, 32, 24]} />
            </Toon>
            <Toon color={COLORS.fur} position={[0, -0.12, 0.4]} rotation={[Math.PI / 2 - 0.15, 0, 0]}>
              <capsuleGeometry args={[0.11, 0.18, 8, 16]} />
            </Toon>
            <Toon color={COLORS.nose} outline={1.5} position={[0, -0.06, 0.6]} scale={[1.35, 0.9, 1]}>
              <sphereGeometry args={[0.07, 12, 10]} />
            </Toon>
            <Eye
              side={-1}
              eyeRef={leftEye}
              look="cartoon"
              x={0.15}
              y={0.1}
              radius={HEAD_R}
              brow={COLORS.spots}
              browY={0.22}
              browTilt={-0.35}
            />
            <Eye
              side={1}
              eyeRef={rightEye}
              look="cartoon"
              x={0.15}
              y={0.1}
              radius={HEAD_R}
              brow={COLORS.spots}
              browY={0.22}
              browTilt={-0.35}
            />
            <Mouth y={-0.33} radius={HEAD_R} width={0.06} frown />
            <Ear side={-1} earRef={leftEar} />
            <Ear side={1} earRef={rightEar} />
          </group>
        </group>
      </group>
    </CharacterStage>
  )
}
