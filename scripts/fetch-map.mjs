// Downloads real map data for an area and writes a compact snapshot the game
// loads at runtime. Run with:  npm run fetch-map
//
// Sources (both ODbL — attribution is shown in the app):
//   • OpenStreetMap API      — streets, parks, water, named landmarks
//   • Microsoft Global ML Building Footprints — building outlines (OSM has
//     almost none mapped for this area)
//
// Output coordinates are metres relative to AREA.origin: x = east, z = south.

import { createGunzip } from 'node:zlib'
import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'
import { mkdir, writeFile } from 'node:fs/promises'

const AREA = {
  id: 'kapil-nagar',
  name: 'Kapil Nagar',
  place: 'Sarkanda, Bilaspur, Chhattisgarh',
  // Centre of the "KAPILNAGAR" residential area (OSM way 444738608).
  origin: { lat: 22.0977, lon: 82.15332 },
  // Kapil Nagar plus ~150 m of surroundings: [minLon, minLat, maxLon, maxLat]
  bbox: [82.1497, 22.0947, 82.1569, 22.1007],
}

const OUT = new URL(`../src/data/${AREA.id}.json`, import.meta.url)
const USER_AGENT = 'anime-city/0.1 (hobby 3D map prototype)'
const MS_LINKS = 'https://minedbuildings.z5.web.core.windows.net/global-buildings/dataset-links.csv'

const M_PER_DEG_LAT = 110540
const M_PER_DEG_LON = 111320 * Math.cos((AREA.origin.lat * Math.PI) / 180)
const round = (v) => Math.round(v * 100) / 100
const project = (lon, lat) => [round((lon - AREA.origin.lon) * M_PER_DEG_LON), round(-(lat - AREA.origin.lat) * M_PER_DEG_LAT)]

const [minLon, minLat, maxLon, maxLat] = AREA.bbox
const inBbox = (lon, lat) => lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res
}

// --- OpenStreetMap -------------------------------------------------------------

const LANDMARK_KEYS = ['amenity', 'shop', 'tourism', 'leisure', 'religion', 'historic', 'office', 'junction', 'place']
const KEEP_TAGS = ['name', 'name:hi', 'name:en', ...LANDMARK_KEYS, 'highway', 'landuse', 'natural', 'water', 'oneway', 'lanes', 'surface', 'building', 'building:levels']

const pickTags = (tags = {}) => Object.fromEntries(Object.entries(tags).filter(([k]) => KEEP_TAGS.includes(k)))

async function fetchOsm() {
  const url = `https://api.openstreetmap.org/api/0.6/map.json?bbox=${AREA.bbox.join(',')}`
  console.log('OSM:', url)
  const { elements } = await (await get(url)).json()
  const nodes = new Map(elements.filter((e) => e.type === 'node').map((e) => [e.id, e]))
  const roads = []
  const areas = []
  const landmarks = []

  for (const e of elements) {
    const tags = e.tags ?? {}
    if (e.type === 'way') {
      const points = e.nodes.map((id) => nodes.get(id)).filter(Boolean).map((n) => project(n.lon, n.lat))
      if (points.length < 2) continue
      const closed = e.nodes[0] === e.nodes[e.nodes.length - 1]
      if (tags.highway) {
        roads.push({ id: e.id, tags: pickTags(tags), points })
      } else if (closed && (tags.landuse || tags.leisure || tags.natural || tags.amenity || tags.building)) {
        areas.push({ id: e.id, tags: pickTags(tags), points: points.slice(0, -1) })
      }
    } else if (e.type === 'node' && tags.name && inBbox(e.lon, e.lat)) {
      landmarks.push({ id: e.id, tags: pickTags(tags), point: project(e.lon, e.lat) })
    }
  }
  console.log(`OSM: ${roads.length} roads, ${areas.length} areas, ${landmarks.length} landmarks`)
  return { roads, areas, landmarks }
}

// --- Microsoft building footprints ---------------------------------------------

function quadkey(lat, lon, zoom) {
  const x = (lon + 180) / 360
  const s = Math.sin((lat * Math.PI) / 180)
  const y = 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)
  const tx = Math.floor(x * 2 ** zoom)
  const ty = Math.floor(y * 2 ** zoom)
  let key = ''
  for (let i = zoom; i > 0; i--) {
    const mask = 1 << (i - 1)
    key += String((tx & mask ? 1 : 0) + (ty & mask ? 2 : 0))
  }
  return key
}

async function fetchBuildings() {
  const key = quadkey(AREA.origin.lat, AREA.origin.lon, 9)
  const links = await (await get(MS_LINKS)).text()
  const urls = links
    .split('\n')
    .map((line) => line.split(','))
    .filter((cols) => cols[1] === key)
    .map((cols) => cols[2])
  if (!urls.length) throw new Error(`No Microsoft building tile for quadkey ${key}`)

  const buildings = []
  for (const url of urls) {
    console.log('Buildings:', url)
    const res = await get(url)
    const lines = createInterface({ input: Readable.fromWeb(res.body).pipe(createGunzip()) })
    for await (const line of lines) {
      if (!line.startsWith('{')) continue
      const feature = JSON.parse(line)
      const ring = feature.geometry.coordinates[0]
      const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length
      const cy = ring.reduce((s, p) => s + p[1], 0) / ring.length
      if (!inBbox(cx, cy)) continue
      const height = feature.properties.height
      buildings.push({
        points: ring.slice(0, -1).map(([lon, lat]) => project(lon, lat)),
        ...(height > 0 ? { height: round(height) } : {}),
      })
    }
  }
  console.log(`Buildings: ${buildings.length} footprints`)
  return buildings
}

const [osm, buildings] = await Promise.all([fetchOsm(), fetchBuildings()])
const halfW = ((maxLon - minLon) / 2) * M_PER_DEG_LON
const halfH = ((maxLat - minLat) / 2) * M_PER_DEG_LAT
const centre = project((minLon + maxLon) / 2, (minLat + maxLat) / 2)

const snapshot = {
  meta: {
    id: AREA.id,
    name: AREA.name,
    place: AREA.place,
    origin: AREA.origin,
    // Extent of the downloaded data in local metres: [minX, minZ, maxX, maxZ]
    extent: [round(centre[0] - halfW), round(centre[1] - halfH), round(centre[0] + halfW), round(centre[1] + halfH)],
    fetchedAt: new Date().toISOString(),
    attribution: ['© OpenStreetMap contributors (ODbL)', 'Building footprints © Microsoft (ODbL)'],
  },
  ...osm,
  buildings,
}

await mkdir(new URL('../src/data/', import.meta.url), { recursive: true })
await writeFile(OUT, JSON.stringify(snapshot))
console.log('Wrote', OUT.pathname)
