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
  spotifyId?: string
}

export const MIXTAPE_TRACKS: MixtapeTrack[] = [
  {
    slug: 'whats-up-danger',
    title: "What's Up Danger",
    artist: 'Blackway & Black Caviar',
    movie: 'into',
    src: '/audio/mixtape/whats-up-danger.mp3',
    spotifyId: '5zsHmE2gO3RefVsPyw2e3T',
  },
  {
    slug: 'sunflower',
    title: 'Sunflower',
    artist: 'Post Malone & Swae Lee',
    movie: 'into',
    src: '/audio/mixtape/sunflower.mp3',
    spotifyId: '3KkXRkHbMCARz0aVfEt68P',
  },
  {
    slug: 'scared-of-the-dark',
    title: 'Scared of the Dark',
    artist: 'Lil Wayne, Ty Dolla $ign, XXXTentacion',
    movie: 'into',
    src: '/audio/mixtape/scared-of-the-dark.mp3',
    spotifyId: '3vWzyGTu6Ovo1GdrcJqH6e',
  },
  {
    slug: 'hide',
    title: 'Hide',
    artist: 'Juice WRLD & Seezyn',
    movie: 'into',
    src: '/audio/mixtape/hide.mp3',
    spotifyId: '6rz0dTA0PdhXImFV5EjM0w',
  },
  {
    slug: 'invincible',
    title: 'Invincible',
    artist: 'Aminé',
    movie: 'into',
    src: '/audio/mixtape/invincible.mp3',
    spotifyId: '6VS7wKwtvL2FvTupYSWZ9e',
  },
  {
    slug: 'annihilate',
    title: 'Annihilate',
    artist: 'Metro Boomin, Swae Lee, Lil Wayne, Offset',
    movie: 'across',
    src: '/audio/mixtape/annihilate.mp3',
    spotifyId: '39MK3d3fonIP8Mz9oHCTBB',
  },
  {
    slug: 'calling',
    title: 'Calling',
    artist: 'Swae Lee, NAV, Metro Boomin',
    movie: 'across',
    src: '/audio/mixtape/calling.mp3',
    spotifyId: '5rurggqwwudn9clMdcchxT',
  },
  {
    slug: 'am-i-dreaming',
    title: 'Am I Dreaming',
    artist: 'Metro Boomin, A$AP Rocky, Roisee',
    movie: 'across',
    src: '/audio/mixtape/am-i-dreaming.mp3',
    spotifyId: '6Ec5LeRzkisa5KJtwLfOoW',
  },
  {
    slug: 'link-up',
    title: 'Link Up (Spider-Verse Remix)',
    artist: 'Don Toliver, Wizkid, Bnxn',
    movie: 'across',
    src: '/audio/mixtape/link-up.mp3',
    spotifyId: '0y8Pu7x5jXgUjOIJvQIF5L',
  },
]

export const MOVIE_LABEL: Record<MixtapeMovie, string> = {
  into: 'Into the Spider-Verse',
  across: 'Across the Spider-Verse',
}
