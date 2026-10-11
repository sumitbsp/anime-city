import { useEffect, useState } from 'react'
import { player } from './city/state.js'

// Where the player is: area name plus the real name of the current street,
// and the data credits required by the map sources' licences.
export default function LocationHud({ world }) {
  const [street, setStreet] = useState(null)

  useEffect(() => {
    const update = () => setStreet(world.streetAt?.(player.position.x, player.position.z) ?? null)
    update()
    const id = setInterval(update, 300)
    return () => clearInterval(id)
  }, [world])

  return (
    <>
      <div className="location">
        <div className="location-area">{world.meta.name}</div>
        <div className="location-place">{world.meta.place}</div>
        {street && <div className="location-street">{street}</div>}
      </div>
      {world.meta.attribution && <div className="attribution">Map data: {world.meta.attribution.join(' · ')}</div>}
    </>
  )
}
