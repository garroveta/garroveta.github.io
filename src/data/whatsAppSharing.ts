/**
 * Opens WhatsApp with text pre-filled and no recipient chosen. The user still
 * chooses the contact or group and explicitly sends the message.
 */
export function getWhatsAppShareUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
