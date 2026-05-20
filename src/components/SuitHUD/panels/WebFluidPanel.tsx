import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useSuitStore } from '../../../store/suitStore'
import { prefersReducedMotion } from '../../../engine/motion'

// WEB FLUID panel — sci-fi metric block.
//   web fluid level   ← commits this week (mapped to 0–100 bar)
//   patrol streak     ← currentStreak (consecutive push days)
//   active threats    ← openIssues (red pulse if >0)
//   gratitude index   ← totalStars (lifetime + this universe)
export function WebFluidPanel() {
  const telemetry = useSuitStore((s) => s.telemetry)
  const fillRef = useRef<HTMLDivElement>(null)

  const commits = telemetry?.github.commitsThisWeek ?? 0
  const streak = telemetry?.github.currentStreak ?? 0
  const threats = telemetry?.github.openIssues ?? 0
  const stars = telemetry?.github.totalStars ?? 0

  // Map commits to a sensible 0–100 visible scale. 25+ commits/week pegs the
  // bar — anything beyond is bragging rights, not telemetry.
  const fluidPct = Math.min(100, Math.round(commits * 4))

  useEffect(() => {
    const node = fillRef.current
    if (!node) return
    if (prefersReducedMotion()) {
      node.style.width = `${fluidPct}%`
      return
    }
    const tween = gsap.fromTo(
      node,
      { width: '0%' },
      { width: `${fluidPct}%`, duration: 1.5, ease: 'power2.out' },
    )
    return () => {
      tween.kill()
    }
  }, [fluidPct])

  return (
    <section className="suit-panel suit-panel-fluid" aria-label="Web fluid systems">
      <header className="suit-panel-label">WEB FLUID</header>
      <div className="suit-fluid-track" aria-hidden="true">
        <div ref={fillRef} className="suit-fluid-fill" />
      </div>
      <div className="suit-fluid-readout">
        <span>{fluidPct}% CAPACITY</span>
        <span>{commits} CMTS / WK</span>
      </div>
      <dl className="suit-fluid-grid">
        <div>
          <dt>PATROL STREAK</dt>
          <dd>{streak} DAY{streak === 1 ? '' : 'S'}</dd>
        </div>
        <div>
          <dt>ACTIVE THREATS</dt>
          <dd className={threats > 0 ? 'suit-active-threats' : ''}>{threats}</dd>
        </div>
        <div>
          <dt>GRATITUDE INDEX</dt>
          <dd>{stars}★</dd>
        </div>
      </dl>
    </section>
  )
}
