// Shared types for the Daily Bugle feature (Phase 2).
// Pure type module — dependency-free so any data/api/UI module can import it
// without pulling in transitive runtime modules.

export type BugleCategory =
  | 'technology'
  | 'sports'
  | 'politics'
  | 'science'
  | 'entertainment'

export const BUGLE_CATEGORIES: readonly BugleCategory[] = [
  'technology',
  'sports',
  'politics',
  'science',
  'entertainment',
]

// Display labels for the BugleCategoryTabs strip.
export const BUGLE_CATEGORY_LABELS: Record<BugleCategory, string> = {
  technology: 'Tech',
  sports: 'Sports',
  politics: 'Politics',
  science: 'Science',
  entertainment: 'Entertainment',
}

export interface BugleArticle {
  id: string
  headline: string
  lede: string
  category: BugleCategory
  source: string
  url: string
  imageUrl: string | null
  publishedAt: string // ISO 8601 timestamp
  reporter: string
  isSpiderManStory: boolean
}

export function isBugleCategory(value: string): value is BugleCategory {
  return (BUGLE_CATEGORIES as readonly string[]).includes(value)
}
