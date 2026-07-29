import type { DemoDataSet, NewsPostType } from '../domain/types'
import { DEMO_REFERENCE_TIME } from './dashboardSelectors'

export type NewsPostInput = {
  authorMemberId: string
  type: NewsPostType
  title: string
  excerpt: string
  content: string
  tagIds: string[]
  pinned: boolean
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

function createPostId(data: DemoDataSet, title: string) {
  const baseId = `news-${slugify(title) || 'publication'}`
  let candidateId = baseId
  let suffix = 2

  while (data.newsPosts.some(({ id }) => id === candidateId)) {
    candidateId = `${baseId}-${suffix}`
    suffix += 1
  }

  return candidateId
}

export function publishNewsPost(
  data: DemoDataSet,
  input: NewsPostInput,
  publishedAt = DEMO_REFERENCE_TIME,
): DemoDataSet {
  const author = data.members.find(({ id }) => id === input.authorMemberId)
  const title = input.title.trim()
  const excerpt = input.excerpt.trim()
  const content = input.content.trim()

  if (!author || author.role === 'player' || !title || !excerpt || !content) {
    return data
  }

  const validTagIds = new Set(data.tags.map(({ id }) => id))
  const tagIds = [...new Set(input.tagIds)].filter((tagId) =>
    validTagIds.has(tagId),
  )

  return {
    ...data,
    newsPosts: [
      ...data.newsPosts,
      {
        id: createPostId(data, title),
        communityId: data.community.id,
        authorMemberId: author.id,
        type: input.type,
        title,
        excerpt,
        content,
        publishedAt,
        tagIds,
        pinned: input.pinned,
      },
    ],
  }
}
