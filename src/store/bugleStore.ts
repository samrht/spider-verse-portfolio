import { create } from 'zustand'
import type { BugleCategory } from '../types/bugle'

// Shared state for the Daily Bugle feature. The sidebar, the BugleOverlay,
// and the /bugle page all read & write here so the selected category stays
// in sync as the user moves between surfaces. Mirrors the pattern used by
// universeStore.ts and audioStore.ts.

interface BugleState {
  isOverlayOpen: boolean
  selectedCategory: BugleCategory
  openOverlay: () => void
  closeOverlay: () => void
  toggleOverlay: () => void
  setCategory: (c: BugleCategory) => void
}

export const useBugleStore = create<BugleState>()((set) => ({
  isOverlayOpen: false,
  selectedCategory: 'technology',
  openOverlay: () => set({ isOverlayOpen: true }),
  closeOverlay: () => set({ isOverlayOpen: false }),
  toggleOverlay: () => set((s) => ({ isOverlayOpen: !s.isOverlayOpen })),
  setCategory: (c) => set({ selectedCategory: c }),
}))
