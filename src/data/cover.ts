import type { Universe } from '../store/universeStore'

export const COVER: {
  masthead: string; issue: string; price: string; stillId: string
  coverLines: { universeId: Universe; text: string }[]
} = {
  masthead: 'THE AMAZING SMARTH',
  issue: 'No. 1',
  price: '₹0 · FREE',
  stillId: 'still-cover',
  coverLines: [
    { universeId: '616', text: 'ORIGINS OF A BUILDER!' },
    { universeId: 'mcu', text: 'FIVE FLAGSHIPS, SHIPPED!' },
    { universeId: 'toon', text: 'SATURDAY SIDE QUESTS!' },
    { universeId: 'verse', text: 'ANYONE CAN WEAR THE MASK' },
  ],
}
