import type {
  CommunityRankingPoints,
  CommunityRankingSeason,
} from '../domain/types'
import { apiRequest } from './client'

export type RankingSeasonWriteInput = {
  name: string
  startsOn: string
  endsOn: string
  points: CommunityRankingPoints
}

function rankingSeasonCollectionPath(communityId: string) {
  return `/api/communities/${encodeURIComponent(communityId)}/ranking-seasons`
}

function rankingSeasonPath(communityId: string, seasonId: string) {
  return `${rankingSeasonCollectionPath(communityId)}/${encodeURIComponent(seasonId)}`
}

export function listCommunityRankingSeasons(
  communityId: string,
  signal?: AbortSignal,
) {
  return apiRequest<{ seasons: CommunityRankingSeason[] }>(
    rankingSeasonCollectionPath(communityId),
    { signal },
  )
}

export function createCommunityRankingSeason(
  communityId: string,
  input: RankingSeasonWriteInput,
) {
  return apiRequest<{ season: CommunityRankingSeason }>(
    rankingSeasonCollectionPath(communityId),
    {
      body: JSON.stringify(input),
      method: 'POST',
    },
  )
}

/** Any subset; the Worker keeps whatever is left out. */
export type RankingSeasonUpdateInput = Partial<
  Pick<RankingSeasonWriteInput, 'startsOn' | 'endsOn' | 'points'>
>

export function updateCommunityRankingSeason(
  communityId: string,
  seasonId: string,
  input: RankingSeasonUpdateInput,
) {
  return apiRequest<{ season: CommunityRankingSeason }>(
    rankingSeasonPath(communityId, seasonId),
    {
      body: JSON.stringify(input),
      method: 'PATCH',
    },
  )
}

export function deleteCommunityRankingSeason(
  communityId: string,
  seasonId: string,
) {
  return apiRequest<{ deletedSeasonId: string }>(
    rankingSeasonPath(communityId, seasonId),
    { method: 'DELETE' },
  )
}

export function activateCommunityRankingSeason(
  communityId: string,
  seasonId: string,
) {
  return apiRequest<{ season: CommunityRankingSeason }>(
    `${rankingSeasonPath(communityId, seasonId)}/activate`,
    { method: 'POST' },
  )
}

export function closeCommunityRankingSeason(
  communityId: string,
  seasonId: string,
) {
  return apiRequest<{ season: CommunityRankingSeason }>(
    `${rankingSeasonPath(communityId, seasonId)}/close`,
    { method: 'POST' },
  )
}
