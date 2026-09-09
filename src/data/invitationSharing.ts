import type { CreatedManagerInvitation } from '../api/managerInvitations'

function formatExpiration(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatInvitationForWhatsApp(
  invitation: Pick<CreatedManagerInvitation, 'expiresAt' | 'inviteUrl'>,
  communityName: string,
) {
  return [
    `🔐 *Invitación privada a ${communityName.trim()}*`,
    'Has recibido un enlace personal de un solo uso para unirte a la comunidad.',
    `⏳ Válido hasta el ${formatExpiration(invitation.expiresAt)}`,
    `🔗 ${invitation.inviteUrl}`,
    'No reenvíes este enlace: quien lo utilice podrá crear una cuenta.',
  ].join('\n\n')
}
