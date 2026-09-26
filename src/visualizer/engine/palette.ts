import * as THREE from 'three'
import type { Universe } from '../../store/universeStore'
import { VIZ_STYLES } from './vizStyles'

// Dot colours per universe, sourced from VIZ_STYLES so the table stays the
// single source (spec §5). Kept as data, not read from CSS, so the engine has
// no DOM dependency.
export function paletteFor(u: Universe): [THREE.Color, THREE.Color, THREE.Color] {
  const [a, b, c] = VIZ_STYLES[u].palette
  return [new THREE.Color(a), new THREE.Color(b), new THREE.Color(c)]
}
