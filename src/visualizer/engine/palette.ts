import * as THREE from 'three'
import type { Universe } from '../../store/universeStore'

// Mirrors --universe-primary / --universe-accent in styles/tokens.css plus
// white for the third slot. Kept as constants (not read from CSS) so the
// engine has no DOM dependency.
const PRIMARY: Record<Universe, string> = {
  'earth-1610': '#ff2d2d',
  'earth-65': '#6ec6f5',
  'earth-138': '#e8d44d',
  'earth-928': '#00d4ff',
}
const ACCENT: Record<Universe, string> = {
  'earth-1610': '#7b2fff',
  'earth-65': '#f5c6d0',
  'earth-138': '#c0392b',
  'earth-928': '#0057ff',
}

export function paletteFor(u: Universe): [THREE.Color, THREE.Color, THREE.Color] {
  return [new THREE.Color(PRIMARY[u]), new THREE.Color(ACCENT[u]), new THREE.Color('#ffffff')]
}
