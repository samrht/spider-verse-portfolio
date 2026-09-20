import { describe, it, expect } from 'vitest'
import { UNIVERSES, universeById } from '../universes'
import { STILLS, stillById } from '../stills'
import { COVER } from '../cover'
import { projects, projectBySlug } from '../projects'
import { UNIVERSE_IDS } from '../../store/universeStore'

describe('comic data', () => {
  it('has exactly four universes in story order', () => {
    expect(UNIVERSES.map((u) => u.id)).toEqual(['616', 'mcu', 'toon', 'verse'])
    expect(UNIVERSES.map((u) => u.id)).toEqual([...UNIVERSE_IDS])
    expect(UNIVERSES.map((u) => u.chapter.number)).toEqual([1, 2, 3, 4])
  })
  it('uses splash for 616/mcu and grid for toon/verse', () => {
    expect(universeById('616').layout).toBe('splash')
    expect(universeById('mcu').layout).toBe('splash')
    expect(universeById('toon').layout).toBe('grid')
    expect(universeById('verse').layout).toBe('grid')
  })
  it('every itemSlug resolves to a project in the same universe', () => {
    for (const u of UNIVERSES) for (const slug of u.itemSlugs) {
      const p = projectBySlug(slug)
      expect(p, `${u.id}: ${slug}`).toBeDefined()
      expect(p!.universe).toBe(u.id)
    }
  })
  it('616 holds no projects; every other project is listed exactly once', () => {
    expect(universeById('616').itemSlugs).toEqual([])
    const listed = UNIVERSES.flatMap((u) => u.itemSlugs)
    const all = projects.filter((p) => p.universe !== '616').map((p) => p.slug)
    expect([...listed].sort()).toEqual([...all].sort())
    expect(new Set(listed).size).toBe(listed.length)
  })
  it('includes every vault project except the Sneha portfolio', () => {
    const slugs = projects.map((p) => p.slug)
    for (const s of ['drishti', 'idea-lab', 'execution-os', 'research-agent', 'founder-discovery',
      'blackhole-sim', 'montecarlo-risk-dashboard', 'siply-smart', 'ledger-investment-lab',
      'investing-assistant', 'algo-trading-starter', 'living-task-canvas', 'productivity-dashboard',
      'discord-bot-template', 'transcript-tool', 'claude-design-system', 'spider-verse-portfolio'])
      expect(slugs, s).toContain(s)
    expect(slugs.join(' ')).not.toMatch(/sneha/i)
  })
  it('every still has a credit and every referenced still exists', () => {
    for (const s of STILLS) { expect(s.credit.title).toBeTruthy(); expect(s.credit.owner).toBeTruthy(); expect(s.src).toMatch(/^\/stills\//) }
    for (const u of UNIVERSES) expect(stillById(u.stillId), u.id).toBeDefined()
    expect(stillById(COVER.stillId)).toBeDefined()
  })
  it('cover lines cover all four universes', () => {
    expect(COVER.coverLines.map((c) => c.universeId).sort()).toEqual(['616', 'mcu', 'toon', 'verse'])
  })
})
