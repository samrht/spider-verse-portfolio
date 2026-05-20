import { useRef } from 'react'
import gsap from 'gsap'
import { useSuitStore } from '../../store/suitStore'
import {
  SUIT_MODES,
  SUIT_MODE_SHORT_LABEL,
  type SuitMode,
} from '../../types/suit'
import { prefersReducedMotion } from '../../engine/motion'

// Spider emblem — kept tiny and inline so each button can colour it via
// currentColor (driven by the active suit mode's --universe-primary).
function SpiderEmblem({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M12 4 L13.5 8 L17 6.5 L15 10 L19 11 L15 13 L17 16 L13.5 14.5 L12 18 L10.5 14.5 L7 16 L9 13 L5 11 L9 10 L7 6.5 L10.5 8 Z" />
      <circle cx="12" cy="11.5" r="1.8" />
    </svg>
  )
}

// Bottom strip with the four suit-mode buttons. Click triggers a brief GSAP
// flicker on the HUD root (passed in via rootRef from SuitHUD) then commits
// the mode swap — the class change on the root re-cascades all tokens for
// instant re-tinting with no React re-mount.
interface SuitModeBarProps {
  rootRef: React.RefObject<HTMLElement | null>
}

export function SuitModeBar({ rootRef }: SuitModeBarProps) {
  const active = useSuitStore((s) => s.activeSuitMode)
  const switchMode = useSuitStore((s) => s.switchMode)
  const inFlight = useRef(false)

  const onPick = (mode: SuitMode) => {
    if (mode === active || inFlight.current) return
    inFlight.current = true
    const root = rootRef.current
    if (root && !prefersReducedMotion()) {
      gsap.to(root, {
        opacity: 0.3,
        duration: 0.08,
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          switchMode(mode)
          inFlight.current = false
        },
      })
    } else {
      switchMode(mode)
      inFlight.current = false
    }
  }

  return (
    <nav className="suit-mode-bar" aria-label="Suit mode selector">
      {SUIT_MODES.map((mode) => (
        <button
          key={mode}
          type="button"
          className={`suit-mode-btn suit-mode-btn-${mode} ${
            active === mode ? 'is-active' : ''
          }`}
          aria-pressed={active === mode}
          onClick={() => onPick(mode)}
          data-spider-sense
        >
          <SpiderEmblem className="suit-mode-emblem" />
          <span className="suit-mode-label">{SUIT_MODE_SHORT_LABEL[mode]}</span>
        </button>
      ))}
    </nav>
  )
}
