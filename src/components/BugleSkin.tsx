import { DailyBugle } from './DailyBugle'
import { useUniverseStore } from '../store/universeStore'

// Wraps the unchanged Daily Bugle rail and exposes the active universe as
// data-skin so bugle.css can present the same headlines four ways.
export function BugleSkin() {
  const active = useUniverseStore((s) => s.activeUniverse)
  return <div className="bugle-skin" data-skin={active}><DailyBugle /></div>
}
