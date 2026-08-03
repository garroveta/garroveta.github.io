import { beforeEach, describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import { createLocalDemoRepository, DEMO_STORAGE_KEY } from './demoRepository'
import type { DemoDataSet } from '../domain/types'

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

  it('replaces an outdated scenario that still contains a retired game', () => {
    const outdatedData: DemoDataSet = structuredClone(demoData)
    outdatedData.games.push({
      id: 'game-marvel',
      communityId: outdatedData.community.id,
      name: 'Marvel',
      shortName: 'Marvel',
      category: 'card_game',
      color: '#9e2f42',
    })
    outdatedData.events.push({
      id: 'event-marvel-draft-night',
      communityId: outdatedData.community.id,
      gameId: 'game-marvel',
      type: 'draft',
      title: 'Draft Night Marvel',
      description: 'Ancienne activité à retirer.',
      startsAt: '2026-08-01T17:00:00+02:00',
      endsAt: '2026-08-01T21:00:00+02:00',
      capacity: 24,
      status: 'scheduled',
      tagIds: ['tag-draft'],
      createdByMemberId: 'member-lucia',
      registrationSummary: { confirmed: 14, waitlisted: 0 },
    })
    window.localStorage.setItem(
      DEMO_STORAGE_KEY,
      JSON.stringify({
        version: 8,
        savedAt: '2026-08-01T12:00:00+02:00',
        data: outdatedData,
      }),
    )

    const repository = createLocalDemoRepository(window.localStorage)
    const loadedData = repository.load()

    expect(loadedData.games.some(({ id }) => id === 'game-marvel')).toBe(false)
    expect(
      loadedData.events.some(({ gameId }) => gameId === 'game-marvel'),
    ).toBe(false)
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
