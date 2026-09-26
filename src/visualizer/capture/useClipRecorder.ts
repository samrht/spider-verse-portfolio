import { useCallback, useEffect, useRef, useState } from 'react'
import { useUniverseStore } from '../../store/universeStore'
import { useMixtapeStore } from '../../store/mixtapeStore'
import { MIXTAPE_TRACKS } from '../../data/mixtape'
import { getMediaElement } from '../../engine/mixtapeEngine'
import { labelFor } from '../../comic/pageNav'
import { audioTap } from '../signal/LiveFFT'
import { CLIP_FPS, CLIP_H, CLIP_SECONDS, CLIP_W, clipFilename, drawComposite, pickMimeType, type CompositeOpts } from './clip'

// Receives each rendered WebGL frame while a clip is recording
// (VisualizerCanvas mounts its capture tap only while a sink exists).
export interface FrameSink { draw(gl: HTMLCanvasElement): void }

export function clipSupported(): boolean {
  if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement === 'undefined') return false
  if (!('captureStream' in HTMLCanvasElement.prototype)) return false
  return pickMimeType((t) => MediaRecorder.isTypeSupported(t)) !== null
}

function currentMeta(): CompositeOpts {
  const universe = useUniverseStore.getState().activeUniverse
  const track = MIXTAPE_TRACKS[useMixtapeStore.getState().currentIndex] ?? MIXTAPE_TRACKS[0]
  return { universe, universeLabel: labelFor(universe), title: track.title, artist: track.artist, watermark: window.location.host }
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// 10-second clip of /mixtape: composites backdrop + dots + caption into an
// offscreen canvas each frame and records it with the local track's audio
// (silent when nothing local is playing). Saves the file when it stops.
export function useClipRecorder() {
  const [supported] = useState(clipSupported)
  const [sink, setSink] = useState<FrameSink | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const stopRef = useRef<(() => void) | null>(null)

  const start = useCallback((opts: { withAudio?: boolean } = {}) => {
    if (!supported || stopRef.current) return
    const fmt = pickMimeType((t) => MediaRecorder.isTypeSupported(t))
    const canvas = document.createElement('canvas')
    canvas.width = CLIP_W
    canvas.height = CLIP_H
    const ctx = canvas.getContext('2d')
    if (!fmt || !ctx) return

    const startMeta = currentMeta()
    const video = canvas.captureStream(CLIP_FPS)
    const tap = opts.withAudio === false ? null : audioTap(getMediaElement())
    const stream = new MediaStream([...video.getVideoTracks(), ...(tap ? tap.stream.getAudioTracks() : [])])
    const rec = new MediaRecorder(stream, { mimeType: fmt.mime, videoBitsPerSecond: 6_000_000 })
    const chunks: Blob[] = []
    let timer = 0
    let tick = 0

    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    rec.onstop = () => {
      window.clearTimeout(timer)
      window.clearInterval(tick)
      tap?.release()
      stream.getTracks().forEach((t) => t.stop())
      stopRef.current = null
      setSink(null)
      setSecondsLeft(0)
      if (chunks.length) download(new Blob(chunks, { type: fmt.mime }), clipFilename(startMeta.universe, startMeta.title, fmt.ext))
    }

    // The caption follows the page (a mid-clip universe or track change shows).
    setSink({ draw: (gl) => drawComposite(ctx, gl, currentMeta()) })
    rec.start(250)
    const t0 = performance.now()
    setSecondsLeft(CLIP_SECONDS)
    tick = window.setInterval(() => {
      setSecondsLeft(Math.max(0, CLIP_SECONDS - Math.floor((performance.now() - t0) / 1000)))
    }, 250)
    const stopNow = () => { if (rec.state !== 'inactive') rec.stop() }
    timer = window.setTimeout(stopNow, CLIP_SECONDS * 1000)
    stopRef.current = stopNow
  }, [supported])

  const stop = useCallback(() => { stopRef.current?.() }, [])
  useEffect(() => () => { stopRef.current?.() }, [])

  return { supported, recording: sink !== null, secondsLeft, start, stop, sink }
}
