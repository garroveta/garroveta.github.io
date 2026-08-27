import { describe, expect, it } from 'vitest'

import type { DemoDataSet } from '../domain/types'
import { demoData } from './demoData'
import {
  deleteNewsPost,
  publishNewsPost,
  setNewsPostPinned,
  updateNewsPost,
} from './newsMutations'

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

  it('ignores deactivated tags on new publications', () => {
    const data: DemoDataSet = structuredClone(demoData)
    data.tags.find(({ id }) => id === 'tag-pauper')!.isActive = false

    expect(publishNewsPost(data, publication).newsPosts.at(-1)?.tagIds).toEqual(
      [],
    )
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

  it('updates, pins and deletes a communication as manager', () => {
    const postId = 'news-arrival'
    const post = demoData.newsPosts.find(({ id }) => id === postId)!
    const updated = updateNewsPost(demoData, postId, 'member-lucia', {
      type: 'urgent',
      title: '  Llegada confirmada  ',
      excerpt: '  Ya está disponible.  ',
      content: '  Consulta los productos en el local.  ',
      tagIds: ['tag-pauper', 'missing-tag'],
      pinned: false,
    })

    expect(updated.newsPosts.find(({ id }) => id === postId)).toMatchObject({
      title: 'Llegada confirmada',
      type: 'urgent',
      tagIds: ['tag-pauper'],
      authorMemberId: post.authorMemberId,
      publishedAt: post.publishedAt,
    })

    const pinned = setNewsPostPinned(updated, postId, 'member-lucia', true)
    expect(pinned.newsPosts.find(({ id }) => id === postId)?.pinned).toBe(true)
    expect(
      deleteNewsPost(pinned, postId, 'member-lucia').newsPosts.some(
        ({ id }) => id === postId,
      ),
    ).toBe(false)
  })

  it('protects communications from unauthorized management', () => {
    const input = {
      type: 'news' as const,
      title: 'Título',
      excerpt: 'Resumen',
      content: 'Contenido',
      tagIds: [],
      pinned: false,
    }

    expect(
      updateNewsPost(demoData, 'news-arrival', demoData.currentMemberId, input),
    ).toBe(demoData)
    expect(
      deleteNewsPost(demoData, 'news-arrival', demoData.currentMemberId),
    ).toBe(demoData)
    expect(
      setNewsPostPinned(
        demoData,
        'news-arrival',
        demoData.currentMemberId,
        true,
      ),
    ).toBe(demoData)
  })
})
