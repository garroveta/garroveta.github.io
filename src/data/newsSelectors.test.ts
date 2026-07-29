import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import { getNewsById, getNewsFeed } from './newsSelectors'

describe('news selectors', () => {
  it('places pinned communications first and then orders by date', () => {
    expect(getNewsFeed(demoData).map(({ post }) => post.id)).toEqual([
      'news-summer-hours',
      'news-community-rules',
      'news-commander-tables',
      'news-arrival',
      'news-format-poll',
      'news-trade-evening',
    ])
  })

  it('adds the author and targeted tags to a publication', () => {
    const item = getNewsById(demoData, 'news-commander-tables')

    expect(item?.author.displayName).toBe('Diego Sánchez')
    expect(item?.tags.map(({ name }) => name)).toEqual(['Commander'])
  })

  it('personalizes the feed with general and member-tagged publications', () => {
    expect(
      getNewsFeed(demoData, {
        memberId: demoData.currentMemberId,
      }).map(({ post }) => post.id),
    ).toEqual([
      'news-summer-hours',
      'news-community-rules',
      'news-commander-tables',
      'news-trade-evening',
    ])
  })

  it('filters publications by one targeted tag', () => {
    expect(
      getNewsFeed(demoData, { tagId: 'tag-pauper' }).map(({ post }) => post.id),
    ).toEqual(['news-format-poll'])
  })
})
