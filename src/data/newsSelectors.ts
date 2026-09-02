import type {
  CommunityMember,
  CommunityTag,
  DemoDataSet,
  NewsPost,
} from '../domain/types'

export type NewsListItem = {
  post: NewsPost
  author: Pick<CommunityMember, 'displayName'>
  tags: CommunityTag[]
}

export type NewsFeedOptions = {
  memberId?: string
  tagId?: string
}

function createNewsListItem(
  data: DemoDataSet,
  post: NewsPost,
): NewsListItem | undefined {
  const author = data.members.find(({ id }) => id === post.authorMemberId)
  const visibleAuthor =
    author ??
    (post.authorDisplayName
      ? { displayName: post.authorDisplayName }
      : undefined)

  if (!visibleAuthor) {
    return undefined
  }

  return {
    post,
    author: visibleAuthor,
    tags: post.tagIds.flatMap((tagId) => {
      const tag = data.tags.find(({ id }) => id === tagId)
      return tag ? [tag] : []
    }),
  }
}

export function getNewsFeed(
  data: DemoDataSet,
  options: NewsFeedOptions = {},
): NewsListItem[] {
  const member = options.memberId
    ? data.members.find(({ id }) => id === options.memberId)
    : undefined

  return data.newsPosts
    .filter((post) => {
      if (options.tagId) {
        return post.tagIds.includes(options.tagId)
      }

      if (member) {
        return (
          post.tagIds.length === 0 ||
          post.tagIds.some((tagId) => member.tagIds.includes(tagId))
        )
      }

      return true
    })
    .flatMap((post) => {
      const item = createNewsListItem(data, post)
      return item ? [item] : []
    })
    .sort(
      (first, second) =>
        Number(second.post.pinned) - Number(first.post.pinned) ||
        new Date(second.post.publishedAt).getTime() -
          new Date(first.post.publishedAt).getTime(),
    )
}

export function getNewsById(
  data: DemoDataSet,
  newsPostId: string,
): NewsListItem | undefined {
  const post = data.newsPosts.find(({ id }) => id === newsPostId)
  return post ? createNewsListItem(data, post) : undefined
}
