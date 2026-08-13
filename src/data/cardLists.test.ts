import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import {
  assignWantedCardToList,
  createPersonalCardList,
  renamePersonalCardList,
} from './cardLists'

describe('personal card lists', () => {
  it('creates and renames a private list for its owner', () => {
    const created = createPersonalCardList(
      demoData,
      demoData.currentMemberId,
      '  Modern   2026 ',
      'wanted',
    )

    expect(created.list).toMatchObject({
      name: 'Modern 2026',
      memberId: demoData.currentMemberId,
      kind: 'wanted',
    })

    const renamed = renamePersonalCardList(
      created.data,
      demoData.currentMemberId,
      created.list!.id,
      'Modern competitivo',
    )
    expect(
      renamed.cardLists.find(({ id }) => id === created.list!.id)?.name,
    ).toBe('Modern competitivo')
  })

  it('moves an owned search without changing community matches', () => {
    const updated = assignWantedCardToList(
      demoData,
      demoData.currentMemberId,
      'wanted-alex-sol-ring',
      'card-list-alex-wanted-pauper',
    )

    expect(
      updated.wantedCards.find(({ id }) => id === 'wanted-alex-sol-ring')
        ?.cardListId,
    ).toBe('card-list-alex-wanted-pauper')
    expect(updated.cardMatches).toEqual(demoData.cardMatches)
  })
})
