#!/usr/bin/env node
// MP3 → beat map JSON. Mirrors src/visualizer/signal: same band ranges,
// same spectral-flux onset rule, same energy-shift section rule.
//
//   node scripts/analyse-track.mjs public/audio/mixtape/sunflower.mp3
//   node scripts/analyse-track.mjs public/audio/mixtape/*.mp3 --out public/beatmaps
//
// Requires ffmpeg on PATH.

import { spawnSync } from 'node:child_process'
import { basename, join } from 'node:path'
import { mkdirSync, writeFileSync } from 'node:fs'

const SR = 22050
const FFT = 2048
const RATE_HZ = 20
const HOP = Math.round(SR / RATE_HZ)
const BAND_HZ = { bass: [20, 150], mids: [150, 2000], highs: [2000, 16000] }

const args = process.argv.slice(2)
const outIdx = args.indexOf('--out')
const outDir = outIdx >= 0 ? args[outIdx + 1] : 'public/beatmaps'
const files = args.filter((a, i) => a !== '--out' && i !== outIdx + 1)
if (files.length === 0) { console.error('usage: analyse-track.mjs <mp3...> [--out dir]'); process.exit(1) }
mkdirSync(outDir, { recursive: true })

for (const file of files) analyse(file)

function decode(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 30 })
  if (r.status !== 0) throw new Error(`ffmpeg failed for ${file}: ${r.stderr}`)
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4)
}

// In-place iterative radix-2 FFT (re, im arrays of length FFT).
function fft(re, im) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]] }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wr = Math.cos(ang), wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k]
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr
        re[i + k] = ur + vr; im[i + k] = ui + vi
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi
        const ncr = cr * wr - ci * wi
        ci = cr * wi + ci * wr; cr = ncr
      }
    }
  }
}

function binRange(loHz, hiHz) {
  const binHz = SR / FFT
  const lo = Math.floor(loHz / binHz)
  return [lo, Math.max(lo + 1, Math.floor(hiHz / binHz))]
}

function classify(e) {
  if (e >= 0.8) return 'drop'
  if (e >= 0.55) return 'high'
  if (e >= 0.3) return 'mid'
  return 'low'
}

function analyse(file) {
  const slug = basename(file).replace(/\.mp3$/i, '')
  const pcm = decode(file)
  const durationS = pcm.length / SR
  const window = new Float32Array(FFT)
  for (let i = 0; i < FFT; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT - 1))
  const re = new Float32Array(FFT), im = new Float32Array(FFT)
  const ranges = { bass: binRange(...BAND_HZ.bass), mids: binRange(...BAND_HZ.mids), highs: binRange(...BAND_HZ.highs) }

  const frames = []   // [bass, mids, highs] raw magnitudes
  const spectra = []  // per-frame magnitude arrays (for flux)
  for (let start = 0; start + FFT <= pcm.length; start += HOP) {
    for (let i = 0; i < FFT; i++) { re[i] = pcm[start + i] * window[i]; im[i] = 0 }
    fft(re, im)
    const mag = new Float32Array(FFT / 2)
    for (let i = 0; i < FFT / 2; i++) mag[i] = Math.hypot(re[i], im[i])
    spectra.push(mag)
    // Clamp to the actual bin count (mirrors bandAverage in signal/bands.ts):
    // at 22.05 kHz / FFT=2048 the highs band's 16 kHz top edge is past
    // Nyquist (11.025 kHz), so an unclamped range reads undefined past the
    // array end and poisons the average with NaN.
    const avg = ([lo, hiRaw]) => { const hi = Math.min(hiRaw, mag.length); if (hi <= lo) return 0; let s = 0; for (let i = lo; i < hi; i++) s += mag[i]; return s / (hi - lo) }
    frames.push([avg(ranges.bass), avg(ranges.mids), avg(ranges.highs)])
  }

  // Normalise each band to its 98th percentile so quiet masters still fill 0..1.
  const p98 = (k) => { const v = frames.map((f) => f[k]).sort((a, b) => a - b); return v[Math.floor(v.length * 0.98)] || 1 }
  const norm = [p98(0), p98(1), p98(2)]
  const bands = frames.map((f) => f.map((v, k) => +Math.min(1, v / norm[k]).toFixed(3)))

  // Onsets: spectral flux vs rolling mean + 1.5 std, 0.7 s history, 100 ms min gap.
  const flux = spectra.map((m, i) => {
    if (i === 0) return 0
    let s = 0
    for (let k = 0; k < m.length; k++) { const d = m[k] - spectra[i - 1][k]; if (d > 0) s += d }
    return s / m.length
  })
  const beats = []
  const hist = Math.round(0.7 * RATE_HZ)
  let lastBeat = -1
  for (let i = hist; i < flux.length; i++) {
    const win = flux.slice(i - hist, i)
    const mean = win.reduce((a, b) => a + b, 0) / hist
    const std = Math.sqrt(win.reduce((a, b) => a + (b - mean) ** 2, 0) / hist)
    const t = i / RATE_HZ
    if (flux[i] > mean + 1.5 * std && flux[i] > 1e-4 && t - lastBeat >= 0.1) { beats.push(+t.toFixed(3)); lastBeat = t }
  }

  // BPM: autocorrelation of the onset envelope between 60 and 200 bpm.
  const env = new Float32Array(flux.length)
  for (const b of beats) env[Math.round(b * RATE_HZ)] = 1
  let bestBpm = 120, best = -1
  for (let bpm = 60; bpm <= 200; bpm++) {
    const lag = Math.round((60 / bpm) * RATE_HZ)
    let s = 0
    for (let i = lag; i < env.length; i++) s += env[i] * env[i - lag]
    if (s > best) { best = s; bestBpm = bpm }
  }

  // Sections: same rule as SectionDetector (smoothing 0.05/frame at 60fps ≈ 0.15 at 20 Hz, hold 2 s).
  const sections = []
  let smoothed = 0, current = null, candidate = null, candidateFor = 0, index = 0
  const dt = 1 / RATE_HZ
  for (let i = 0; i < bands.length; i++) {
    const [b, m, h] = bands[i]
    const loud = b * 0.5 + m * 0.35 + h * 0.15
    smoothed += (loud - smoothed) * 0.15
    const bucket = classify(smoothed)
    if (current === null) { current = bucket; sections.push({ start: 0, energy: bucket }); continue }
    if (bucket === current) { candidate = null; candidateFor = 0 }
    else if (bucket === candidate) {
      candidateFor += dt
      if (candidateFor >= 2) { current = bucket; index++; sections.push({ start: +((i / RATE_HZ) - 2).toFixed(2), energy: bucket }); candidate = null; candidateFor = 0 }
    } else { candidate = bucket; candidateFor = dt }
  }

  const out = { slug, bpm: bestBpm, durationS: +durationS.toFixed(2), beats, sections, bands: { rateHz: RATE_HZ, data: bands } }
  const dest = join(outDir, `${slug}.json`)
  writeFileSync(dest, JSON.stringify(out))
  console.log(`${slug}: ${durationS.toFixed(0)}s, ${beats.length} beats, ${bestBpm} bpm, ${sections.length} sections → ${dest}`)
}
