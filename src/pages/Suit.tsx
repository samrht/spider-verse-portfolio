import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { useSuitStore } from '../store/suitStore'
import { MISSIONS } from '../data/suitMissions'
import { AUGMENTATIONS } from '../data/suitAugmentations'
import {
  SUIT_MODE_LABEL,
  SUIT_MODE_UNIVERSE,
} from '../types/suit'
import { ChronPanel } from '../components/SuitHUD/panels/ChronPanel'
import { AtmosPanel } from '../components/SuitHUD/panels/AtmosPanel'
import { WebFluidPanel } from '../components/SuitHUD/panels/WebFluidPanel'
import { MissionPanel } from '../components/SuitHUD/panels/MissionPanel'
import { RadarPanel } from '../components/SuitHUD/panels/RadarPanel'
import { SuitModeBar } from '../components/SuitHUD/SuitModeBar'
import { prefersReducedMotion } from '../engine/motion'
import '../styles/suit.css'

// Standalone /suit page — same panels as the overlay plus the radar, full
// mission log, and proficiency bars. Works cold: if the user deep-linked
// here without going through the overlay first, refreshTelemetry kicks off
// the GitHub + weather fetches on mount.
export function Suit() {
  const telemetry = useSuitStore((s) => s.telemetry)
  const refreshTelemetry = useSuitStore((s) => s.refreshTelemetry)
  const activeSuitMode = useSuitStore((s) => s.activeSuitMode)
  const pageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!telemetry) {
      void refreshTelemetry()
    }
  }, [telemetry, refreshTelemetry])

  const dataUniverse = SUIT_MODE_UNIVERSE[activeSuitMode]

  return (
    <div
      ref={pageRef}
      className={`suit-page suit-${activeSuitMode}`}
      data-universe={dataUniverse}
    >
      <div className="suit-hud-scanline" aria-hidden="true" />
      <Link to="/" className="suit-page-back">
        ← RETURN TO THE MOTHERSHIP
      </Link>

      <header>
        <h1 className="suit-page-title">SPIDER-SUIT HUD — FULL DASHBOARD</h1>
        <p className="suit-page-sub">{SUIT_MODE_LABEL[activeSuitMode]}</p>
      </header>

      <div className="suit-page-grid">
        <ChronPanel />
        <AtmosPanel />
        <RadarPanel />
        <WebFluidPanel />
        <MissionPanel />
      </div>

      <section className="suit-page-section">
        <h2>MISSION LOG</h2>
        <div className="suit-mission-log">
          {MISSIONS.map((m, i) => (
            <MissionLogEntry key={i} mission={m} />
          ))}
        </div>
      </section>

      <section className="suit-page-section">
        <h2>SUIT AUGMENTATIONS</h2>
        <ul className="suit-aug-list">
          {AUGMENTATIONS.map((a) => (
            <AugRow key={a.name} name={a.name} proficiency={a.proficiency} />
          ))}
        </ul>
      </section>

      <footer className="suit-page-section">
        <SuitModeBar rootRef={pageRef} />
      </footer>
    </div>
  )
}

interface MissionLogEntryProps {
  mission: (typeof MISSIONS)[number]
}

// Mission log line. CLASSIFIED entries blur the codename via filter:blur(4px)
// and reveal on hover; the "CLEARANCE VERIFIED" chip fades in alongside.
function MissionLogEntry({ mission }: MissionLogEntryProps) {
  const isClassified = mission.status === 'CLASSIFIED'
  const displayCodename = isClassified
    ? '████████ — CLEARANCE LEVEL 5 REQUIRED'
    : mission.codename

  return (
    <article
      className={`suit-mission-entry${
        isClassified ? ' suit-mission-entry-classified' : ''
      }`}
    >
      <h3 className="suit-mission-codename font-display">
        {displayCodename}
        {isClassified && (
          <span className="suit-clearance-flash">CLEARANCE VERIFIED</span>
        )}
      </h3>
      <p className="suit-mission-desc">{mission.description}</p>
      <ul className="suit-mission-stack">
        {mission.stack.map((t) => (
          <li
            key={t}
            className="font-mono uppercase tracking-wider"
            style={{
              fontSize: 'var(--text-xs)',
              border: '1px solid var(--universe-accent)',
              color: 'var(--universe-accent)',
              padding: '0.2rem 0.5rem',
            }}
          >
            {t}
          </li>
        ))}
      </ul>
      <div
        className={`suit-mission-status suit-status-${mission.status.toLowerCase()}`}
      >
        STATUS: {mission.status} · {mission.date}
      </div>
    </article>
  )
}

interface AugRowProps {
  name: string
  proficiency: number
}

// Proficiency-bar row. Each fill tweens 0 → proficiency on mount via GSAP.
// Reduced motion: snap straight to the target width.
function AugRow({ name, proficiency }: AugRowProps) {
  const fillRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const node = fillRef.current
    if (!node) return
    if (prefersReducedMotion()) {
      node.style.width = `${proficiency}%`
      return
    }
    const tween = gsap.fromTo(
      node,
      { width: '0%' },
      { width: `${proficiency}%`, duration: 1.2, ease: 'power2.out' },
    )
    return () => {
      tween.kill()
    }
  }, [proficiency])

  return (
    <li className="suit-aug-row">
      <span>{name}</span>
      <span className="suit-aug-bar" aria-hidden="true">
        <span ref={fillRef} className="suit-aug-bar-fill" />
      </span>
      <span>{proficiency}%</span>
    </li>
  )
}
