import type {
  CommunityRegistrationSettings,
  DemoDataSet,
  EventRegistrationRule,
  EventType,
} from '../domain/types'

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  tournament: 'Torneo',
  league: 'Liga',
  draft: 'Draft',
  casual: 'Juego libre',
  workshop: 'Taller',
  launch: 'Presentación',
}

export const DEFAULT_COMMUNITY_REGISTRATION_SETTINGS: CommunityRegistrationSettings =
  {
    rules: [
      {
        eventType: 'tournament',
        enabledByDefault: false,
        defaultCapacity: 24,
        waitlistEnabled: true,
      },
      {
        eventType: 'league',
        enabledByDefault: false,
        defaultCapacity: 24,
        waitlistEnabled: true,
      },
      {
        eventType: 'draft',
        enabledByDefault: true,
        defaultCapacity: 8,
        waitlistEnabled: true,
      },
      {
        eventType: 'casual',
        enabledByDefault: false,
        defaultCapacity: 24,
        waitlistEnabled: false,
      },
      {
        eventType: 'workshop',
        enabledByDefault: false,
        defaultCapacity: 12,
        waitlistEnabled: false,
      },
      {
        eventType: 'launch',
        enabledByDefault: true,
        defaultCapacity: 30,
        waitlistEnabled: true,
      },
    ],
  }

export function getRegistrationRule(
  settings: CommunityRegistrationSettings,
  eventType: EventType,
): EventRegistrationRule {
  return (
    settings.rules.find((rule) => rule.eventType === eventType) ??
    DEFAULT_COMMUNITY_REGISTRATION_SETTINGS.rules.find(
      (rule) => rule.eventType === eventType,
    )!
  )
}

export function isCommunityRegistrationSettingsValid(
  settings: CommunityRegistrationSettings,
) {
  const eventTypes = new Set(settings.rules.map(({ eventType }) => eventType))

  return (
    settings.rules.length ===
      DEFAULT_COMMUNITY_REGISTRATION_SETTINGS.rules.length &&
    eventTypes.size === settings.rules.length &&
    settings.rules.every(
      ({ defaultCapacity }) =>
        Number.isInteger(defaultCapacity) &&
        defaultCapacity >= 1 &&
        defaultCapacity <= 500,
    )
  )
}

export function updateCommunityRegistrationSettings(
  data: DemoDataSet,
  managerId: string,
  settings: CommunityRegistrationSettings,
): DemoDataSet {
  const manager = data.members.find(
    ({ id, role, status }) =>
      id === managerId && role === 'manager' && status === 'approved',
  )

  if (!manager || !isCommunityRegistrationSettingsValid(settings)) {
    return data
  }

  return {
    ...data,
    registrationSettings: structuredClone(settings),
  }
}
