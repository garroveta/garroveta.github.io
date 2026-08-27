import type { Community, NewsPost } from '../domain/types'

export function formatNewsPostForWhatsApp(
  post: NewsPost,
  audienceNames: string[],
  community: Pick<Community, 'name' | 'city'>,
) {
  const audience =
    audienceNames.length > 0 ? audienceNames.join(', ') : 'Toda la comunidad'

  return [
    `📣 *${post.title.trim()}*`,
    post.excerpt.trim(),
    post.content.trim(),
    `👥 Para: ${audience}`,
    `📍 ${community.name} · ${community.city}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}
