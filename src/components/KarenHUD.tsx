// Phase 1 stub. Hexagonal visor pinned to the bottom-right corner, just left
// of the Daily Bugle sidebar. Pure tease — flickers, says CLASSIFIED, refuses
// to do anything. Phase 2 wires it to the Anthropic API.
export function KarenHUD() {
  return (
    <div
      className="karen-hud"
      aria-label="K.A.R.E.N. — access restricted"
      title="Access restricted. Phase 2 clearance required."
      role="img"
    >
      <span className="karen-name">K.A.R.E.N.</span>
      <span className="karen-status">CLASSIFIED</span>
      <span className="karen-rule" aria-hidden="true" />
      <span className="karen-readout" aria-hidden="true">
        ◇ SCAN · 0xA1F3 · LOCK ◇
      </span>
    </div>
  )
}
