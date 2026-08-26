import type {
  CommunityGame,
  CommunityTag,
  CompetitionEventKind,
  CompetitionFormat,
  DemoDataSet,
  GameCategory,
} from '../domain/types'

export type CommunityOptionSection =
  | 'games'
  | 'competitionFormats'
  | 'competitionEventKinds'
  | 'tags'

export interface CommunityOptionInput {
  section: CommunityOptionSection
  name: string
  shortName?: string
  color?: string
  category?: GameCategory
  gameId?: string
  tagKind?: CommunityTag['kind']
}

interface CommunityOptionReference {
  id: string
  isActive?: boolean
}

function isManager(data: DemoDataSet, memberId: string) {
  return data.members.some(
    ({ id, role }) => id === memberId && role === 'manager',
  )
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

function optionPrefix(section: CommunityOptionSection) {
  if (section === 'competitionFormats') {
    return 'format'
  }

  if (section === 'competitionEventKinds') {
    return 'event-kind'
  }

  return section === 'games' ? 'game' : 'tag'
}

function createOptionId(
  data: DemoDataSet,
  section: CommunityOptionSection,
  name: string,
) {
  const existingIds = new Set(data[section].map(({ id }) => id))
  const baseId = `${optionPrefix(section)}-${slugify(name) || 'nuevo'}`
  let candidateId = baseId
  let suffix = 2

  while (existingIds.has(candidateId)) {
    candidateId = `${baseId}-${suffix}`
    suffix += 1
  }

  return candidateId
}

function normalizeInput(input: CommunityOptionInput) {
  return {
    ...input,
    name: input.name.trim(),
    shortName: input.shortName?.trim(),
    color: input.color?.trim(),
  }
}

function hasDuplicateName(
  data: DemoDataSet,
  input: CommunityOptionInput,
  ignoredOptionId?: string,
) {
  const normalizedName = input.name.localeCompare.bind(input.name)

  return data[input.section].some((option) => {
    if (option.id === ignoredOptionId) {
      return false
    }

    if (
      input.section === 'competitionFormats' &&
      'gameId' in option &&
      option.gameId !== input.gameId
    ) {
      return false
    }

    return normalizedName(option.name, 'es', { sensitivity: 'base' }) === 0
  })
}

function createOption(
  data: DemoDataSet,
  input: CommunityOptionInput,
):
  | CommunityGame
  | CompetitionFormat
  | CompetitionEventKind
  | CommunityTag
  | undefined {
  const id = createOptionId(data, input.section, input.name)
  const shortName = input.shortName || input.name

  if (input.section === 'games' && input.category && input.color) {
    return {
      id,
      communityId: data.community.id,
      name: input.name,
      shortName,
      category: input.category,
      color: input.color,
      isActive: true,
    }
  }

  if (
    input.section === 'competitionFormats' &&
    input.gameId &&
    input.color &&
    data.games.some(({ id: gameId }) => gameId === input.gameId)
  ) {
    return {
      id,
      gameId: input.gameId,
      name: input.name,
      shortName,
      color: input.color,
      isActive: true,
    }
  }

  if (input.section === 'competitionEventKinds') {
    return {
      id,
      name: input.name,
      shortName,
      isActive: true,
    }
  }

  if (input.section === 'tags' && input.tagKind && input.color) {
    return {
      id,
      communityId: data.community.id,
      name: input.name,
      kind: input.tagKind,
      color: input.color,
      isActive: true,
    }
  }

  return undefined
}

export function isCommunityOptionActive(option: { isActive?: boolean }) {
  return option.isActive !== false
}

export function addCommunityOption(
  data: DemoDataSet,
  memberId: string,
  rawInput: CommunityOptionInput,
): DemoDataSet {
  const input = normalizeInput(rawInput)

  if (
    !isManager(data, memberId) ||
    !input.name ||
    hasDuplicateName(data, input)
  ) {
    return data
  }

  const option = createOption(data, input)

  if (!option) {
    return data
  }

  if (input.section === 'games') {
    return { ...data, games: [...data.games, option as CommunityGame] }
  }

  if (input.section === 'competitionFormats') {
    return {
      ...data,
      competitionFormats: [
        ...data.competitionFormats,
        option as CompetitionFormat,
      ],
    }
  }

  if (input.section === 'competitionEventKinds') {
    return {
      ...data,
      competitionEventKinds: [
        ...data.competitionEventKinds,
        option as CompetitionEventKind,
      ],
    }
  }

  return { ...data, tags: [...data.tags, option as CommunityTag] }
}

export function updateCommunityOption(
  data: DemoDataSet,
  memberId: string,
  optionId: string,
  rawInput: CommunityOptionInput,
): DemoDataSet {
  const input = normalizeInput(rawInput)
  const currentOption = data[input.section].find(({ id }) => id === optionId)

  if (
    !isManager(data, memberId) ||
    !currentOption ||
    !input.name ||
    hasDuplicateName(data, input, optionId)
  ) {
    return data
  }

  if (input.section === 'games' && input.category && input.color) {
    return {
      ...data,
      games: data.games.map((game) =>
        game.id === optionId
          ? {
              ...game,
              name: input.name,
              shortName: input.shortName || input.name,
              category: input.category!,
              color: input.color!,
            }
          : game,
      ),
    }
  }

  if (
    input.section === 'competitionFormats' &&
    input.gameId &&
    input.color &&
    data.games.some(({ id }) => id === input.gameId)
  ) {
    return {
      ...data,
      competitionFormats: data.competitionFormats.map((format) =>
        format.id === optionId
          ? {
              ...format,
              gameId: input.gameId!,
              name: input.name,
              shortName: input.shortName || input.name,
              color: input.color!,
            }
          : format,
      ),
    }
  }

  if (input.section === 'competitionEventKinds') {
    return {
      ...data,
      competitionEventKinds: data.competitionEventKinds.map((eventKind) =>
        eventKind.id === optionId
          ? {
              ...eventKind,
              name: input.name,
              shortName: input.shortName || input.name,
            }
          : eventKind,
      ),
    }
  }

  if (input.section === 'tags' && input.tagKind && input.color) {
    return {
      ...data,
      tags: data.tags.map((tag) =>
        tag.id === optionId
          ? {
              ...tag,
              name: input.name,
              kind: input.tagKind!,
              color: input.color!,
            }
          : tag,
      ),
    }
  }

  return data
}

export function setCommunityOptionActive(
  data: DemoDataSet,
  memberId: string,
  section: CommunityOptionSection,
  optionId: string,
  isActive: boolean,
): DemoDataSet {
  if (!isManager(data, memberId)) {
    return data
  }

  const options = data[section]

  if (!options.some(({ id }) => id === optionId)) {
    return data
  }

  return {
    ...data,
    [section]: options.map((option) =>
      option.id === optionId ? { ...option, isActive } : option,
    ),
  }
}

export function reorderCommunityOption(
  data: DemoDataSet,
  memberId: string,
  section: CommunityOptionSection,
  optionId: string,
  direction: 'up' | 'down',
): DemoDataSet {
  if (!isManager(data, memberId)) {
    return data
  }

  const options = [...data[section]] as CommunityOptionReference[]
  const currentIndex = options.findIndex(({ id }) => id === optionId)
  const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

  if (
    currentIndex < 0 ||
    nextIndex < 0 ||
    nextIndex >= options.length
  ) {
    return data
  }

  ;[options[currentIndex], options[nextIndex]] = [
    options[nextIndex],
    options[currentIndex],
  ]

  return { ...data, [section]: options }
}

export function getCommunityOptionUsageCount(
  data: DemoDataSet,
  section: CommunityOptionSection,
  optionId: string,
) {
  if (section === 'games') {
    return (
      data.events.filter(({ gameId }) => gameId === optionId).length +
      data.members.filter(({ favoriteGameIds }) =>
        favoriteGameIds.includes(optionId),
      ).length +
      data.competitionFormats.filter(({ gameId }) => gameId === optionId).length
    )
  }

  if (section === 'competitionFormats') {
    return data.events.filter(({ formatId }) => formatId === optionId).length
  }

  if (section === 'competitionEventKinds') {
    return data.events.filter(
      ({ competitionEventKindId }) => competitionEventKindId === optionId,
    ).length
  }

  return (
    data.events.filter(({ tagIds }) => tagIds.includes(optionId)).length +
    data.newsPosts.filter(({ tagIds }) => tagIds.includes(optionId)).length +
    data.members.filter(({ tagIds }) => tagIds.includes(optionId)).length +
    Number(data.community.suggestedTagIds.includes(optionId))
  )
}

export function deleteCommunityOption(
  data: DemoDataSet,
  memberId: string,
  section: CommunityOptionSection,
  optionId: string,
): DemoDataSet {
  if (
    !isManager(data, memberId) ||
    getCommunityOptionUsageCount(data, section, optionId) > 0
  ) {
    return data
  }

  return {
    ...data,
    [section]: data[section].filter(({ id }) => id !== optionId),
  }
}
