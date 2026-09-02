import { type AuthEnv } from './auth'
import {
  authorizeApprovedManager,
  authorizeApprovedMember,
  type ApprovedMembership,
} from './authorization'
import { ApiRequestError, apiError, jsonResponse, readJsonBody } from './http'

const RESOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/
const COMMUNICATION_TYPES = [
  'news',
  'promotion',
  'arrival',
  'urgent',
  'poll',
  'rule',
] as const

type CommunicationType = (typeof COMMUNICATION_TYPES)[number]

interface CommunicationRequestContext {
  context: ExecutionContext
  env: AuthEnv
  request: Request
}

export interface CommunicationRoute {
  communicationId?: string
  communityId: string
  kind: 'collection' | 'communication'
}

interface CommunicationRow {
  author_display_name: string
  author_member_id: string
  community_id: string
  content: string
  excerpt: string
  id: string
  pinned: number
  published_at: string
  tag_ids: string
  title: string
  type: CommunicationType
}

interface CommunicationInput {
  content: string
  excerpt: string
  pinned: boolean
  tagIds: string[]
  title: string
  type: CommunicationType
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseText(value: unknown, fieldName: string, maximumLength: number) {
  if (typeof value !== 'string') {
    throw new ApiRequestError(
      400,
      'communication_invalid',
      `${fieldName} must be a string.`,
    )
  }

  const text = value.trim()

  if (!text || text.length > maximumLength) {
    throw new ApiRequestError(
      400,
      'communication_invalid',
      `${fieldName} must contain between 1 and ${maximumLength} characters.`,
    )
  }

  return text
}

function parseTagIds(value: unknown) {
  if (
    !Array.isArray(value) ||
    value.length > 100 ||
    value.some(
      (item) => typeof item !== 'string' || !RESOURCE_ID_PATTERN.test(item),
    )
  ) {
    throw new ApiRequestError(
      400,
      'communication_invalid',
      'tagIds must contain at most 100 valid identifiers.',
    )
  }

  return [...new Set(value)] as string[]
}

function parseCommunicationInput(value: unknown): CommunicationInput {
  if (!isRecord(value)) {
    throw new ApiRequestError(
      400,
      'invalid_request',
      'The request body must be a JSON object.',
    )
  }

  const knownFields = new Set([
    'content',
    'excerpt',
    'pinned',
    'tagIds',
    'title',
    'type',
  ])
  const unknownField = Object.keys(value).find(
    (field) => !knownFields.has(field),
  )

  if (unknownField) {
    throw new ApiRequestError(
      400,
      'invalid_request',
      `Unknown request field: ${unknownField}.`,
    )
  }

  if (
    typeof value.type !== 'string' ||
    !COMMUNICATION_TYPES.includes(value.type as CommunicationType)
  ) {
    throw new ApiRequestError(
      400,
      'communication_invalid',
      'type is not supported.',
    )
  }

  if (typeof value.pinned !== 'boolean') {
    throw new ApiRequestError(
      400,
      'communication_invalid',
      'pinned must be a boolean.',
    )
  }

  return {
    content: parseText(value.content, 'content', 10_000),
    excerpt: parseText(value.excerpt, 'excerpt', 500),
    pinned: value.pinned,
    tagIds: parseTagIds(value.tagIds),
    title: parseText(value.title, 'title', 120),
    type: value.type as CommunicationType,
  }
}

function parseStoredTagIds(value: string) {
  const parsed: unknown = JSON.parse(value)

  if (
    !Array.isArray(parsed) ||
    !parsed.every((item): item is string => typeof item === 'string')
  ) {
    throw new Error('Stored communication tags are not valid.')
  }

  return parsed
}

function toCommunication(communication: CommunicationRow) {
  return {
    authorDisplayName: communication.author_display_name,
    authorMemberId: communication.author_member_id,
    communityId: communication.community_id,
    content: communication.content,
    excerpt: communication.excerpt,
    id: communication.id,
    pinned: communication.pinned === 1,
    publishedAt: communication.published_at,
    tagIds: parseStoredTagIds(communication.tag_ids),
    title: communication.title,
    type: communication.type,
  }
}

export function matchCommunicationRoute(
  pathname: string,
): CommunicationRoute | null {
  const collectionMatch = pathname.match(
    /^\/api\/communities\/([^/]+)\/communications\/?$/,
  )
  const collectionCommunityId = collectionMatch?.[1]

  if (
    collectionCommunityId &&
    RESOURCE_ID_PATTERN.test(collectionCommunityId)
  ) {
    return { communityId: collectionCommunityId, kind: 'collection' }
  }

  const communicationMatch = pathname.match(
    /^\/api\/communities\/([^/]+)\/communications\/([^/]+)\/?$/,
  )
  const communityId = communicationMatch?.[1]
  const communicationId = communicationMatch?.[2]

  if (
    !communityId ||
    !communicationId ||
    !RESOURCE_ID_PATTERN.test(communityId) ||
    !RESOURCE_ID_PATTERN.test(communicationId)
  ) {
    return null
  }

  return { communicationId, communityId, kind: 'communication' }
}

async function listCommunications(
  requestContext: CommunicationRequestContext,
  communityId: string,
  membership: ApprovedMembership,
) {
  const visibilityFilter =
    membership.role === 'manager'
      ? ''
      : `and (
        json_array_length(c.tag_ids) = 0
        or exists (
          select 1
          from json_each(c.tag_ids) as target_tag
          where target_tag.value in (
            select member_tag.value
            from community_member as viewer,
              json_each(viewer.tag_ids) as member_tag
            where viewer.id = ?
          )
        )
      )`
  const statement = requestContext.env.DB.prepare(
    `select
      c.id,
      c.community_id,
      c.author_member_id,
      author.display_name as author_display_name,
      c.type,
      c.title,
      c.excerpt,
      c.content,
      c.tag_ids,
      c.pinned,
      c.published_at
    from community_communication as c
    inner join community_member as author on author.id = c.author_member_id
    where c.community_id = ? ${visibilityFilter}
    order by c.pinned desc, c.published_at desc, c.id asc
    limit 500`,
  )
  const { results } = await (
    membership.role === 'manager'
      ? statement.bind(communityId)
      : statement.bind(communityId, membership.id)
  ).all<CommunicationRow>()

  return jsonResponse({ communications: results.map(toCommunication) })
}

async function createCommunication(
  requestContext: CommunicationRequestContext,
  communityId: string,
  manager: { displayName: string; id: string },
) {
  const input = parseCommunicationInput(
    await readJsonBody(requestContext.request, 32_768),
  )
  const communicationId = crypto.randomUUID()
  const now = new Date().toISOString()
  const communication = await requestContext.env.DB.prepare(
    `insert into community_communication (
      id,
      community_id,
      author_member_id,
      type,
      title,
      excerpt,
      content,
      tag_ids,
      pinned,
      published_at,
      created_at,
      updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    returning *`,
  )
    .bind(
      communicationId,
      communityId,
      manager.id,
      input.type,
      input.title,
      input.excerpt,
      input.content,
      JSON.stringify(input.tagIds),
      Number(input.pinned),
      now,
      now,
      now,
    )
    .first<Omit<CommunicationRow, 'author_display_name'>>()

  if (!communication) {
    throw new Error('The communication could not be created.')
  }

  console.info(
    JSON.stringify({
      actorMemberId: manager.id,
      communicationId,
      communityId,
      event: 'community_communication.created',
    }),
  )

  return jsonResponse(
    {
      communication: toCommunication({
        ...communication,
        author_display_name: manager.displayName,
      }),
    },
    { status: 201 },
  )
}

async function getCommunication(
  db: D1Database,
  communityId: string,
  communicationId: string,
) {
  return db
    .prepare(
      `select
        c.id,
        c.community_id,
        c.author_member_id,
        author.display_name as author_display_name,
        c.type,
        c.title,
        c.excerpt,
        c.content,
        c.tag_ids,
        c.pinned,
        c.published_at
      from community_communication as c
      inner join community_member as author on author.id = c.author_member_id
      where c.community_id = ? and c.id = ?
      limit 1`,
    )
    .bind(communityId, communicationId)
    .first<CommunicationRow>()
}

async function updateCommunication(
  requestContext: CommunicationRequestContext,
  communityId: string,
  communicationId: string,
  managerMemberId: string,
) {
  const input = parseCommunicationInput(
    await readJsonBody(requestContext.request, 32_768),
  )
  const updated = await requestContext.env.DB.prepare(
    `update community_communication
    set type = ?,
        title = ?,
        excerpt = ?,
        content = ?,
        tag_ids = ?,
        pinned = ?,
        updated_at = ?
    where community_id = ? and id = ?
    returning id`,
  )
    .bind(
      input.type,
      input.title,
      input.excerpt,
      input.content,
      JSON.stringify(input.tagIds),
      Number(input.pinned),
      new Date().toISOString(),
      communityId,
      communicationId,
    )
    .first<{ id: string }>()

  if (!updated) {
    return apiError(
      404,
      'communication_not_found',
      'Community communication not found.',
    )
  }

  const communication = await getCommunication(
    requestContext.env.DB,
    communityId,
    communicationId,
  )

  if (!communication) {
    throw new Error('The updated communication could not be read.')
  }

  console.info(
    JSON.stringify({
      actorMemberId: managerMemberId,
      communicationId,
      communityId,
      event: 'community_communication.updated',
    }),
  )

  return jsonResponse({ communication: toCommunication(communication) })
}

async function deleteCommunication(
  requestContext: CommunicationRequestContext,
  communityId: string,
  communicationId: string,
  managerMemberId: string,
) {
  const deleted = await requestContext.env.DB.prepare(
    `delete from community_communication
    where community_id = ? and id = ?
    returning id`,
  )
    .bind(communityId, communicationId)
    .first<{ id: string }>()

  if (!deleted) {
    return apiError(
      404,
      'communication_not_found',
      'Community communication not found.',
    )
  }

  console.info(
    JSON.stringify({
      actorMemberId: managerMemberId,
      communicationId,
      communityId,
      event: 'community_communication.deleted',
    }),
  )

  return jsonResponse({ deletedCommunicationId: deleted.id })
}

export async function handleCommunicationApiRequest(
  requestContext: CommunicationRequestContext,
  route: CommunicationRoute,
) {
  const method = requestContext.request.method
  const allowedMethods =
    route.kind === 'collection' ? ['GET', 'POST'] : ['DELETE', 'PATCH']

  if (!allowedMethods.includes(method)) {
    return apiError(
      405,
      'method_not_allowed',
      `This endpoint only accepts ${allowedMethods.join(' or ')} requests.`,
      { Allow: allowedMethods.join(', ') },
    )
  }

  try {
    if (route.kind === 'collection' && method === 'GET') {
      const authorization = await authorizeApprovedMember(
        requestContext,
        route.communityId,
      )

      if (!authorization.authorized) {
        return authorization.response
      }

      return await listCommunications(
        requestContext,
        route.communityId,
        authorization.value.membership,
      )
    }

    const authorization = await authorizeApprovedManager(
      requestContext,
      route.communityId,
    )

    if (!authorization.authorized) {
      return authorization.response
    }

    if (route.kind === 'collection') {
      return await createCommunication(
        requestContext,
        route.communityId,
        authorization.value.membership,
      )
    }

    return method === 'PATCH'
      ? await updateCommunication(
          requestContext,
          route.communityId,
          route.communicationId!,
          authorization.value.membership.id,
        )
      : await deleteCommunication(
          requestContext,
          route.communityId,
          route.communicationId!,
          authorization.value.membership.id,
        )
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return apiError(error.status, error.code, error.message)
    }

    throw error
  }
}
