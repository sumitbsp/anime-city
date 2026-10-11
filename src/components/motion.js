import { createContext, useContext } from 'react'

// Shared by the Player (which writes it) and character rigs (which read it):
// `walk` eases 0..1 with the character's speed, and `distance` is the total
// ground covered, which rigs turn into a stride phase.
export const MotionContext = createContext(null)

export function useMotion() {
  return useContext(MotionContext)
}
