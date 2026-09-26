import type { CSSProperties } from 'react'
import { CLIP_SECONDS } from '../capture/clip'

// Top-right viewer controls on /mixtape: fullscreen (F) and a 10-second
// clip (C). Each renders only when the browser supports it.

export function FullscreenButton({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="viz-ctl" onClick={onToggle} aria-label={active ? 'Exit fullscreen (F)' : 'Enter fullscreen (F)'} aria-pressed={active} data-spider-sense>
      {active ? '⤡' : '⛶'}
    </button>
  )
}

export function ClipButton({ recording, secondsLeft, onStart, onStop }: { recording: boolean; secondsLeft: number; onStart: () => void; onStop: () => void }) {
  const style = { '--clip-p': recording ? secondsLeft / CLIP_SECONDS : 0 } as CSSProperties
  return (
    <button
      type="button" className={`viz-ctl viz-clip ${recording ? 'is-recording' : ''}`} style={style}
      onClick={recording ? onStop : onStart}
      aria-label={recording ? `Stop recording (${secondsLeft}s left)` : `Record a ${CLIP_SECONDS}-second clip (C)`}
      data-spider-sense
    >
      {recording ? <span className="viz-clip-count">{secondsLeft}</span> : '⏺'}
    </button>
  )
}

export function MicButton({ state, onToggle }: { state: 'off' | 'starting' | 'on' | 'blocked'; onToggle: () => void }) {
  const on = state === 'on' || state === 'starting'
  return (
    <span className="viz-mic-wrap">
      <button type="button" className={`viz-ctl viz-mic ${on ? 'is-on' : ''}`} onClick={onToggle}
        aria-label={on ? 'Turn off room mic (M)' : 'Turn on room mic (M)'} aria-pressed={on} data-spider-sense>🎤</button>
      {state === 'blocked' && <span className="viz-mic-note" role="status">MIC BLOCKED</span>}
    </span>
  )
}
