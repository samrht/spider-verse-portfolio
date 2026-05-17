import { useBugleStore } from '../store/bugleStore'
import { BUGLE_CATEGORIES, BUGLE_CATEGORY_LABELS } from '../types/bugle'

interface BugleCategoryTabsProps {
  // "sidebar" packs tighter for the 20vw rail; "wide" is the overlay/page tab strip.
  variant?: 'sidebar' | 'wide'
}

// Horizontal tab strip backed by bugleStore. Both the sidebar and the overlay
// mount their own instance — they all read/write the same selectedCategory.
// stopPropagation prevents clicks from bubbling into surrounding click handlers
// (e.g. the sidebar's masthead-collapse listener).
export function BugleCategoryTabs({ variant = 'wide' }: BugleCategoryTabsProps) {
  const selected = useBugleStore((s) => s.selectedCategory)
  const setCategory = useBugleStore((s) => s.setCategory)

  return (
    <nav
      className="bugle-tabs"
      data-variant={variant}
      aria-label="Daily Bugle desk filter"
    >
      {BUGLE_CATEGORIES.map((cat) => (
        <button
          key={cat}
          type="button"
          className="bugle-tab-btn"
          data-active={cat === selected || undefined}
          aria-pressed={cat === selected}
          onClick={(e) => {
            e.stopPropagation()
            setCategory(cat)
          }}
        >
          {BUGLE_CATEGORY_LABELS[cat]}
        </button>
      ))}
    </nav>
  )
}
