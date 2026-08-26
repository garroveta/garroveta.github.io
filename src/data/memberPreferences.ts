import type { DemoDataSet } from '../domain/types'
import { isCommunityOptionActive } from './communityOptions'

export function toggleFavoriteGame(
  data: DemoDataSet,
  memberId: string,
  gameId: string,
): DemoDataSet {
  const game = data.games.find(({ id }) => id === gameId)

  if (!game) {
    return data
  }

  const member = data.members.find(({ id }) => id === memberId)

  if (!member) {
    return data
  }

  const isFavorite = member.favoriteGameIds.includes(gameId)

  if (!isFavorite && !isCommunityOptionActive(game)) {
    return data
  }

  return {
    ...data,
    members: data.members.map((item) =>
      item.id === memberId
        ? {
            ...item,
            favoriteGameIds: isFavorite
              ? item.favoriteGameIds.filter((id) => id !== gameId)
              : [...item.favoriteGameIds, gameId],
          }
        : item,
    ),
  }
}
