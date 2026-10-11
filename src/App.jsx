import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import LocationHud from './components/LocationHud.jsx'
import Picker from './components/Picker.jsx'
import Player from './components/Player.jsx'
import Atmosphere from './components/city/Atmosphere.jsx'
import Birds from './components/city/Birds.jsx'
import City from './components/city/City.jsx'
import Effects from './components/city/Effects.jsx'
import { DEFAULT_TIME, TIME_PRESETS } from './components/city/ambience.js'
import { CHARACTERS } from './components/characters/index.js'
import { getWorld, MAPS } from './components/maps.js'
import RealMap from './components/realmap/RealMap.jsx'

const TIMES = Object.entries(TIME_PRESETS).map(([id, p]) => ({ id, name: p.label }))

function App() {
  const [mapId, setMapId] = useState(MAPS[0].id)
  const [characterId, setCharacterId] = useState(CHARACTERS[0].id)
  const [timeOfDay, setTimeOfDay] = useState(DEFAULT_TIME)
  const { Component: Character } = CHARACTERS.find((c) => c.id === characterId)
  const map = MAPS.find((m) => m.id === mapId)
  const world = getWorld(mapId)

  return (
    <div className="app">
      <div className="panel">
        <Picker label="Map" options={MAPS} value={mapId} onChange={setMapId} />
        <Picker label="Character" options={CHARACTERS} value={characterId} onChange={setCharacterId} />
        <Picker label="Time of day" options={TIMES} value={timeOfDay} onChange={setTimeOfDay} />
      </div>
      <LocationHud world={world} />
      <div className="controls-hint">
        <kbd>W</kbd>
        <kbd>A</kbd>
        <kbd>S</kbd>
        <kbd>D</kbd> to walk · drag to look around
      </div>

      <Canvas shadows camera={{ position: [0, 2.8, 7.5], fov: 45, far: 1200 }} dpr={[1, 2]}>
        <Atmosphere timeOfDay={timeOfDay} />
        {map.kind === 'real' ? <RealMap key={`map-${mapId}`} world={world} /> : <City />}
        {/* Keyed by map so the player respawns at the new map's start. */}
        <Player key={`player-${mapId}`} world={world}>
          {/* Keyed so switching characters remounts and replays the appear animation. */}
          <Character key={characterId} />
        </Player>
        <Birds />
        <Effects />
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={4}
          maxDistance={14}
          maxPolarAngle={Math.PI / 2 - 0.08}
          target={[0, 1.5, 0]}
        />
      </Canvas>
    </div>
  )
}

export default App
