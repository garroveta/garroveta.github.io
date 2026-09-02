import { type AuthEnv } from './auth'
import {
  authorizeApprovedManager,
  authorizeApprovedMember,
} from './authorization'
import { ApiRequestError, apiError, jsonResponse, readJsonBody } from './http'

const RESOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/
const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Weekday = (typeof WEEKDAYS)[number]

interface CommunitySettingsRequestContext {
  context: ExecutionContext
  env: AuthEnv
  request: Request
}

export interface CommunitySettingsRoute {
  communityId: string
}

interface OpeningHours {
  day: Weekday
  opensAt?: string
  closesAt?: string
  closesNextDay?: boolean
}

interface CommunitySettingsInput {
  address?: string
  city: string
  contactEmail?: string
  contactPhone?: string
  facebookUrl?: string
  instagramUrl?: string
  logoUrl?: string
  name: string
  openingHours: OpeningHours[]
  websiteUrl?: string
}

interface CommunitySettingsRow {
  address: string | null
  city: string
  contact_email: string | null
  contact_phone: string | null
  facebook_url: string | null
  id: string
  instagram_url: string | null
  logo_url: string | null
  name: string
  opening_hours: string
  website_url: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseRequiredText(
  value: unknown,
  fieldName: string,
  minimumLength: number,
  maximumLength: number,
) {
  if (typeof value !== 'string') {
    throw new ApiRequestError(
      400,
      'community_settings_invalid',
      `${fieldName} must be a string.`,
    )
  }

  const normalized = value.trim()

  if (normalized.length < minimumLength || normalized.length > maximumLength) {
    throw new ApiRequestError(
      400,
      'community_settings_invalid',
      `${fieldName} must contain between ${minimumLength} and ${maximumLength} characters.`,
    )
  }

  return normalized
}

function parseOptionalText(
  value: unknown,
  fieldName: string,
  maximumLength: number,
) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  return parseRequiredText(value, fieldName, 1, maximumLength)
}

function parseOptionalUrl(value: unknown, fieldName: string) {
  const normalized = parseOptionalText(value, fieldName, 2048)

  if (!normalized) {
    return undefined
  }

  let url: URL

  try {
    url = new URL(normalized)
  } catch {
    throw new ApiRequestError(
      400,
      'community_settings_invalid',
      `${fieldName} must be a valid URL.`,
    )
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ApiRequestError(
      400,
      'community_settings_invalid',
      `${fieldName} must use HTTP or HTTPS.`,
    )
  }

  return normalized
}

function parseOptionalTime(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value !== 'string' || !TIME_PATTERN.test(value)) {
    throw new ApiRequestError(
      400,
      'community_settings_invalid',
      `${fieldName} must use the HH:mm format.`,
    )
  }

  return value
}

function parseOpeningHours(value: unknown): OpeningHours[] {
  if (!Array.isArray(value) || value.length !== WEEKDAYS.length) {
    throw new ApiRequestError(
      400,
      'community_settings_invalid',
      'openingHours must contain the seven days of the week.',
    )
  }

  const entries = value.map((candidate) => {
    if (!isRecord(candidate) || !WEEKDAYS.includes(candidate.day as Weekday)) {
      throw new ApiRequestError(
        400,
        'community_settings_invalid',
        'Every opening-hours entry must use a valid weekday.',
      )
    }

    const day = candidate.day as Weekday
    const opensAt = parseOptionalTime(candidate.opensAt, `${day}.opensAt`)
    const closesAt = parseOptionalTime(candidate.closesAt, `${day}.closesAt`)
    const closesNextDay = candidate.closesNextDay

    if (
      closesNextDay !== undefined &&
      closesNextDay !== false &&
      closesNextDay !== true
    ) {
      throw new ApiRequestError(
        400,
        'community_settings_invalid',
        `${day}.closesNextDay must be a boolean.`,
      )
    }

    if (!opensAt && !closesAt && !closesNextDay) {
      return { day }
    }

    if (!opensAt || !closesAt || opensAt === '24:00') {
      throw new ApiRequestError(
        400,
        'community_settings_invalid',
        `${day} must contain a complete opening and closing time.`,
      )
    }

    return {
      day,
      opensAt,
      closesAt,
      ...(closesNextDay ? { closesNextDay: true } : {}),
    }
  })

  const days = new Set(entries.map(({ day }) => day))

  if (days.size !== WEEKDAYS.length) {
    throw new ApiRequestError(
      400,
      'community_settings_invalid',
      'openingHours cannot contain duplicate weekdays.',
    )
  }

  return WEEKDAYS.map((day) => entries.find((entry) => entry.day === day)!)
}

function parseCommunitySettingsInput(value: unknown): CommunitySettingsInput {
  if (!isRecord(value)) {
    throw new ApiRequestError(
      400,
      'community_settings_invalid',
      'Community settings must be a JSON object.',
    )
  }

  const contactEmail = parseOptionalText(
    value.contactEmail,
    'contactEmail',
    254,
  )
  const contactPhone = parseOptionalText(value.contactPhone, 'contactPhone', 40)

  if (contactEmail && !EMAIL_PATTERN.test(contactEmail)) {
    throw new ApiRequestError(
      400,
      'community_settings_invalid',
      'contactEmail must be a valid email address.',
    )
  }

  if (contactPhone && contactPhone.replace(/\D/g, '').length < 6) {
    throw new ApiRequestError(
      400,
      'community_settings_invalid',
      'contactPhone must contain at least six digits.',
    )
  }

  return {
    name: parseRequiredText(value.name, 'name', 2, 120),
    city: parseRequiredText(value.city, 'city', 2, 120),
    address: parseOptionalText(value.address, 'address', 300),
    contactEmail,
    contactPhone,
    websiteUrl: parseOptionalUrl(value.websiteUrl, 'websiteUrl'),
    instagramUrl: parseOptionalUrl(value.instagramUrl, 'instagramUrl'),
    facebookUrl: parseOptionalUrl(value.facebookUrl, 'facebookUrl'),
    logoUrl: parseOptionalUrl(value.logoUrl, 'logoUrl'),
    openingHours: parseOpeningHours(value.openingHours),
  }
}

function toCommunitySettings(row: CommunitySettingsRow) {
  let openingHours: OpeningHours[]

  try {
    openingHours = parseOpeningHours(JSON.parse(row.opening_hours) as unknown)
  } catch {
    throw new Error('Stored community opening hours are not valid.')
  }

  return {
    id: row.id,
    name: row.name,
    city: row.city,
    address: row.address ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    contactPhone: row.contact_phone ?? undefined,
    websiteUrl: row.website_url ?? undefined,
    instagramUrl: row.instagram_url ?? undefined,
    facebookUrl: row.facebook_url ?? undefined,
    logoUrl: row.logo_url ?? undefined,
    openingHours,
  }
}

async function readCommunitySettings(db: D1Database, communityId: string) {
  return db
    .prepare(
      `select
        id,
        name,
        city,
        address,
        contact_email,
        contact_phone,
        website_url,
        instagram_url,
        facebook_url,
        logo_url,
        opening_hours
      from community
      where id = ?
      limit 1`,
    )
    .bind(communityId)
    .first<CommunitySettingsRow>()
}

export function matchCommunitySettingsRoute(
  pathname: string,
): CommunitySettingsRoute | null {
  const match = pathname.match(/^\/api\/communities\/([^/]+)\/settings\/?$/)
  const communityId = match?.[1]

  return communityId && RESOURCE_ID_PATTERN.test(communityId)
    ? { communityId }
    : null
}

async function getCommunitySettings(
  requestContext: CommunitySettingsRequestContext,
  communityId: string,
) {
  const row = await readCommunitySettings(requestContext.env.DB, communityId)

  if (!row) {
    return apiError(404, 'community_not_found', 'Community not found.')
  }

  return jsonResponse({ community: toCommunitySettings(row) })
}

async function updateCommunitySettings(
  requestContext: CommunitySettingsRequestContext,
  communityId: string,
  managerMemberId: string,
) {
  const input = parseCommunitySettingsInput(
    await readJsonBody(requestContext.request, 16_384),
  )
  const now = new Date().toISOString()
  const updated = await requestContext.env.DB.prepare(
    `update community
    set name = ?,
        city = ?,
        address = ?,
        contact_email = ?,
        contact_phone = ?,
        website_url = ?,
        instagram_url = ?,
        facebook_url = ?,
        logo_url = ?,
        opening_hours = ?,
        updated_at = ?
    where id = ?
    returning
      id,
      name,
      city,
      address,
      contact_email,
      contact_phone,
      website_url,
      instagram_url,
      facebook_url,
      logo_url,
      opening_hours`,
  )
    .bind(
      input.name,
      input.city,
      input.address ?? null,
      input.contactEmail ?? null,
      input.contactPhone ?? null,
      input.websiteUrl ?? null,
      input.instagramUrl ?? null,
      input.facebookUrl ?? null,
      input.logoUrl ?? null,
      JSON.stringify(input.openingHours),
      now,
      communityId,
    )
    .first<CommunitySettingsRow>()

  if (!updated) {
    return apiError(404, 'community_not_found', 'Community not found.')
  }

  console.info(
    JSON.stringify({
      actorMemberId: managerMemberId,
      communityId,
      event: 'community.settings_updated',
    }),
  )

  return jsonResponse({ community: toCommunitySettings(updated) })
}

export async function handleCommunitySettingsApiRequest(
  requestContext: CommunitySettingsRequestContext,
  route: CommunitySettingsRoute,
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
      ? await getCommunitySettings(requestContext, route.communityId)
      : await updateCommunitySettings(
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
