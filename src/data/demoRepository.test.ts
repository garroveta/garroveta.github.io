import { beforeEach, describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import { createLocalDemoRepository, DEMO_STORAGE_KEY } from './demoRepository'

describe('local demo repository', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('loads and stores a fresh copy of the seed data', () => {
    const repository = createLocalDemoRepository(window.localStorage)
    const data = repository.load()

    expect(data).toEqual(demoData)
    expect(data).not.toBe(demoData)
    expect(window.localStorage.getItem(DEMO_STORAGE_KEY)).not.toBeNull()
  })

  it('restores data saved during a previous session', () => {
    const repository = createLocalDemoRepository(window.localStorage)
    const modifiedData = structuredClone(demoData)
    modifiedData.community.memberCount = 151

    repository.save(modifiedData)

    expect(repository.load().community.memberCount).toBe(151)
  })

  it('falls back to seed data when storage is corrupted', () => {
    window.localStorage.setItem(DEMO_STORAGE_KEY, '{not-valid-json')

    const repository = createLocalDemoRepository(window.localStorage)

    expect(repository.load()).toEqual(demoData)
  })

  it('restores the original scenario on reset', () => {
    const repository = createLocalDemoRepository(window.localStorage)
    const modifiedData = structuredClone(demoData)
    modifiedData.community.name = 'Otra comunidad'
    repository.save(modifiedData)

    const resetData = repository.reset()

    expect(resetData.community.name).toBe('CRC Delorean')
    expect(repository.load().community.name).toBe('CRC Delorean')
  })
})
