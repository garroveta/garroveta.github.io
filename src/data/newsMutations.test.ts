import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import { publishNewsPost } from './newsMutations'

const publication = {
  authorMemberId: 'member-lucia',
  type: 'urgent' as const,
  title: 'Cambio de sala',
  excerpt: 'El torneo se jugará en la sala principal.',
  content:
    'Por motivos de organización, todas las rondas se jugarán en la sala principal.',
  tagIds: ['tag-pauper', 'tag-not-found', 'tag-pauper'],
  pinned: true,
}

describe('news mutations', () => {
  it('publishes a targeted communication from a manager', () => {
    const updatedData = publishNewsPost(demoData, publication)
    const post = updatedData.newsPosts.at(-1)

    expect(updatedData.newsPosts).toHaveLength(demoData.newsPosts.length + 1)
    expect(post).toMatchObject({
      id: 'news-cambio-de-sala',
      authorMemberId: 'member-lucia',
      title: 'Cambio de sala',
      tagIds: ['tag-pauper'],
      pinned: true,
    })
  })

  it('rejects a publication from a player or with missing content', () => {
    expect(
      publishNewsPost(demoData, {
        ...publication,
        authorMemberId: demoData.currentMemberId,
      }),
    ).toBe(demoData)
    expect(
      publishNewsPost(demoData, {
        ...publication,
        content: '  ',
      }),
    ).toBe(demoData)
  })
})
