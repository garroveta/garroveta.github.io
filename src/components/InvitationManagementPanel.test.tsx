import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ClientApiError } from '../api/client'

const invitationApiMocks = vi.hoisted(() => ({
  listCommunityInvitations: vi.fn(),
}))
const authenticationApiMocks = vi.hoisted(() => ({
  sendSignInOtp: vi.fn(),
  verifySignInOtp: vi.fn(),
}))

vi.mock('../api/managerInvitations', () => invitationApiMocks)
vi.mock('../api/authentication', () => authenticationApiMocks)

import { InvitationManagementPanel } from './InvitationManagementPanel'

describe('InvitationManagementPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authenticationApiMocks.sendSignInOtp.mockResolvedValue(undefined)
    authenticationApiMocks.verifySignInOtp.mockResolvedValue({
      user: { id: 'user-tomas' },
    })
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

    expect(await screen.findByText('Accede como gerente')).toBeInTheDocument()
  })

  it('opens the invitation list after email OTP authentication', async () => {
    invitationApiMocks.listCommunityInvitations
      .mockRejectedValueOnce(
        new ClientApiError(401, 'authentication_required', 'Unauthorized'),
      )
      .mockResolvedValueOnce({
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
        ],
      })

    render(<InvitationManagementPanel communityId="community-crc-delorean" />)

    fireEvent.change(await screen.findByLabelText('Correo electrónico'), {
      target: { value: 'tomas@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Recibir código' }))

    await waitFor(() =>
      expect(authenticationApiMocks.sendSignInOtp).toHaveBeenCalledWith(
        'tomas@example.com',
      ),
    )

    fireEvent.change(screen.getByLabelText('Código de seis cifras'), {
      target: { value: '246810' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }))

    expect(await screen.findByText('Grupo piloto')).toBeInTheDocument()
    expect(authenticationApiMocks.verifySignInOtp).toHaveBeenCalledWith(
      'tomas@example.com',
      '246810',
    )
    expect(invitationApiMocks.listCommunityInvitations).toHaveBeenCalledTimes(2)
  })

  it('distinguishes an authenticated account without manager access', async () => {
    invitationApiMocks.listCommunityInvitations.mockRejectedValue(
      new ClientApiError(403, 'manager_access_required', 'Forbidden'),
    )

    render(<InvitationManagementPanel communityId="community-crc-delorean" />)

    expect(
      await screen.findByText('Esta cuenta no tiene acceso de gerente'),
    ).toBeInTheDocument()
  })
})
