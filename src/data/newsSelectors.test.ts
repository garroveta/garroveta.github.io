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
})
