#!/usr/bin/env node
// Regenerate every `<name>-thumb.jpg` under public/stills from its full-size
// `<name>.jpg` (400 px wide, JPEG q≈5) using ffmpeg on PATH. Run: `npm run thumbs`.
// Only walks the universe folders the manifest uses; skips `_candidates/`.
import { execFileSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { join, dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const STILLS_DIR = join(ROOT, 'public', 'stills')
const WIDTH = 400
// Thumbs no manifest entry references (posix paths relative to public/stills).
const SKIP = []

function* jpegs(dir) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('_') || name.startsWith('.')) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* jpegs(p)
    else if (/\.jpe?g$/i.test(name) && !/-thumb\.jpe?g$/i.test(name)) yield p
  }
}

let n = 0
for (const src of jpegs(STILLS_DIR)) {
  const out = src.replace(/\.jpe?g$/i, '-thumb.jpg')
  const rel = out.slice(STILLS_DIR.length + 1).split(sep).join('/')
  if (SKIP.includes(rel)) { console.log(`${rel}  skipped (unreferenced)`); continue }
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-vf', `scale=${WIDTH}:-1`, '-q:v', '5', out], { stdio: 'inherit' })
  const kb = (statSync(out).size / 1024).toFixed(1)
  console.log(`${out.slice(ROOT.length + 1)}  ${kb} KB`)
  n++
}
if (n === 0) { console.error('make-thumbs: no full-size stills found under public/stills'); process.exit(1) }
console.log(`make-thumbs: ${n} thumbnail(s) written`)
