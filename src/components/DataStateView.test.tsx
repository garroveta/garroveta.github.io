import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ClientApiError } from '../api/client'
import { DataStateView } from './DataStateView'

describe('DataStateView', () => {
  it('renders the loading title and description', () => {
    render(
      <DataStateView
        status="loading"
        loadingTitle="Cargando miembros…"
        loadingDescription="Consultando los perfiles de la comunidad."
      />,
    )

    expect(screen.getByText('Cargando miembros…')).toBeInTheDocument()
    expect(
      screen.getByText('Consultando los perfiles de la comunidad.'),
    ).toBeInTheDocument()
  })

  it('shows a retry button and calls onRetry for a retryable error', () => {
    const onRetry = vi.fn()
    render(
      <DataStateView
        status="error"
        loadingTitle="Cargando miembros…"
        error={new ClientApiError(0, 'network_error', 'offline')}
        onRetry={onRetry}
      />,
    )

    expect(screen.getByText('Sin conexión')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('hides the retry button for a session-expired error', () => {
    render(
      <DataStateView
        status="error"
        loadingTitle="Cargando miembros…"
        error={new ClientApiError(401, 'authentication_required', '')}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText('Tu sesión ha caducado')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Reintentar' }),
    ).not.toBeInTheDocument()
  })

  it('hides the retry button for an access-denied error', () => {
    render(
      <DataStateView
        status="error"
        loadingTitle="Cargando miembros…"
        error={new ClientApiError(403, 'manager_access_required', '')}
        onRetry={vi.fn()}
      />,
    )

    expect(
      screen.getByText('No tienes acceso a esta sección'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Reintentar' }),
    ).not.toBeInTheDocument()
  })
})
