# Audio assets

Drop your files into this folder. The Phase 1 `soundEngine` 404-swallows
missing tracks gracefully, so the site keeps working with any subset present.

## File spec — 9 files total

### 4 ambient loops (one per universe)
Loopable; ideally 30 s – 2 min; soft enough not to fight scroll.

| Filename                  | Universe           | Vibe                                  |
|---------------------------|--------------------|---------------------------------------|
| `ambient-1610.ogg`        | Earth-1610 · Miles | Brooklyn / hip-hop / graffiti pulse   |
| `ambient-65.ogg`          | Earth-65 · Gwen    | Soft, melodic, drum-led               |
| `ambient-138.ogg`         | Earth-138 · Punk   | Distorted guitar / punk attitude      |
| `ambient-928.ogg`         | Earth-928 · 2099   | Synthwave / cyberpunk                 |

### 5 FX clips (short — under 1 s each)

| Filename            | Fires on                          |
|---------------------|-----------------------------------|
| `fx-hover.ogg`      | Project card hover                |
| `fx-click.ogg`      | Generic click                     |
| `fx-webshot.ogg`    | Cursor click → web-thread shoot   |
| `fx-glitch.ogg`     | Universe transition glitch peak   |
| `fx-symbiote.ogg`   | `S → Y → M` ink-crawl trigger     |

### Suit HUD FX (Phase 2 — shipped procedurally)

| Filename                  | Fires on                                      | Status                 |
|---------------------------|-----------------------------------------------|------------------------|
| `fx-suit-boot.wav`        | Spider-Suit HUD boot sequence (1.2 s sweep)   | Procedural (CC0, ships) |
| `fx-mode-switch.wav`      | Switching between Miles/Gwen/Punk/2099 suits  | Procedural (CC0, ships) |
| `fx-suit-close.wav`       | Suit HUD power-down on ESC / backdrop click   | Procedural (CC0, ships) |

These three were synthesised in `scripts/generate-suit-fx.py` (numpy + the
standard-library `wave` module). Re-run the script to tweak sound design.
Drop a hand-authored `.ogg` or `.mp3` alongside the `.wav` (matching base name)
and Howler will pick the first that decodes — the FX map is wired
`.ogg → .mp3 → .wav` so studio audio takes precedence automatically.

## Format

`.ogg` is preferred (smaller / better for loops). `.mp3` works as a fallback —
each track is wired with both `[name].ogg` and `[name].mp3`, so drop in whatever
format you have and Howler picks the first one that decodes. You don't need
both; either alone is fine.

## Volume

Per-track volumes are tuned in `src/engine/soundEngine.ts`. Master mute is in
the audio store and persists to localStorage.
