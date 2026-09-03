import { type AuthEnv } from './auth'
import {
  authorizeApprovedManager,
  authorizeApprovedMember,
} from './authorization'
import { ApiRequestError, apiError, jsonResponse, readJsonBody } from './http'

const RESOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i
const REFERENTIAL_KINDS = ['games', 'formats', 'series', 'tags'] as const
const GAME_CATEGORIES = [
  'card_game',
  'miniatures',
  'role_playing_game',
] as const
const TAG_KINDS = ['interest', 'communication'] as const

type ReferentialKind = (typeof REFERENTIAL_KINDS)[number]
type GameCategory = (typeof GAME_CATEGORIES)[number]
type TagKind = (typeof TAG_KINDS)[number]

interface ReferentialRequestContext {
  context: ExecutionContext
  env: AuthEnv
  request: Request
}

export interface ReferentialRoute {
  communityId: string
  kind?: ReferentialKind
  optionId?: string
  action: 'root' | 'collection' | 'item' | 'order'
}

interface ReferentialRow {
  category?: GameCategory
  color?: string
  community_id: string
  game_id?: string
  id: string
  is_active: number
  kind?: TagKind
  name: string
  short_name: string
  sort_order: number
}

interface NamedInput {
  name: string
}

interface BaseInput extends NamedInput {
  shortName: string
}

interface GameInput extends BaseInput {
  category: GameCategory
  color: string
}

interface FormatInput extends BaseInput {
  color: string
  gameId: string
}

type SeriesInput = BaseInput

interface TagInput extends NamedInput {
  color: string
  kind: TagKind
}

type ReferentialInput = GameInput | FormatInput | SeriesInput | TagInput

const tableByKind: Record<ReferentialKind, string> = {
  games: 'community_game',
  formats: 'community_format',
  series: 'community_event_series',
  tags: 'community_tag',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseText(value: unknown, fieldName: string, maximumLength: number) {
  if (typeof value !== 'string') {
    throw new ApiRequestError(
      400,
      'community_referential_invalid',
      `${fieldName} must be a string.`,
    )
  }

  const text = value.trim()

  if (!text || text.length > maximumLength) {
    throw new ApiRequestError(
      400,
      'community_referential_invalid',
      `${fieldName} must contain between 1 and ${maximumLength} characters.`,
    )
  }

  return text
}

function parseEnum<T extends string>(
  value: unknown,
  fieldName: string,
  supportedValues: readonly T[],
) {
  if (typeof value !== 'string' || !supportedValues.includes(value as T)) {
    throw new ApiRequestError(
      400,
      'community_referential_invalid',
      `${fieldName} is not supported.`,
    )
  }

  return value as T
}

function parseColor(value: unknown) {
  if (typeof value !== 'string' || !COLOR_PATTERN.test(value)) {
    throw new ApiRequestError(
      400,
      'community_referential_invalid',
      'color must use the #RRGGBB format.',
    )
  }

  return value.toLowerCase()
}

function parseResourceId(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !RESOURCE_ID_PATTERN.test(value)) {
    throw new ApiRequestError(
      400,
      'community_referential_invalid',
      `${fieldName} must be a valid identifier.`,
    )
  }

  return value
}

function parseInput(value: unknown, kind: ReferentialKind): ReferentialInput {
  if (!isRecord(value)) {
    throw new ApiRequestError(
      400,
      'invalid_request',
      'The request body must be a JSON object.',
    )
  }

  const fieldsByKind: Record<ReferentialKind, Set<string>> = {
    games: new Set(['name', 'shortName', 'category', 'color']),
    formats: new Set(['name', 'shortName', 'gameId', 'color']),
    series: new Set(['name', 'shortName']),
    tags: new Set(['name', 'kind', 'color']),
  }
  const unknownField = Object.keys(value).find(
    (field) => !fieldsByKind[kind].has(field),
  )

  if (unknownField) {
    throw new ApiRequestError(
      400,
      'invalid_request',
      `Unknown request field: ${unknownField}.`,
    )
  }

  const name = parseText(value.name, 'name', 80)

  if (kind === 'tags') {
    return {
      name,
      color: parseColor(value.color),
      kind: parseEnum(value.kind, 'kind', TAG_KINDS),
    }
  }

  const baseInput = {
    name,
    shortName:
      value.shortName === undefined || value.shortName === ''
        ? name.slice(0, 40)
        : parseText(value.shortName, 'shortName', 40),
  }

  if (kind === 'games') {
    return {
      ...baseInput,
      category: parseEnum(value.category, 'category', GAME_CATEGORIES),
      color: parseColor(value.color),
    }
  }

  if (kind === 'formats') {
    return {
      ...baseInput,
      color: parseColor(value.color),
      gameId: parseResourceId(value.gameId, 'gameId'),
    }
  }

  return baseInput
}

function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/\s+/g, ' ')
    .trim()
}

function toReferential(row: ReferentialRow, kind: ReferentialKind) {
  const common = {
    id: row.id,
    name: row.name,
    isActive: row.is_active === 1,
    sortOrder: row.sort_order,
  }

  if (kind === 'games') {
    return {
      ...common,
      communityId: row.community_id,
      shortName: row.short_name,
      category: row.category,
      color: row.color,
    }
  }

  if (kind === 'formats') {
    return {
      ...common,
      gameId: row.game_id,
      shortName: row.short_name,
      color: row.color,
    }
  }

  if (kind === 'tags') {
    return {
      ...common,
      communityId: row.community_id,
      kind: row.kind,
      color: row.color,
    }
  }

  return { ...common, shortName: row.short_name }
}

function selectColumns(kind: ReferentialKind) {
  if (kind === 'games') {
    return 'id, community_id, name, short_name, category, color, is_active, sort_order'
  }

  if (kind === 'formats') {
    return 'id, community_id, game_id, name, short_name, color, is_active, sort_order'
  }

  if (kind === 'tags') {
    return 'id, community_id, name, kind, color, is_active, sort_order'
  }

  return 'id, community_id, name, short_name, is_active, sort_order'
}

function listStatement(
  db: D1Database,
  communityId: string,
  kind: ReferentialKind,
) {
  return db
    .prepare(
      `select ${selectColumns(kind)}
      from ${tableByKind[kind]}
      where community_id = ?
      order by sort_order asc, name asc, id asc`,
    )
    .bind(communityId)
}

async function listReferentials(
  requestContext: ReferentialRequestContext,
  communityId: string,
) {
  const results = await requestContext.env.DB.batch<ReferentialRow>(
    REFERENTIAL_KINDS.map((kind) =>
      listStatement(requestContext.env.DB, communityId, kind),
    ),
  )

  return jsonResponse({
    referentials: Object.fromEntries(
      REFERENTIAL_KINDS.map((kind, index) => [
        kind,
        (results[index]?.results ?? []).map((row) => toReferential(row, kind)),
      ]),
    ),
  })
}

async function assertFormatGame(
  db: D1Database,
  communityId: string,
  input: ReferentialInput,
) {
  if (!('gameId' in input)) {
    return
  }

  const gameId = await db
    .prepare(
      `select id
      from community_game
      where community_id = ? and id = ? and is_active = 1
      limit 1`,
    )
    .bind(communityId, input.gameId)
    .first<string>('id')

  if (!gameId) {
    throw new ApiRequestError(
      400,
      'community_referential_invalid',
      'gameId must identify an active game in this community.',
    )
  }
}

async function getNextSortOrder(
  db: D1Database,
  communityId: string,
  kind: ReferentialKind,
) {
  const maximum = await db
    .prepare(
      `select coalesce(max(sort_order), -1) as maximum
      from ${tableByKind[kind]}
      where community_id = ?`,
    )
    .bind(communityId)
    .first<number>('maximum')

  return Number(maximum ?? -1) + 1
}

function insertStatement(
  db: D1Database,
  communityId: string,
  optionId: string,
  kind: ReferentialKind,
  input: ReferentialInput,
  sortOrder: number,
  now: string,
) {
  const normalizedName = normalizeName(input.name)

  if (kind === 'games' && 'category' in input) {
    return db
      .prepare(
        `insert into community_game
          (id, community_id, name, normalized_name, short_name, category, color, sort_order, created_at, updated_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        returning ${selectColumns(kind)}`,
      )
      .bind(
        optionId,
        communityId,
        input.name,
        normalizedName,
        input.shortName,
        input.category,
        input.color,
        sortOrder,
        now,
        now,
      )
  }

  if (kind === 'formats' && 'gameId' in input) {
    return db
      .prepare(
        `insert into community_format
          (id, community_id, game_id, name, normalized_name, short_name, color, sort_order, created_at, updated_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        returning ${selectColumns(kind)}`,
      )
      .bind(
        optionId,
        communityId,
        input.gameId,
        input.name,
        normalizedName,
        input.shortName,
        input.color,
        sortOrder,
        now,
        now,
      )
  }

  if (kind === 'tags' && 'kind' in input) {
    return db
      .prepare(
        `insert into community_tag
          (id, community_id, name, normalized_name, kind, color, sort_order, created_at, updated_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?)
        returning ${selectColumns(kind)}`,
      )
      .bind(
        optionId,
        communityId,
        input.name,
        normalizedName,
        input.kind,
        input.color,
        sortOrder,
        now,
        now,
      )
  }

  if (!('shortName' in input)) {
    throw new Error('The series input is not valid.')
  }

  return db
    .prepare(
      `insert into community_event_series
        (id, community_id, name, normalized_name, short_name, sort_order, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?, ?, ?)
      returning ${selectColumns(kind)}`,
    )
    .bind(
      optionId,
      communityId,
      input.name,
      normalizedName,
      input.shortName,
      sortOrder,
      now,
      now,
    )
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Error && error.message.includes('UNIQUE constraint failed')
  )
}

async function createReferential(
  requestContext: ReferentialRequestContext,
  route: ReferentialRoute,
  managerMemberId: string,
) {
  const kind = route.kind!
  const input = parseInput(
    await readJsonBody(requestContext.request, 4096),
    kind,
  )
  await assertFormatGame(requestContext.env.DB, route.communityId, input)
  const sortOrder = await getNextSortOrder(
    requestContext.env.DB,
    route.communityId,
    kind,
  )
  const optionId = crypto.randomUUID()
  const now = new Date().toISOString()

  try {
    const row = await insertStatement(
      requestContext.env.DB,
      route.communityId,
      optionId,
      kind,
      input,
      sortOrder,
      now,
    ).first<ReferentialRow>()

    if (!row) {
      throw new Error('The community referential could not be created.')
    }

    console.info(
      JSON.stringify({
        actorMemberId: managerMemberId,
        communityId: route.communityId,
        event: 'community.referential_created',
        kind,
        optionId,
      }),
    )

    return jsonResponse({ option: toReferential(row, kind) }, { status: 201 })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return apiError(
        409,
        'community_referential_duplicate',
        'An option with this name already exists in this category.',
      )
    }

    throw error
  }
}

function updateStatement(
  db: D1Database,
  communityId: string,
  optionId: string,
  kind: ReferentialKind,
  input: ReferentialInput,
  isActive: boolean,
  now: string,
) {
  const normalizedName = normalizeName(input.name)

  if (kind === 'games' && 'category' in input) {
    return db
      .prepare(
        `update community_game
        set name = ?, normalized_name = ?, short_name = ?, category = ?, color = ?, is_active = ?, updated_at = ?
        where community_id = ? and id = ?
        returning ${selectColumns(kind)}`,
      )
      .bind(
        input.name,
        normalizedName,
        input.shortName,
        input.category,
        input.color,
        Number(isActive),
        now,
        communityId,
        optionId,
      )
  }

  if (kind === 'formats' && 'gameId' in input) {
    return db
      .prepare(
        `update community_format
        set game_id = ?, name = ?, normalized_name = ?, short_name = ?, color = ?, is_active = ?, updated_at = ?
        where community_id = ? and id = ?
        returning ${selectColumns(kind)}`,
      )
      .bind(
        input.gameId,
        input.name,
        normalizedName,
        input.shortName,
        input.color,
        Number(isActive),
        now,
        communityId,
        optionId,
      )
  }

  if (kind === 'tags' && 'kind' in input) {
    return db
      .prepare(
        `update community_tag
        set name = ?, normalized_name = ?, kind = ?, color = ?, is_active = ?, updated_at = ?
        where community_id = ? and id = ?
        returning ${selectColumns(kind)}`,
      )
      .bind(
        input.name,
        normalizedName,
        input.kind,
        input.color,
        Number(isActive),
        now,
        communityId,
        optionId,
      )
  }

  if (!('shortName' in input)) {
    throw new Error('The series input is not valid.')
  }

  return db
    .prepare(
      `update community_event_series
      set name = ?, normalized_name = ?, short_name = ?, is_active = ?, updated_at = ?
      where community_id = ? and id = ?
      returning ${selectColumns(kind)}`,
    )
    .bind(
      input.name,
      normalizedName,
      input.shortName,
      Number(isActive),
      now,
      communityId,
      optionId,
    )
}

async function updateReferential(
  requestContext: ReferentialRequestContext,
  route: ReferentialRoute,
  managerMemberId: string,
) {
  const body = await readJsonBody(requestContext.request, 4096)

  if (!isRecord(body) || typeof body.isActive !== 'boolean') {
    throw new ApiRequestError(
      400,
      'community_referential_invalid',
      'isActive must be a boolean.',
    )
  }

  const { isActive, ...inputBody } = body
  const kind = route.kind!
  const input = parseInput(inputBody, kind)
  await assertFormatGame(requestContext.env.DB, route.communityId, input)

  try {
    const row = await updateStatement(
      requestContext.env.DB,
      route.communityId,
      route.optionId!,
      kind,
      input,
      isActive,
      new Date().toISOString(),
    ).first<ReferentialRow>()

    if (!row) {
      return apiError(
        404,
        'community_referential_not_found',
        'Community option not found.',
      )
    }

    console.info(
      JSON.stringify({
        actorMemberId: managerMemberId,
        communityId: route.communityId,
        event: 'community.referential_updated',
        kind,
        optionId: route.optionId,
      }),
    )

    return jsonResponse({ option: toReferential(row, kind) })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return apiError(
        409,
        'community_referential_duplicate',
        'An option with this name already exists in this category.',
      )
    }

    throw error
  }
}

function unusedCondition(kind: ReferentialKind) {
  if (kind === 'games') {
    return `not exists (
        select 1 from community_event where community_id = ? and game_id = ?
      ) and not exists (
        select 1 from community_format where community_id = ? and game_id = ?
      ) and not exists (
        select 1 from community_member as member, json_each(member.favorite_game_ids) as game
        where member.community_id = ? and game.value = ?
      )`
  }

  if (kind === 'formats') {
    return 'not exists (select 1 from community_event where community_id = ? and format_id = ?)'
  }

  if (kind === 'series') {
    return 'not exists (select 1 from community_event where community_id = ? and competition_event_kind_id = ?)'
  }

  return `not exists (
      select 1 from community_event as event, json_each(event.tag_ids) as tag
      where event.community_id = ? and tag.value = ?
    ) and not exists (
      select 1 from community_communication as communication, json_each(communication.tag_ids) as tag
      where communication.community_id = ? and tag.value = ?
    ) and not exists (
      select 1 from community_member as member, json_each(member.tag_ids) as tag
      where member.community_id = ? and tag.value = ?
    )`
}

function usageBindings(
  kind: ReferentialKind,
  communityId: string,
  optionId: string,
) {
  const repetitions = kind === 'formats' || kind === 'series' ? 1 : 3
  return Array.from({ length: repetitions }, () => [
    communityId,
    optionId,
  ]).flat()
}

async function deleteReferential(
  requestContext: ReferentialRequestContext,
  route: ReferentialRoute,
  managerMemberId: string,
) {
  const kind = route.kind!
  const optionId = route.optionId!
  const deletedId = await requestContext.env.DB.prepare(
    `delete from ${tableByKind[kind]}
    where community_id = ? and id = ? and ${unusedCondition(kind)}
    returning id`,
  )
    .bind(
      route.communityId,
      optionId,
      ...usageBindings(kind, route.communityId, optionId),
    )
    .first<string>('id')

  if (!deletedId) {
    const existingId = await requestContext.env.DB.prepare(
      `select id from ${tableByKind[kind]}
      where community_id = ? and id = ?
      limit 1`,
    )
      .bind(route.communityId, optionId)
      .first<string>('id')

    if (existingId) {
      return apiError(
        409,
        'community_referential_in_use',
        'This option is already in use and must be deactivated instead.',
      )
    }

    return apiError(
      404,
      'community_referential_not_found',
      'Community option not found.',
    )
  }

  console.info(
    JSON.stringify({
      actorMemberId: managerMemberId,
      communityId: route.communityId,
      event: 'community.referential_deleted',
      kind,
      optionId,
    }),
  )

  return new Response(null, { status: 204 })
}

function parseOrderedIds(value: unknown) {
  if (
    !isRecord(value) ||
    !Array.isArray(value.optionIds) ||
    value.optionIds.length > 100 ||
    value.optionIds.some(
      (optionId) =>
        typeof optionId !== 'string' || !RESOURCE_ID_PATTERN.test(optionId),
    ) ||
    new Set(value.optionIds).size !== value.optionIds.length
  ) {
    throw new ApiRequestError(
      400,
      'community_referential_order_invalid',
      'optionIds must contain at most 100 distinct valid identifiers.',
    )
  }

  return value.optionIds as string[]
}

async function reorderReferentials(
  requestContext: ReferentialRequestContext,
  route: ReferentialRoute,
  managerMemberId: string,
) {
  const kind = route.kind!
  const optionIds = parseOrderedIds(
    await readJsonBody(requestContext.request, 8192),
  )
  const { results } = await requestContext.env.DB.prepare(
    `select id from ${tableByKind[kind]} where community_id = ? order by id`,
  )
    .bind(route.communityId)
    .all<{ id: string }>()
  const storedIds = results.map(({ id }) => id).sort()
  const requestedIds = [...optionIds].sort()

  if (
    storedIds.length !== requestedIds.length ||
    storedIds.some((id, index) => id !== requestedIds[index])
  ) {
    return apiError(
      400,
      'community_referential_order_invalid',
      'optionIds must contain every option in this category exactly once.',
    )
  }

  const now = new Date().toISOString()
  await requestContext.env.DB.batch(
    optionIds.map((optionId, sortOrder) =>
      requestContext.env.DB.prepare(
        `update ${tableByKind[kind]}
          set sort_order = ?, updated_at = ?
          where community_id = ? and id = ?`,
      ).bind(sortOrder, now, route.communityId, optionId),
    ),
  )

  console.info(
    JSON.stringify({
      actorMemberId: managerMemberId,
      communityId: route.communityId,
      event: 'community.referentials_reordered',
      kind,
    }),
  )

  return jsonResponse({ optionIds })
}

export function matchReferentialRoute(
  pathname: string,
): ReferentialRoute | null {
  const rootMatch = pathname.match(
    /^\/api\/communities\/([^/]+)\/referentials\/?$/,
  )
  const rootCommunityId = rootMatch?.[1]

  if (rootCommunityId && RESOURCE_ID_PATTERN.test(rootCommunityId)) {
    return { action: 'root', communityId: rootCommunityId }
  }

  const orderMatch = pathname.match(
    /^\/api\/communities\/([^/]+)\/referentials\/([^/]+)\/order\/?$/,
  )
  const orderCommunityId = orderMatch?.[1]
  const orderKind = orderMatch?.[2]

  if (
    orderCommunityId &&
    RESOURCE_ID_PATTERN.test(orderCommunityId) &&
    REFERENTIAL_KINDS.includes(orderKind as ReferentialKind)
  ) {
    return {
      action: 'order',
      communityId: orderCommunityId,
      kind: orderKind as ReferentialKind,
    }
  }

  const collectionMatch = pathname.match(
    /^\/api\/communities\/([^/]+)\/referentials\/([^/]+)\/?$/,
  )
  const collectionCommunityId = collectionMatch?.[1]
  const collectionKind = collectionMatch?.[2]

  if (
    collectionCommunityId &&
    RESOURCE_ID_PATTERN.test(collectionCommunityId) &&
    REFERENTIAL_KINDS.includes(collectionKind as ReferentialKind)
  ) {
    return {
      action: 'collection',
      communityId: collectionCommunityId,
      kind: collectionKind as ReferentialKind,
    }
  }

  const itemMatch = pathname.match(
    /^\/api\/communities\/([^/]+)\/referentials\/([^/]+)\/([^/]+)\/?$/,
  )
  const communityId = itemMatch?.[1]
  const kind = itemMatch?.[2]
  const optionId = itemMatch?.[3]

  if (
    !communityId ||
    !kind ||
    !optionId ||
    !RESOURCE_ID_PATTERN.test(communityId) ||
    !RESOURCE_ID_PATTERN.test(optionId) ||
    !REFERENTIAL_KINDS.includes(kind as ReferentialKind)
  ) {
    return null
  }

  return {
    action: 'item',
    communityId,
    kind: kind as ReferentialKind,
    optionId,
  }
}

export async function handleReferentialApiRequest(
  requestContext: ReferentialRequestContext,
  route: ReferentialRoute,
) {
  const method = requestContext.request.method
  const isRead = route.action === 'root' && method === 'GET'
  const isCreate = route.action === 'collection' && method === 'POST'
  const isUpdate = route.action === 'item' && method === 'PATCH'
  const isDelete = route.action === 'item' && method === 'DELETE'
  const isReorder = route.action === 'order' && method === 'PATCH'

  if (!isRead && !isCreate && !isUpdate && !isDelete && !isReorder) {
    const allow =
      route.action === 'root'
        ? 'GET'
        : route.action === 'collection'
          ? 'POST'
          : route.action === 'order'
            ? 'PATCH'
            : 'DELETE, PATCH'

    return apiError(
      405,
      'method_not_allowed',
      `This endpoint only accepts ${allow} requests.`,
      { Allow: allow },
    )
  }

  try {
    const authorization = isRead
      ? await authorizeApprovedMember(requestContext, route.communityId)
      : await authorizeApprovedManager(requestContext, route.communityId)

    if (!authorization.authorized) {
      return authorization.response
    }

    if (isRead) {
      return await listReferentials(requestContext, route.communityId)
    }

    const managerMemberId = authorization.value.membership.id

    if (isCreate) {
      return await createReferential(requestContext, route, managerMemberId)
    }

    if (isUpdate) {
      return await updateReferential(requestContext, route, managerMemberId)
    }

    if (isDelete) {
      return await deleteReferential(requestContext, route, managerMemberId)
    }

    return await reorderReferentials(requestContext, route, managerMemberId)
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return apiError(error.status, error.code, error.message)
    }

    throw error
  }
}
