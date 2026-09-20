import type { Universe } from '../store/universeStore'

export interface Still {
  id: string
  universeId: Universe | 'cover'
  src: string
  thumb: string
  alt: string
  credit: { title: string; owner: string }
}

// Shown when a still is missing or fails to load — never a broken image.
export const PAPER_FALLBACK = '/stills/paper-fallback.svg'

export const STILLS: readonly Still[] = [
  { id: 'still-cover', universeId: 'cover', src: '/stills/cover/cover.jpg', thumb: '/stills/cover/cover-thumb.jpg',
    alt: 'Spider-Man swinging between universes', credit: { title: 'The Amazing Spider-Man (cover art)', owner: 'Marvel Comics' } },
  { id: 'still-616-hero', universeId: '616', src: '/stills/616/hero.jpg', thumb: '/stills/616/hero-thumb.jpg',
    alt: 'Spider-Man, classic comic art', credit: { title: 'The Amazing Spider-Man', owner: 'Marvel Comics' } },
  { id: 'still-mcu-hero', universeId: 'mcu', src: '/stills/mcu/hero.jpg', thumb: '/stills/mcu/hero-thumb.jpg',
    alt: 'Spider-Man (Tom Holland) in the MCU', credit: { title: 'Spider-Man: No Way Home', owner: 'Sony Pictures / Marvel Studios' } },
  { id: 'still-toon-hero', universeId: 'toon', src: '/stills/toon/hero.jpg', thumb: '/stills/toon/hero-thumb.jpg',
    alt: 'Spider-Man, 1994 animated series', credit: { title: 'Spider-Man: The Animated Series', owner: 'Marvel Entertainment' } },
  { id: 'still-verse-hero', universeId: 'verse', src: '/stills/verse/hero.jpg', thumb: '/stills/verse/hero-thumb.jpg',
    alt: 'Miles Morales, Into the Spider-Verse', credit: { title: 'Spider-Man: Into the Spider-Verse', owner: 'Sony Pictures Animation' } },
]

export function stillById(id: string): Still | undefined {
  return STILLS.find((s) => s.id === id)
}
