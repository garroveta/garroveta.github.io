import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { demoData } from '../data/demoData'
import { WeeklyEventImportPanel } from './WeeklyEventImportPanel'

const source = JSON.stringify({
  weekStart: '2026-09-21',
  events: [
    {
      date: '2026-09-21',
      time: '18:00',
      endTime: '21:00',
      gameId: 'game-mtg',
      formatId: 'format-mtg-modern',
      type: 'tournament',
      title: 'Torneo Modern de prueba',
      description: 'Torneo semanal de Magic.',
    },
  ],
})

describe('WeeklyEventImportPanel', () => {
  it('copies the selected week and the manager adjustments for the AI', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    render(
      <WeeklyEventImportPanel
        data={demoData}
        onClose={vi.fn()}
        onCreateEvent={vi.fn()}
      />,
    )
    fireEvent.change(
      screen.getByLabelText('Ajustes para esta semana (opcional)'),
      {
        target: { value: 'Añadir mesa de pintura el miércoles a las 17:00.' },
      },
    )
    fireEvent.click(screen.getByText('Copiar instrucciones para la IA'))
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    expect(writeText.mock.calls[0][0]).toContain(
      'Añadir mesa de pintura el miércoles a las 17:00.',
    )
    expect(writeText.mock.calls[0][0]).toContain('weekStart debe ser lunes.')
    expect(
      await screen.findByText(
        'Instrucciones copiadas. Pégalas en tu asistente de IA.',
      ),
    ).toBeInTheDocument()
  })

  it('requires review and confirmation before creating events', async () => {
    const onCreateEvent = vi.fn().mockResolvedValue({ id: 'event-created' })
    render(
      <WeeklyEventImportPanel
        data={demoData}
        onClose={vi.fn()}
        onCreateEvent={onCreateEvent}
      />,
    )

    expect(onCreateEvent).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('JSON de la semana aprobada'), {
      target: { value: source },
    })
    fireEvent.click(screen.getByText('Revisar semana'))
    expect(screen.getByText('Crear 1 evento')).toBeInTheDocument()
    expect(onCreateEvent).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Crear 1 evento'))
    await waitFor(() => expect(onCreateEvent).toHaveBeenCalledTimes(1))
    expect(onCreateEvent).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Torneo Modern de prueba' }),
    )
    expect(await screen.findByText('Creado')).toBeInTheDocument()
  })

  it('blocks creation when a row is invalid', () => {
    const onCreateEvent = vi.fn()
    render(
      <WeeklyEventImportPanel
        data={demoData}
        onClose={vi.fn()}
        onCreateEvent={onCreateEvent}
      />,
    )
    fireEvent.change(screen.getByLabelText('JSON de la semana aprobada'), {
      target: { value: source.replace('2026-09-21', '2026-09-22') },
    })
    fireEvent.click(screen.getByText('Revisar semana'))
    expect(
      screen.getByText(
        'weekStart debe ser un lunes real en formato AAAA-MM-DD.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Crear 1 evento/)).not.toBeInTheDocument()
    expect(onCreateEvent).not.toHaveBeenCalled()
  })

  it('retries only the remaining events after a partial failure', async () => {
    const onCreateEvent = vi
      .fn()
      .mockResolvedValueOnce({ id: 'event-first' })
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ id: 'event-second' })
    render(
      <WeeklyEventImportPanel
        data={demoData}
        onClose={vi.fn()}
        onCreateEvent={onCreateEvent}
      />,
    )
    const twoEvents = JSON.parse(source)
    twoEvents.events.push({
      ...twoEvents.events[0],
      title: 'Segundo evento',
      time: '19:00',
      endTime: '22:00',
    })
    fireEvent.change(screen.getByLabelText('JSON de la semana aprobada'), {
      target: { value: JSON.stringify(twoEvents) },
    })
    fireEvent.click(screen.getByText('Revisar semana'))
    fireEvent.click(screen.getByText('Crear 2 eventos'))
    await waitFor(() => expect(onCreateEvent).toHaveBeenCalledTimes(2))
    expect(
      await screen.findByText(/Ha fallado «Segundo evento»/),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByText('Crear 1 evento'))
    await waitFor(() => expect(onCreateEvent).toHaveBeenCalledTimes(3))
    expect(onCreateEvent.mock.calls.map(([input]) => input.title)).toEqual([
      'Torneo Modern de prueba',
      'Segundo evento',
      'Segundo evento',
    ])
  })
})
