import type { DemoDataSet, NewsPostType } from '../domain/types'
import { isCommunityOptionActive } from './communityOptions'
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

export type NewsPostUpdateInput = Omit<NewsPostInput, 'authorMemberId'>

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

export function createNewsPostId(data: DemoDataSet, title: string) {
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

  if (
    !author ||
    author.role === 'player' ||
    author.status !== 'approved' ||
    !title ||
    !excerpt ||
    !content
  ) {
    return data
  }

  const validTagIds = new Set(
    data.tags.filter(isCommunityOptionActive).map(({ id }) => id),
  )
  const tagIds = [...new Set(input.tagIds)].filter((tagId) =>
    validTagIds.has(tagId),
  )

  return {
    ...data,
    newsPosts: [
      ...data.newsPosts,
      {
        id: createNewsPostId(data, title),
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

function isApprovedManager(data: DemoDataSet, managerId: string) {
  return data.members.some(
    ({ id, role, status }) =>
      id === managerId && role === 'manager' && status === 'approved',
  )
}

function sanitizePostInput(data: DemoDataSet, input: NewsPostUpdateInput) {
  const title = input.title.trim()
  const excerpt = input.excerpt.trim()
  const content = input.content.trim()
  const validTagIds = new Set(
    data.tags.filter(isCommunityOptionActive).map(({ id }) => id),
  )

  return {
    ...input,
    title,
    excerpt,
    content,
    tagIds: [...new Set(input.tagIds)].filter((tagId) =>
      validTagIds.has(tagId),
    ),
  }
}

export function updateNewsPost(
  data: DemoDataSet,
  postId: string,
  managerId: string,
  input: NewsPostUpdateInput,
): DemoDataSet {
  const post = data.newsPosts.find(({ id }) => id === postId)
  const sanitizedInput = sanitizePostInput(data, input)

  if (
    !post ||
    !isApprovedManager(data, managerId) ||
    !sanitizedInput.title ||
    !sanitizedInput.excerpt ||
    !sanitizedInput.content
  ) {
    return data
  }

  return {
    ...data,
    newsPosts: data.newsPosts.map((candidate) =>
      candidate.id === postId ? { ...candidate, ...sanitizedInput } : candidate,
    ),
  }
}

export function deleteNewsPost(
  data: DemoDataSet,
  postId: string,
  managerId: string,
): DemoDataSet {
  if (
    !isApprovedManager(data, managerId) ||
    !data.newsPosts.some(({ id }) => id === postId)
  ) {
    return data
  }

  return {
    ...data,
    newsPosts: data.newsPosts.filter(({ id }) => id !== postId),
  }
}

export function setNewsPostPinned(
  data: DemoDataSet,
  postId: string,
  managerId: string,
  pinned: boolean,
): DemoDataSet {
  const post = data.newsPosts.find(({ id }) => id === postId)

  if (!post || !isApprovedManager(data, managerId) || post.pinned === pinned) {
    return data
  }

  return {
    ...data,
    newsPosts: data.newsPosts.map((candidate) =>
      candidate.id === postId ? { ...candidate, pinned } : candidate,
    ),
  }
}
