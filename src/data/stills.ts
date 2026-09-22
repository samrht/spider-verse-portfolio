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
    alt: 'Symbiote Spider-Man #1 cover: black-suit Spider-Man crouched mid-swing over Manhattan with a giant Mysterio looming behind',
    credit: { title: 'Symbiote Spider-Man #1 (2019), cover by Greg Land, Jay Leisten & Frank D’Armata', owner: 'Marvel Comics' } },
  // 616 splash shows Amazing Fantasy #15; the page index fan uses the ASM #300 thumb instead (see still-616-asm300).
  { id: 'still-616-hero', universeId: '616', src: '/stills/616/hero.jpg', thumb: '/stills/616/asm300-thumb.jpg',
    alt: 'Amazing Fantasy #15 cover: Spider-Man swinging over the city with a thug under one arm',
    credit: { title: 'Amazing Fantasy #15 (1962), cover by Jack Kirby & Steve Ditko', owner: 'Marvel Comics' } },
  { id: 'still-616-asm300', universeId: '616', src: '/stills/616/asm300.jpg', thumb: '/stills/616/asm300-thumb.jpg',
    alt: 'The Amazing Spider-Man #300 cover: black-suit Spider-Man swinging inside a ring of red 300s',
    credit: { title: 'The Amazing Spider-Man #300 (1988), cover by Todd McFarlane', owner: 'Marvel Comics' } },
  { id: 'still-mcu-hero', universeId: 'mcu', src: '/stills/mcu/hero.jpg', thumb: '/stills/mcu/hero-thumb.jpg',
    alt: 'Spider-Man (Tom Holland) firing a web from the roof of a speeding train',
    credit: { title: 'Spider-Man: Brand New Day (2026)', owner: 'Columbia Pictures / Marvel Studios' } },
  { id: 'still-toon-hero', universeId: 'toon', src: '/stills/toon/hero.jpg', thumb: '/stills/toon/hero-thumb.jpg',
    alt: 'Spider-Man swinging across a neon purple-and-blue night skyline, 1994 animated series',
    credit: { title: 'Spider-Man: The Animated Series (1994)', owner: 'Marvel Entertainment' } },
  { id: 'still-verse-hero', universeId: 'verse', src: '/stills/verse/hero.jpg', thumb: '/stills/verse/hero-thumb.jpg',
    alt: 'Miles Morales swinging low through rain-slick night traffic, Into the Spider-Verse',
    credit: { title: 'Spider-Man: Into the Spider-Verse (2018)', owner: 'Sony Pictures Animation' } },
]

export function stillById(id: string): Still | undefined {
  return STILLS.find((s) => s.id === id)
}
