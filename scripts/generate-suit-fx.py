"""Procedurally generate the three Spider-Suit HUD FX clips.

Mathematical synthesis = original work, no third-party license to track. Run
this script whenever you want to tweak the sound design and re-commit the
output. Outputs land in `public/audio/`.

    python scripts/generate-suit-fx.py

Format: 22 050 Hz mono PCM16 WAV. Tiny files (<60 KB total) that ship in the
bundle and stay below the audio engine's silence-on-404 threshold.

Howler picks the first decodable src per FX entry — the soundEngine FX map
lists `.wav` first so these files take priority once present, then falls
through to `.ogg` / `.mp3` if the user later swaps in proper studio FX.
"""

from __future__ import annotations

import math
import os
import wave
from pathlib import Path

import numpy as np

SAMPLE_RATE = 22_050
OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "audio"


def write_wav(path: Path, samples: np.ndarray) -> None:
    """Write a mono PCM16 WAV. Samples expected in [-1.0, 1.0]."""
    # Soft-clip + scale to int16.
    samples = np.tanh(samples * 0.95)
    pcm = np.clip(samples * 32767.0, -32768, 32767).astype(np.int16)
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm.tobytes())
    print(f"  wrote {path.relative_to(Path.cwd())}  ({path.stat().st_size:,} B)")


def envelope(samples: int, attack: float, release: float) -> np.ndarray:
    """Linear attack + exponential release envelope across `samples` frames."""
    env = np.ones(samples, dtype=np.float64)
    a = max(1, int(samples * attack))
    r = max(1, int(samples * release))
    env[:a] = np.linspace(0.0, 1.0, a)
    decay = np.exp(-np.linspace(0.0, 6.0, r))
    env[-r:] = decay * env[-r]
    return env


def synth_boot() -> np.ndarray:
    """1.2 s rising sweep — boot-up. Triangle blend + tiny pulse train + soft
    noise tail that fades. Lands around -8 dBFS peak."""
    dur = 1.2
    n = int(dur * SAMPLE_RATE)
    t = np.linspace(0.0, dur, n, endpoint=False)

    # Two-stage sweep: 220 → 880 Hz fast, then 880 → 1240 Hz slow.
    seg = int(n * 0.45)
    f1 = np.linspace(220.0, 880.0, seg)
    f2 = np.linspace(880.0, 1240.0, n - seg)
    freq = np.concatenate([f1, f2])
    phase = 2.0 * math.pi * np.cumsum(freq) / SAMPLE_RATE

    # Square-ish core via cubic shaping, gives the "scanning" timbre.
    core = np.sin(phase) * 0.55 + np.sin(2.0 * phase) * 0.18

    # Pulse train clicks every ~125 ms during the fast sweep.
    pulse = np.zeros(n)
    for i in range(0, seg, int(SAMPLE_RATE * 0.125)):
        pulse[i : i + 80] = 0.35
    # Filter the pulses softly via a moving average.
    if pulse.any():
        kernel = np.ones(32) / 32
        pulse = np.convolve(pulse, kernel, mode="same")

    # Air noise that decays.
    rng = np.random.default_rng(1610)
    noise = rng.standard_normal(n) * np.exp(-t * 4.0) * 0.06

    env = envelope(n, attack=0.04, release=0.35)
    return (core + pulse + noise) * env


def synth_mode_switch() -> np.ndarray:
    """0.18 s blip — two-tone interface beep with a tiny downward chirp tail."""
    dur = 0.18
    n = int(dur * SAMPLE_RATE)
    t = np.linspace(0.0, dur, n, endpoint=False)

    # 980 Hz sine for the body.
    body = np.sin(2.0 * math.pi * 980.0 * t) * 0.7
    # 1.46k Hz harmonic for the "digital" bite.
    bite = np.sin(2.0 * math.pi * 1460.0 * t) * 0.18

    # Quick chirp tail glides 980 → 540 in the last 40 % so it reads as "select".
    chirp_n = int(n * 0.4)
    chirp_t = t[-chirp_n:]
    chirp_freq = np.linspace(980.0, 540.0, chirp_n)
    chirp_phase = 2.0 * math.pi * np.cumsum(chirp_freq) / SAMPLE_RATE
    chirp = np.zeros(n)
    chirp[-chirp_n:] = np.sin(chirp_phase) * 0.25 * np.exp(
        -np.linspace(0.0, 3.0, chirp_n)
    )

    env = envelope(n, attack=0.02, release=0.65)
    return (body + bite + chirp) * env


def synth_close() -> np.ndarray:
    """0.7 s falling sweep — power-down. Slow descend with widening detune."""
    dur = 0.7
    n = int(dur * SAMPLE_RATE)
    t = np.linspace(0.0, dur, n, endpoint=False)

    # Falling sweep 1100 → 90 Hz with a cosine ease so it doesn't feel linear.
    progress = 0.5 - 0.5 * np.cos(np.linspace(0.0, math.pi, n))
    freq = 1100.0 - progress * (1100.0 - 90.0)
    phase = 2.0 * math.pi * np.cumsum(freq) / SAMPLE_RATE

    # Stereo-feeling detune via a second sweep slightly de-tuned downward.
    phase_detune = 2.0 * math.pi * np.cumsum(freq * 0.985) / SAMPLE_RATE

    body = np.sin(phase) * 0.55 + np.sin(phase_detune) * 0.45

    # A short low-end thump at the very end seals the "shut down" feeling.
    thump_n = int(n * 0.18)
    thump_t = np.linspace(0.0, thump_n / SAMPLE_RATE, thump_n, endpoint=False)
    thump = np.sin(2.0 * math.pi * 65.0 * thump_t) * np.exp(
        -np.linspace(0.0, 5.0, thump_n)
    ) * 0.45
    out = body.copy()
    out[-thump_n:] += thump

    env = envelope(n, attack=0.02, release=0.55)
    return out * env


def main() -> None:
    print(f"Writing FX clips to {OUT_DIR}")
    write_wav(OUT_DIR / "fx-suit-boot.wav", synth_boot())
    write_wav(OUT_DIR / "fx-mode-switch.wav", synth_mode_switch())
    write_wav(OUT_DIR / "fx-suit-close.wav", synth_close())
    print("Done.")


if __name__ == "__main__":
    os.chdir(Path(__file__).resolve().parent.parent)
    main()
