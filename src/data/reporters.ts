// Fictional Daily Bugle bylines — Marvel canon reporters who'd plausibly have
// a desk in Jameson's newsroom. Used by bugleTransform to stamp a random
// reporter on every live wire-service article so it reads in-universe.
export const reporters = [
  'Ben Urich',
  'Robbie Robertson',
  'Betty Brant',
  'Ned Leeds',
  'Glory Grant',
  'Phil Urich',
  'Joy Mercado',
] as const

export type Reporter = (typeof reporters)[number]

export function getRandomReporter(): Reporter {
  return reporters[Math.floor(Math.random() * reporters.length)]
}
