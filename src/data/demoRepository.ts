import { demoData } from './demoData'
import { DEFAULT_COMMUNITY_RANKING_SETTINGS } from './rankingSettings'
import { DEFAULT_COMMUNITY_REGISTRATION_SETTINGS } from './registrationSettings'
import type { DemoDataSet } from '../domain/types'

export const DEMO_STORAGE_KEY = 'mtg-community:demo-data'
export const DEMO_STORAGE_VERSION = 23

type DemoStorageEnvelope = {
  version: number
  savedAt: string
  data: DemoDataSet
}

export type DemoDataUpdater =
  DemoDataSet | ((currentData: DemoDataSet) => DemoDataSet)

export interface DemoDataRepository {
  load: () => DemoDataSet
  save: (data: DemoDataSet) => void
  reset: () => DemoDataSet
}

function cloneSeedData(): DemoDataSet {
  return structuredClone(demoData)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isDemoDataSet(value: unknown): value is DemoDataSet {
  if (!isRecord(value) || !isRecord(value.community)) {
    return false
  }

  return (
    typeof value.currentMemberId === 'string' &&
    typeof value.community.id === 'string' &&
    typeof value.community.name === 'string' &&
    typeof value.community.city === 'string' &&
    typeof value.community.memberCount === 'number' &&
    Array.isArray(value.community.openingHours) &&
    Array.isArray(value.games) &&
    Array.isArray(value.competitionFormats) &&
    Array.isArray(value.competitionEventKinds) &&
    isRecord(value.rankingSettings) &&
    isRecord(value.registrationSettings) &&
    Array.isArray(value.tags) &&
    Array.isArray(value.members) &&
    Array.isArray(value.events) &&
    Array.isArray(value.eventStandings) &&
    Array.isArray(value.registrations) &&
    Array.isArray(value.newsPosts) &&
    Array.isArray(value.cards) &&
    Array.isArray(value.cardLists) &&
    Array.isArray(value.listings) &&
    Array.isArray(value.wantedCards) &&
    Array.isArray(value.cardMatches) &&
    Array.isArray(value.cardDeals)
  )
}

function applySeedEventImages(data: DemoDataSet): DemoDataSet {
  const seedImagesByEventId = new Map(
    demoData.events.flatMap((event) =>
      event.imageUri ? [[event.id, event.imageUri] as const] : [],
    ),
  )

  return {
    ...data,
    events: data.events.map((event) => ({
      ...event,
      imageUri: event.imageUri ?? seedImagesByEventId.get(event.id),
    })),
  }
}

function parseStoredData(rawValue: string): DemoDataSet | null {
  try {
    const envelope: unknown = JSON.parse(rawValue)

    if (!isRecord(envelope) || !isRecord(envelope.data)) {
      return null
    }

    if (envelope.version === 21 && !isRecord(envelope.data.rankingSettings)) {
      const migratedData = {
        ...envelope.data,
        rankingSettings: structuredClone(DEFAULT_COMMUNITY_RANKING_SETTINGS),
        registrationSettings: structuredClone(
          DEFAULT_COMMUNITY_REGISTRATION_SETTINGS,
        ),
      }

      return isDemoDataSet(migratedData)
        ? applySeedEventImages(structuredClone(migratedData))
        : null
    }

    if (
      envelope.version === 22 &&
      !isRecord(envelope.data.registrationSettings)
    ) {
      const migratedData = {
        ...envelope.data,
        registrationSettings: structuredClone(
          DEFAULT_COMMUNITY_REGISTRATION_SETTINGS,
        ),
      }

      return isDemoDataSet(migratedData)
        ? applySeedEventImages(structuredClone(migratedData))
        : null
    }

    if (
      envelope.version !== DEMO_STORAGE_VERSION ||
      !isDemoDataSet(envelope.data)
    ) {
      return null
    }

    return applySeedEventImages(structuredClone(envelope.data))
  } catch {
    return null
  }
}

export function createLocalDemoRepository(
  storage: Storage,
): DemoDataRepository {
  const save = (data: DemoDataSet) => {
    const envelope: DemoStorageEnvelope = {
      version: DEMO_STORAGE_VERSION,
      savedAt: new Date().toISOString(),
      data,
    }

    try {
      storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(envelope))
    } catch {
      // The prototype remains usable with in-memory data when storage is full
      // or unavailable, for example in a restricted private browsing context.
    }
  }

  const load = () => {
    try {
      const storedValue = storage.getItem(DEMO_STORAGE_KEY)

      if (storedValue) {
        const storedData = parseStoredData(storedValue)

        if (storedData) {
          return storedData
        }
      }
    } catch {
      // Fall back to the seed data when browser storage cannot be read.
    }

    const seedData = cloneSeedData()
    save(seedData)
    return seedData
  }

  const reset = () => {
    const seedData = cloneSeedData()
    save(seedData)
    return seedData
  }

  return {
    load,
    save,
    reset,
  }
}
