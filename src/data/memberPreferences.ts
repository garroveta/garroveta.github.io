import type { DemoDataSet } from '../domain/types'

export function toggleFavoriteGame(
  data: DemoDataSet,
  memberId: string,
  gameId: string,
): DemoDataSet {
  if (!data.games.some(({ id }) => id === gameId)) {
    return data
  }

  const member = data.members.find(({ id }) => id === memberId)

  if (!member) {
    return data
  }

  const isFavorite = member.favoriteGameIds.includes(gameId)

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
