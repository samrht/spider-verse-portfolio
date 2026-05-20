import type { Augmentation } from '../types/suit'

// Tech-stack items formatted as suit module names for the HUD MissionPanel
// (overlay) + the expanded /suit augmentations list (which uses .proficiency
// to drive a bar). Brief-default placeholders — swap for the real stack later.
export const AUGMENTATIONS: Augmentation[] = [
  { name: 'REACT MODULE', proficiency: 98 },
  { name: 'TYPESCRIPT CORE', proficiency: 94 },
  { name: 'THREE.JS RENDERER', proficiency: 89 },
  { name: 'GSAP ENGINE', proficiency: 92 },
  { name: 'NODE.JS RUNTIME', proficiency: 86 },
]
