import type {
  CommunityMember,
  CommunityTag,
  DemoDataSet,
  NewsPost,
} from '../domain/types'

export type NewsListItem = {
  post: NewsPost
  author: CommunityMember
  tags: CommunityTag[]
}

function createNewsListItem(
  data: DemoDataSet,
  post: NewsPost,
): NewsListItem | undefined {
  const author = data.members.find(({ id }) => id === post.authorMemberId)

  if (!author) {
    return undefined
  }

  return {
    post,
    author,
    tags: post.tagIds.flatMap((tagId) => {
      const tag = data.tags.find(({ id }) => id === tagId)
      return tag ? [tag] : []
    }),
  }
}

export function getNewsFeed(data: DemoDataSet): NewsListItem[] {
  return data.newsPosts
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
