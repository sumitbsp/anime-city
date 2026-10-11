import Houses from './Houses.jsx'
import Landmarks from './Landmarks.jsx'
import Locals from './Locals.jsx'
import Streetscape from './Streetscape.jsx'
import Terrain from './Terrain.jsx'
import Vehicles from './Vehicles.jsx'

// A real neighbourhood built from map data (see scripts/fetch-map.mjs).
export default function RealMap({ world }) {
  return (
    <>
      <Terrain world={world} />
      <Houses world={world} />
      <Streetscape world={world} />
      <Landmarks world={world} />
      <Vehicles world={world} />
      <Locals world={world} />
    </>
  )
}
