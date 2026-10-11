// Appearance palettes for background townsfolk (see Citizen.jsx).

const SKIN = ['#ffdcc2', '#f1c09a', '#d79a6c', '#a86b45', '#7a4a2e']
const HAIR = ['#1e1b24', '#4a2c1d', '#8b5a2b', '#d9a441', '#c94f3d', '#5b6fb5', '#e48fb3']
const SHIRT = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#f78c6b', '#9b5de5', '#f8f9fa', '#2b2d42', '#90be6d']
const PANTS = ['#2b2d42', '#3d5a80', '#6c584c', '#1d3557', '#495057', '#a3b18a']

export const PALETTES = {
  city: { skin: SKIN, hair: HAIR, top: SHIRT, bottom: PANTS, skirtChance: 0 },
  // Kapil Nagar: warmer skin tones, mostly black hair, kurtas and sarees.
  bilaspur: {
    skin: ['#e0ac7e', '#c98e60', '#b07850', '#8d5a3b', '#d9a072'],
    hair: ['#14121a', '#1e1b24', '#2b211c', '#3a2a22'],
    top: ['#f4f1e8', '#ffd166', '#e63946', '#2a9d8f', '#f4a261', '#8ecae6', '#ffafcc', '#606c38', '#bc6c25'],
    bottom: ['#2b2d42', '#f4f1e8', '#3d5a80', '#6c584c', '#e9c46a'],
    skirt: ['#d62828', '#ff70a6', '#ffbe0b', '#3a86ff', '#8338ec', '#2a9d8f', '#fb5607'],
    skirtChance: 0.45,
  },
}

export function randomLook(rand, palette = PALETTES.city) {
  const pick = (list) => list[Math.floor(rand() * list.length)]
  const skirt = palette.skirt && rand() < palette.skirtChance ? pick(palette.skirt) : null
  return {
    skin: pick(palette.skin),
    hair: pick(palette.hair),
    top: skirt ?? pick(palette.top),
    bottom: pick(palette.bottom),
    skirt,
    prop: rand() < 0.25 ? 'bag' : rand() < 0.15 ? 'umbrella' : null,
    scale: 0.85 + rand() * 0.2,
  }
}
