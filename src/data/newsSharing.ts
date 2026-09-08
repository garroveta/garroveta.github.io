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

/**
 * Opens WhatsApp with the text pre-filled and no recipient chosen: the
 * manager still picks the group or contact and presses send themselves,
 * nothing is sent automatically. Works both for the WhatsApp app (mobile)
 * and WhatsApp Web/Desktop (desktop), unlike a `whatsapp://` deep link.
 */
export function getWhatsAppShareUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
