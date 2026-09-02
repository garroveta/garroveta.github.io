import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ClientApiError } from '../api/client'

const authenticationApiMocks = vi.hoisted(() => ({
  sendSignInOtp: vi.fn(),
  verifySignInOtp: vi.fn(),
}))

vi.mock('../api/authentication', () => authenticationApiMocks)

import { ManagerOtpLogin } from './ManagerOtpLogin'

describe('ManagerOtpLogin', () => {
  it('explains an expired session', () => {
    render(<ManagerOtpLogin kind="session_expired" onAuthenticated={vi.fn()} />)

    expect(screen.getByText('Accede como gerente')).toBeInTheDocument()
  })

  it('explains an access denial', () => {
    render(<ManagerOtpLogin kind="access_denied" onAuthenticated={vi.fn()} />)

    expect(
      screen.getByText('Esta cuenta no tiene acceso de gerente'),
    ).toBeInTheDocument()
  })

  it('sends the code, verifies it and reports success', async () => {
    authenticationApiMocks.sendSignInOtp.mockResolvedValue(undefined)
    authenticationApiMocks.verifySignInOtp.mockResolvedValue({
      user: { id: 'user-tomas' },
    })
    const onAuthenticated = vi.fn()

    render(
      <ManagerOtpLogin
        kind="session_expired"
        onAuthenticated={onAuthenticated}
      />,
    )

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
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

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledTimes(1))
    expect(authenticationApiMocks.verifySignInOtp).toHaveBeenCalledWith(
      'tomas@example.com',
      '246810',
    )
  })

  it('shows a message when the code is invalid', async () => {
    authenticationApiMocks.sendSignInOtp.mockResolvedValue(undefined)
    authenticationApiMocks.verifySignInOtp.mockRejectedValue(
      new ClientApiError(400, 'INVALID_OTP', 'Invalid'),
    )

    render(<ManagerOtpLogin kind="session_expired" onAuthenticated={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'tomas@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Recibir código' }))
    fireEvent.change(await screen.findByLabelText('Código de seis cifras'), {
      target: { value: '000000' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }))

    expect(
      await screen.findByText('El código no es válido o ha caducado.'),
    ).toBeInTheDocument()
  })
})
