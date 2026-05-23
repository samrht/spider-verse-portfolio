// Spider-Verse Mixtape tracklist. Files live in /public/audio/mixtape/<slug>.mp3.
// `cover` is optional — drop a JPG into /public/mixtape/covers/<slug>.jpg later
// and the player swaps from the spider-emblem placeholder automatically.

export type MixtapeMovie = 'into' | 'across'

export interface MixtapeTrack {
  slug: string
  title: string
  artist: string
  movie: MixtapeMovie
  src: string
  cover?: string
}

export const MIXTAPE_TRACKS: MixtapeTrack[] = [
  {
    slug: 'whats-up-danger',
    title: "What's Up Danger",
    artist: 'Blackway & Black Caviar',
    movie: 'into',
    src: '/audio/mixtape/whats-up-danger.mp3',
  },
  {
    slug: 'sunflower',
    title: 'Sunflower',
    artist: 'Post Malone & Swae Lee',
    movie: 'into',
    src: '/audio/mixtape/sunflower.mp3',
  },
  {
    slug: 'scared-of-the-dark',
    title: 'Scared of the Dark',
    artist: 'Lil Wayne, Ty Dolla $ign, XXXTentacion',
    movie: 'into',
    src: '/audio/mixtape/scared-of-the-dark.mp3',
  },
  {
    slug: 'hide',
    title: 'Hide',
    artist: 'Juice WRLD & Seezyn',
    movie: 'into',
    src: '/audio/mixtape/hide.mp3',
  },
  {
    slug: 'invincible',
    title: 'Invincible',
    artist: 'Aminé',
    movie: 'into',
    src: '/audio/mixtape/invincible.mp3',
  },
  {
    slug: 'annihilate',
    title: 'Annihilate',
    artist: 'Metro Boomin, Swae Lee, Lil Wayne, Offset',
    movie: 'across',
    src: '/audio/mixtape/annihilate.mp3',
  },
  {
    slug: 'calling',
    title: 'Calling',
    artist: 'Swae Lee, NAV, Metro Boomin',
    movie: 'across',
    src: '/audio/mixtape/calling.mp3',
  },
  {
    slug: 'am-i-dreaming',
    title: 'Am I Dreaming',
    artist: 'Metro Boomin, A$AP Rocky, Roisee',
    movie: 'across',
    src: '/audio/mixtape/am-i-dreaming.mp3',
  },
  {
    slug: 'link-up',
    title: 'Link Up (Spider-Verse Remix)',
    artist: 'Don Toliver, Wizkid, Bnxn',
    movie: 'across',
    src: '/audio/mixtape/link-up.mp3',
  },
]

export const MOVIE_LABEL: Record<MixtapeMovie, string> = {
  into: 'Into the Spider-Verse',
  across: 'Across the Spider-Verse',
}
