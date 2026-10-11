import { useMemo } from 'react'
import * as THREE from 'three'
import { CURB_HEIGHT, ROAD_END_Z, ROAD_HALF_WIDTH, ROAD_START_Z, SIDEWALK_WIDTH } from '../world.js'
import Citizen from './Citizen.jsx'
import { randomLook } from './citizenLooks.js'
import { player, seeded } from './state.js'

const COUNT = 22
const WALK_START = ROAD_START_Z - 10
const WALK_END = ROAD_END_Z + 10
const WALK_LENGTH = WALK_START - WALK_END
const SIDEWALK_MID = ROAD_HALF_WIDTH + SIDEWALK_WIDTH / 2

// Walks up and down one sidewalk, stepping aside when the player is in the way.
function sidewalkWalker({ laneX, dir, s, speed }) {
  let dodge = 0
  return (dt, pose) => {
    const z = dir > 0 ? WALK_END + s : WALK_START - s
    const ahead = (player.position.z - z) * dir
    const near = Math.abs(player.position.x - (laneX + dodge)) < 1.2 && ahead > -0.5 && ahead < 3
    const dodgeTarget = near ? (player.position.x > laneX ? -1.1 : 1.1) : 0
    dodge = THREE.MathUtils.damp(dodge, dodgeTarget, 3, dt)
    s = (s + speed * dt) % WALK_LENGTH
    pose.x = laneX + dodge
    pose.y = CURB_HEIGHT
    pose.z = z
    pose.heading = dir > 0 ? 0 : Math.PI
    pose.speed = speed
  }
}

function createPeople() {
  const rand = seeded(1234)
  return Array.from({ length: COUNT }, (_, i) => {
    const side = i % 2 ? 1 : -1
    const dir = rand() < 0.5 ? 1 : -1
    const walker = {
      laneX: side * (SIDEWALK_MID + (dir > 0 ? -0.6 : 0.6) + (rand() - 0.5) * 0.3),
      dir,
      s: rand() * WALK_LENGTH,
      speed: 1.1 + rand() * 0.6,
    }
    return { look: randomLook(rand), step: sidewalkWalker(walker) }
  })
}

export default function Pedestrians() {
  const people = useMemo(() => createPeople(), [])
  return people.map((p, i) => <Citizen key={i} look={p.look} step={p.step} />)
}
