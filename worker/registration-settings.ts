import { type AuthEnv } from './auth'
import {
  DEFAULT_COMMUNITY_REGISTRATION_SETTINGS,
  EVENT_TYPES,
} from '../src/domain/registrationSettings'
import type {
  CommunityRegistrationSettings,
  EventRegistrationRule,
  EventType,
} from '../src/domain/types'
import {
  authorizeApprovedManager,
  authorizeApprovedMember,
} from './authorization'
import { ApiRequestError, apiError, jsonResponse, readJsonBody } from './http'

const RESOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/
interface RegistrationSettingsRequestContext {
  context: ExecutionContext
  env: AuthEnv
  request: Request
}

export interface RegistrationSettingsRoute {
  communityId: string
}

interface RegistrationRuleRow {
  event_type: EventType
  enabled_by_default: number
  default_capacity: number
  waitlist_enabled: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseBoolean(value: unknown, fieldName: string) {
  if (typeof value !== 'boolean') {
    throw new ApiRequestError(
      400,
      'registration_settings_invalid',
      `${fieldName} must be a boolean.`,
    )
  }

  return value
}

function parseEventType(value: unknown) {
  if (typeof value !== 'string' || !EVENT_TYPES.includes(value as EventType)) {
    throw new ApiRequestError(
      400,
      'registration_settings_invalid',
      'eventType is not supported.',
    )
  }

  return value as EventType
}

function parseRule(value: unknown, index: number): EventRegistrationRule {
  if (!isRecord(value)) {
    throw new ApiRequestError(
      400,
      'registration_settings_invalid',
      `rules[${index}] must be a JSON object.`,
    )
  }

  const allowedFields = new Set([
    'eventType',
    'enabledByDefault',
    'defaultCapacity',
    'waitlistEnabled',
  ])
  const unknownField = Object.keys(value).find(
    (field) => !allowedFields.has(field),
  )

  if (unknownField) {
    throw new ApiRequestError(
      400,
      'registration_settings_invalid',
      `Unknown registration rule field: ${unknownField}.`,
    )
  }

  if (
    !Number.isInteger(value.defaultCapacity) ||
    Number(value.defaultCapacity) < 1 ||
    Number(value.defaultCapacity) > 500
  ) {
    throw new ApiRequestError(
      400,
      'registration_settings_invalid',
      'defaultCapacity must be an integer between 1 and 500.',
    )
  }

  return {
    eventType: parseEventType(value.eventType),
    enabledByDefault: parseBoolean(value.enabledByDefault, 'enabledByDefault'),
    defaultCapacity: Number(value.defaultCapacity),
    waitlistEnabled: parseBoolean(value.waitlistEnabled, 'waitlistEnabled'),
  }
}

function parseSettings(value: unknown): CommunityRegistrationSettings {
  if (!isRecord(value) || !Array.isArray(value.rules)) {
    throw new ApiRequestError(
      400,
      'registration_settings_invalid',
      'Registration settings must contain a rules array.',
    )
  }

  const unknownField = Object.keys(value).find((field) => field !== 'rules')

  if (unknownField) {
    throw new ApiRequestError(
      400,
      'registration_settings_invalid',
      `Unknown registration settings field: ${unknownField}.`,
    )
  }

  const rules = value.rules.map(parseRule)
  const eventTypes = new Set(rules.map(({ eventType }) => eventType))

  if (
    rules.length !== EVENT_TYPES.length ||
    eventTypes.size !== EVENT_TYPES.length ||
    EVENT_TYPES.some((eventType) => !eventTypes.has(eventType))
  ) {
    throw new ApiRequestError(
      400,
      'registration_settings_invalid',
      'rules must contain every event type exactly once.',
    )
  }

  return {
    rules: EVENT_TYPES.map((eventType) =>
      rules.find((rule) => rule.eventType === eventType)!,
    ),
  }
}

function toRegistrationRule(row: RegistrationRuleRow): EventRegistrationRule {
  return {
    eventType: row.event_type,
    enabledByDefault: row.enabled_by_default === 1,
    defaultCapacity: row.default_capacity,
    waitlistEnabled: row.waitlist_enabled === 1,
  }
}

function mergeWithDefaults(rows: RegistrationRuleRow[]) {
  const persistedRules = new Map(
    rows.map((row) => [row.event_type, toRegistrationRule(row)]),
  )

  return {
    rules: DEFAULT_COMMUNITY_REGISTRATION_SETTINGS.rules.map(
      (defaultRule) => persistedRules.get(defaultRule.eventType) ?? defaultRule,
    ),
  }
}

export function matchRegistrationSettingsRoute(
  pathname: string,
): RegistrationSettingsRoute | null {
  const match = pathname.match(
    /^\/api\/communities\/([^/]+)\/registration-settings\/?$/,
  )
  const communityId = match?.[1]

  return communityId && RESOURCE_ID_PATTERN.test(communityId)
    ? { communityId }
    : null
}

async function getRegistrationSettings(
  requestContext: RegistrationSettingsRequestContext,
  communityId: string,
) {
  const result = await requestContext.env.DB.prepare(
    `select
      event_type,
      enabled_by_default,
      default_capacity,
      waitlist_enabled
    from community_event_registration_rule
    where community_id = ?`,
  )
    .bind(communityId)
    .all<RegistrationRuleRow>()

  return jsonResponse({
    registrationSettings: mergeWithDefaults(result.results),
  })
}

async function updateRegistrationSettings(
  requestContext: RegistrationSettingsRequestContext,
  communityId: string,
  managerMemberId: string,
) {
  const settings = parseSettings(
    await readJsonBody(requestContext.request, 16_384),
  )
  const now = new Date().toISOString()

  await requestContext.env.DB.batch(
    settings.rules.map((rule) =>
      requestContext.env.DB.prepare(
        `insert into community_event_registration_rule
          (community_id, event_type, enabled_by_default, default_capacity, waitlist_enabled, updated_at)
        values (?, ?, ?, ?, ?, ?)
        on conflict (community_id, event_type) do update set
          enabled_by_default = excluded.enabled_by_default,
          default_capacity = excluded.default_capacity,
          waitlist_enabled = excluded.waitlist_enabled,
          updated_at = excluded.updated_at`,
      ).bind(
        communityId,
        rule.eventType,
        Number(rule.enabledByDefault),
        rule.defaultCapacity,
        Number(rule.waitlistEnabled),
        now,
      ),
    ),
  )

  console.info(
    JSON.stringify({
      actorMemberId: managerMemberId,
      communityId,
      event: 'community.registration_settings_updated',
    }),
  )

  return jsonResponse({ registrationSettings: settings })
}

export async function handleRegistrationSettingsApiRequest(
  requestContext: RegistrationSettingsRequestContext,
  route: RegistrationSettingsRoute,
) {
  const method = requestContext.request.method

  if (method !== 'GET' && method !== 'PATCH') {
    return apiError(
      405,
      'method_not_allowed',
      'This endpoint only accepts GET or PATCH requests.',
      { Allow: 'GET, PATCH' },
    )
  }

  try {
    const authorization =
      method === 'GET'
        ? await authorizeApprovedMember(requestContext, route.communityId)
        : await authorizeApprovedManager(requestContext, route.communityId)

    if (!authorization.authorized) {
      return authorization.response
    }

    return method === 'GET'
      ? await getRegistrationSettings(requestContext, route.communityId)
      : await updateRegistrationSettings(
          requestContext,
          route.communityId,
          authorization.value.membership.id,
        )
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return apiError(error.status, error.code, error.message)
    }

    throw error
  }
}
