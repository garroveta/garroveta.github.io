import {
  type CommunityOption,
  type CommunityOptionInput,
  type CommunityOptionSection,
  type CommunityReferentials,
} from '../data/communityOptions'
import { apiRequest } from './client'

type ApiCommunityReferentials = {
  games: CommunityReferentials['games']
  formats: CommunityReferentials['competitionFormats']
  series: CommunityReferentials['competitionEventKinds']
  tags: CommunityReferentials['tags']
}

const referentialKindBySection = {
  games: 'games',
  competitionFormats: 'formats',
  competitionEventKinds: 'series',
  tags: 'tags',
} as const satisfies Record<CommunityOptionSection, string>

function referentialRootPath(communityId: string) {
  return `/api/communities/${encodeURIComponent(communityId)}/referentials`
}

function referentialCollectionPath(
  communityId: string,
  section: CommunityOptionSection,
) {
  return `${referentialRootPath(communityId)}/${referentialKindBySection[section]}`
}

function referentialItemPath(
  communityId: string,
  section: CommunityOptionSection,
  optionId: string,
) {
  return `${referentialCollectionPath(communityId, section)}/${encodeURIComponent(optionId)}`
}

function getWriteBody(input: CommunityOptionInput) {
  const common = {
    name: input.name,
  }

  if (input.section === 'games') {
    return {
      ...common,
      category: input.category,
      color: input.color,
      shortName: input.shortName,
    }
  }

  if (input.section === 'competitionFormats') {
    return {
      ...common,
      color: input.color,
      gameId: input.gameId,
      shortName: input.shortName,
    }
  }

  if (input.section === 'competitionEventKinds') {
    return {
      ...common,
      shortName: input.shortName,
    }
  }

  return {
    ...common,
    color: input.color,
    kind: input.tagKind,
  }
}

export function listCommunityReferentials(
  communityId: string,
  signal?: AbortSignal,
) {
  return apiRequest<{ referentials: ApiCommunityReferentials }>(
    referentialRootPath(communityId),
    { signal },
  ).then(({ referentials }) => ({
    referentials: {
      competitionEventKinds: referentials.series,
      competitionFormats: referentials.formats,
      games: referentials.games,
      tags: referentials.tags,
    },
  }))
}

export function createCommunityReferential(
  communityId: string,
  input: CommunityOptionInput,
) {
  return apiRequest<{ option: CommunityOption }>(
    referentialCollectionPath(communityId, input.section),
    {
      body: JSON.stringify(getWriteBody(input)),
      method: 'POST',
    },
  )
}

export function updateCommunityReferential(
  communityId: string,
  optionId: string,
  input: CommunityOptionInput,
  isActive: boolean,
) {
  return apiRequest<{ option: CommunityOption }>(
    referentialItemPath(communityId, input.section, optionId),
    {
      body: JSON.stringify({ ...getWriteBody(input), isActive }),
      method: 'PATCH',
    },
  )
}

export function deleteCommunityReferential(
  communityId: string,
  section: CommunityOptionSection,
  optionId: string,
) {
  return apiRequest<null>(referentialItemPath(communityId, section, optionId), {
    method: 'DELETE',
  })
}

export function reorderCommunityReferentials(
  communityId: string,
  section: CommunityOptionSection,
  optionIds: string[],
) {
  return apiRequest<{ optionIds: string[] }>(
    `${referentialCollectionPath(communityId, section)}/order`,
    {
      body: JSON.stringify({ optionIds }),
      method: 'PATCH',
    },
  )
}
