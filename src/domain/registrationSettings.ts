import type {
  CommunityRegistrationSettings,
  EventRegistrationRule,
  EventType,
} from './types'

export const EVENT_TYPES = [
  'tournament',
  'league',
  'draft',
  'casual',
  'workshop',
  'launch',
] as const satisfies readonly EventType[]

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
    settings.rules.length === EVENT_TYPES.length &&
    eventTypes.size === settings.rules.length &&
    EVENT_TYPES.every((eventType) => eventTypes.has(eventType)) &&
    settings.rules.every(
      ({ defaultCapacity }) =>
        Number.isInteger(defaultCapacity) &&
        defaultCapacity >= 1 &&
        defaultCapacity <= 500,
    )
  )
}
