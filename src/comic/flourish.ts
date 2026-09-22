import glitchFrag from '../shaders/glitch.frag?raw'

// Per-skin flourishes, triggered by the 'comic:enter' event bindAll fires.
// 616/mcu/toon: sfx word pop · mcu: HUD reticle scan over the still · toon: speed
// lines on the first frame · verse: chromatic glitch tick every 6–9 s.
type GSAP = typeof import('gsap').gsap

export function bindFlourishes(root: HTMLElement, gsap: GSAP): () => void {
  const cleanups: Array<() => void> = []
  root.querySelectorAll<HTMLElement>('.comic-panel').forEach((panel) => {
    const id = panel.getAttribute('data-universe')
    const onEnter = () => {
      if (id === '616' || id === 'mcu' || id === 'toon') {
        const sfx = panel.querySelector('.comic-sfx')
        if (sfx) gsap.fromTo(sfx, { scale: 0, rotation: -30 }, { scale: 1, rotation: -8, duration: 0.5, ease: 'back.out(2)' })
      }
      if (id === 'mcu') {
        const still = panel.querySelector<HTMLElement>('.splash-still')
        if (still) {
          const line = document.createElement('div')
          line.className = 'mcu-reticle'
          still.appendChild(line)
          // Travel the still's full height (yPercent would only cover the 2px line).
          gsap.fromTo(line, { y: -2 }, { y: still.clientHeight + 2, duration: 1.2, ease: 'power1.inOut', onComplete: () => line.remove() })
        }
      }
      if (id === 'toon') {
        const first = panel.querySelector<HTMLElement>('[data-motion="frame"]')
        if (first) {
          first.classList.add('toon-burst')
          setTimeout(() => first.classList.remove('toon-burst'), 500)
        }
      }
    }
    panel.addEventListener('comic:enter', onEnter)
    cleanups.push(() => panel.removeEventListener('comic:enter', onEnter))

    if (id === 'verse') {
      let timer = 0
      const tick = () => {
        panel.classList.add('verse-glitch')
        setTimeout(() => panel.classList.remove('verse-glitch'), 180)
        timer = window.setTimeout(tick, 6000 + Math.random() * 3000)
      }
      timer = window.setTimeout(tick, 4000)
      cleanups.push(() => clearTimeout(timer))
    }
  })
  void glitchFrag // reserved: a WebGL glitch quad is a follow-up; v1 uses the CSS tick above
  return () => cleanups.forEach((c) => c())
}
