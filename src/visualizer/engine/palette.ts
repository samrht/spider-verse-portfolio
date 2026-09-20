import * as THREE from 'three'
import type { Universe } from '../../store/universeStore'

// Mirrors --universe-primary / --universe-accent in styles/tokens.css plus
// white for the third slot. Kept as constants (not read from CSS) so the
// engine has no DOM dependency.
const PRIMARY: Record<Universe, string> = {
  '616': '#c0392b',
  mcu: '#7fb7ff',
  toon: '#ff3b3b',
  verse: '#ff2d6b',
}
const ACCENT: Record<Universe, string> = {
  '616': '#ffd400',
  mcu: '#ff2d2d',
  toon: '#ffe14d',
  verse: '#00e5ff',
}

export function paletteFor(u: Universe): [THREE.Color, THREE.Color, THREE.Color] {
  return [new THREE.Color(PRIMARY[u]), new THREE.Color(ACCENT[u]), new THREE.Color('#ffffff')]
}
