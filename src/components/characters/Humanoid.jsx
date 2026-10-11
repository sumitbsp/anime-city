import { HEAD_RADIUS, surfaceZ } from './rig.js'
import { Blush, CharacterStage, Eye, Flat, Mouth, Toon } from './toon.jsx'

export function HumanHead({ rig, skin, nose = {}, eyes, brow, browTilt, mouth, blush, children }) {
  const { head, leftEye, rightEye } = rig
  const noseY = nose.y ?? -0.12
  return (
    <group ref={head} position={[0, 2.45, 0]}>
      <Toon color={skin}>
        <sphereGeometry args={[HEAD_RADIUS, 48, 32]} />
      </Toon>

      {[-1, 1].map((side) => (
        <Toon key={side} color={skin} position={[side * 0.58, -0.05, 0]} scale={[0.6, 1, 0.8]}>
          <sphereGeometry args={[0.12, 16, 12]} />
        </Toon>
      ))}

      <Eye side={-1} eyeRef={leftEye} brow={brow} browTilt={browTilt} {...eyes} />
      <Eye side={1} eyeRef={rightEye} brow={brow} browTilt={browTilt} {...eyes} />

      {nose.size > 0.03 ? (
        <Toon color={nose.color} outline={2} position={[0, noseY, surfaceZ(0, noseY) - 0.01]}>
          <sphereGeometry args={[nose.size, 16, 12]} />
        </Toon>
      ) : (
        <Flat color={nose.color ?? '#f5b9a0'} position={[0, noseY, surfaceZ(0, noseY) + 0.005]}>
          <sphereGeometry args={[nose.size ?? 0.015, 8, 6]} />
        </Flat>
      )}

      <Mouth {...mouth} />
      {blush && <Blush {...blush} />}
      {children}
    </group>
  )
}

const ELBOW_Y = -0.36

// Shoulder → elbow → hand. Anything passed as children is positioned relative
// to the shoulder but rides on the forearm.
function Arm({ side, armRef, elbowRef, colors, sleeves, sleeveMap, shoulderX, children }) {
  const short = sleeves === 'short'
  return (
    <group ref={armRef} position={[side * shoulderX, 1.68, 0]} rotation={[0, 0, side * 0.15]}>
      <Toon color={colors.sleeve} map={sleeveMap}>
        <sphereGeometry args={[0.14, 16, 12]} />
      </Toon>
      {short ? (
        <>
          <Toon color={colors.sleeve} map={sleeveMap} position={[0, -0.14, 0]}>
            <capsuleGeometry args={[0.125, 0.14, 8, 16]} />
          </Toon>
          <Toon color={colors.skin} position={[0, -0.27, 0]}>
            <capsuleGeometry args={[0.085, 0.1, 8, 16]} />
          </Toon>
        </>
      ) : (
        <Toon color={colors.sleeve} map={sleeveMap} position={[0, -0.18, 0]}>
          <capsuleGeometry args={[0.1, 0.2, 8, 16]} />
        </Toon>
      )}

      <group ref={elbowRef} position={[0, ELBOW_Y, 0]}>
        <Toon color={short ? colors.skin : colors.sleeve} map={short ? undefined : sleeveMap} position={[0, -0.12, 0]}>
          <capsuleGeometry args={[short ? 0.085 : 0.095, 0.16, 8, 16]} />
        </Toon>
        {colors.cuff && (
          <Toon color={colors.cuff} position={[0, -0.24, 0]} rotation={[Math.PI / 2, 0, 0]} outline={1.5}>
            <torusGeometry args={[0.1, 0.025, 8, 20]} />
          </Toon>
        )}
        <Toon color={colors.hand ?? colors.skin} position={[0, -0.42, 0]}>
          <sphereGeometry args={[0.11, 16, 12]} />
        </Toon>
        <group position={[0, -ELBOW_Y, 0]}>{children}</group>
      </group>
    </group>
  )
}

const HIP_Y = 0.85
const KNEE_Y = 0.47
const ANKLE_Y = 0.1

// Hip → knee → ankle, so the walk cycle can bend the knee and roll the foot.
function Leg({ side, legRef, kneeRef, footRef, colors, shorts }) {
  return (
    <group ref={legRef} position={[side * 0.17, HIP_Y, 0]}>
      {shorts ? (
        <>
          <Toon color={colors.pants} position={[0, 0.72 - HIP_Y, 0]}>
            <cylinderGeometry args={[0.16, 0.17, 0.32, 16]} />
          </Toon>
          <Toon color={colors.skin} position={[0, 0.56 - HIP_Y, 0]}>
            <capsuleGeometry args={[0.1, 0.1, 8, 16]} />
          </Toon>
        </>
      ) : (
        <Toon color={colors.pants} position={[0, 0.65 - HIP_Y, 0]}>
          <capsuleGeometry args={[0.14, 0.24, 8, 16]} />
        </Toon>
      )}

      <group ref={kneeRef} position={[0, KNEE_Y - HIP_Y, 0]}>
        {shorts ? (
          <Toon color={colors.skin} position={[0, 0.27 - KNEE_Y, 0]}>
            <capsuleGeometry args={[0.1, 0.2, 8, 16]} />
          </Toon>
        ) : (
          <Toon color={colors.pants} position={[0, 0.3 - KNEE_Y, 0]}>
            <capsuleGeometry args={[0.135, 0.2, 8, 16]} />
          </Toon>
        )}
        {colors.boots && (
          <Toon color={colors.boots} position={[0, 0.3 - KNEE_Y, 0]}>
            <cylinderGeometry args={[0.165, 0.17, 0.4, 16]} />
          </Toon>
        )}
        {colors.bootTrim && (
          <Toon color={colors.bootTrim} position={[0, 0.5 - KNEE_Y, 0]} rotation={[Math.PI / 2, 0, 0]} outline={1.5}>
            <torusGeometry args={[0.165, 0.03, 8, 20]} />
          </Toon>
        )}

        <group ref={footRef} position={[0, ANKLE_Y - KNEE_Y, 0]}>
          <Toon color={colors.shoes} position={[0, 0, 0.07]} scale={[1, 0.7, 1.5]}>
            <sphereGeometry args={[0.15, 16, 12]} />
          </Toon>
        </group>
      </group>
    </group>
  )
}

const WAIST_Y = 0.92

// Shared human body: legs, hips, torso, arms and a head slot. Outfit details
// go in the *Extras slots; `armExtras` is called once per side.
export default function Humanoid({
  rig,
  ringColor,
  colors,
  head,
  shorts = false,
  sleeves = 'long',
  shirtMap,
  sleeveMap,
  torsoWidth = 1.15,
  shoulderX = 0.44,
  torsoExtras,
  armExtras,
  upperExtras,
  lowerExtras,
  ...props
}) {
  const { upperBody, torso, leftArm, rightArm, leftElbow, rightElbow, leftLeg, rightLeg, leftKnee, rightKnee, leftFoot, rightFoot } = rig
  return (
    <CharacterStage rig={rig} ringColor={ringColor} {...props}>
      <Leg side={-1} legRef={leftLeg} kneeRef={leftKnee} footRef={leftFoot} colors={colors} shorts={shorts} />
      <Leg side={1} legRef={rightLeg} kneeRef={rightKnee} footRef={rightFoot} colors={colors} shorts={shorts} />
      <Toon color={colors.hips ?? colors.pants} position={[0, WAIST_Y, 0]}>
        <cylinderGeometry args={[0.3, 0.32, 0.3, 20]} />
      </Toon>
      {lowerExtras}

      {/* Pivots at the waist so leaning and twisting bend from the hips. */}
      <group ref={upperBody} position={[0, WAIST_Y, 0]}>
        <group position={[0, -WAIST_Y, 0]}>
          <group ref={torso} position={[0, 1.3, 0]}>
            <Toon color={colors.shirt} map={shirtMap} scale={[torsoWidth, 1, 1]}>
              <capsuleGeometry args={[0.34, 0.4, 8, 20]} />
            </Toon>
            {colors.belt && (
              <Toon color={colors.belt} position={[0, -0.3, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[torsoWidth, 1, 1]} outline={1.5}>
                <torusGeometry args={[0.33, 0.04, 8, 32]} />
              </Toon>
            )}
            {torsoExtras}
          </group>

          <Toon color={colors.skin} position={[0, 1.9, 0]}>
            <cylinderGeometry args={[0.11, 0.12, 0.25, 16]} />
          </Toon>

          {[-1, 1].map((side) => (
            <Arm
              key={side}
              side={side}
              armRef={side < 0 ? leftArm : rightArm}
              elbowRef={side < 0 ? leftElbow : rightElbow}
              colors={colors}
              sleeves={sleeves}
              sleeveMap={sleeveMap}
              shoulderX={shoulderX}
            >
              {armExtras?.(side)}
            </Arm>
          ))}
          {upperExtras}
          {head}
        </group>
      </group>
    </CharacterStage>
  )
}
