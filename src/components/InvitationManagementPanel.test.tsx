import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ClientApiError } from '../api/client'

const invitationApiMocks = vi.hoisted(() => ({
  listCommunityInvitations: vi.fn(),
}))

vi.mock('../api/managerInvitations', () => invitationApiMocks)

import { InvitationManagementPanel } from './InvitationManagementPanel'

describe('InvitationManagementPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows invitations and their current states', async () => {
    invitationApiMocks.listCommunityInvitations.mockResolvedValue({
      invitations: [
        {
          communityId: 'community-crc-delorean',
          createdAt: '2026-08-20T17:00:00.000Z',
          createdByMemberId: 'member-tomas',
          expiresAt: '2026-09-20T17:00:00.000Z',
          id: 'invitation-active',
          label: 'Grupo piloto',
          revokedAt: null,
          status: 'active',
          usedAt: null,
        },
        {
          communityId: 'community-crc-delorean',
          createdAt: '2026-07-20T17:00:00.000Z',
          createdByMemberId: 'member-tomas',
          expiresAt: '2026-08-20T17:00:00.000Z',
          id: 'invitation-used',
          label: null,
          revokedAt: null,
          status: 'used',
          usedAt: '2026-07-21T17:00:00.000Z',
        },
      ],
    })

    render(<InvitationManagementPanel communityId="community-crc-delorean" />)

    expect(await screen.findByText('Grupo piloto')).toBeInTheDocument()
    expect(screen.getByText('Invitación sin nombre')).toBeInTheDocument()
    expect(screen.getAllByText('Activa')).toHaveLength(2)
    expect(screen.getAllByText('Utilizada')).toHaveLength(2)
  })

  it('explains when a manager session is required', async () => {
    invitationApiMocks.listCommunityInvitations.mockRejectedValue(
      new ClientApiError(401, 'authentication_required', 'Unauthorized'),
    )

    render(<InvitationManagementPanel communityId="community-crc-delorean" />)

    expect(
      await screen.findByText('Se necesita una sesión de gerente'),
    ).toBeInTheDocument()
  })
})
