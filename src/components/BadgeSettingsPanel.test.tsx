import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BadgeSettingsPanel } from './BadgeSettingsPanel'
import { demoData } from '../data/demoData'
import type { DemoDataUpdater } from '../data/demoRepository'
import type { CommunityBadgeSettings, DemoDataSet } from '../domain/types'

function renderPanel(
  onSave?: (settings: CommunityBadgeSettings) => Promise<void>,
  data: DemoDataSet = demoData,
) {
  let saved: DemoDataSet | undefined
  const onDataChange = vi.fn((updater: DemoDataUpdater) => {
    saved =
      typeof updater === 'function' ? (updater(data) as DemoDataSet) : updater
  })

  render(
    <BadgeSettingsPanel
      data={data}
      onDataChange={onDataChange}
      onSave={onSave}
    />,
  )

  return { onDataChange, getSaved: () => saved }
}

function rowOf(name: string) {
  return screen
    .getByDisplayValue(name)
    .closest<HTMLElement>('.badge-settings-row')!
}

describe('BadgeSettingsPanel', () => {
  it('pre-fills every target from the catalogue when nothing was saved yet', () => {
    // What the server returns for a community that never opened this panel:
    // an empty override array, not one entry per badge.
    const freshData: DemoDataSet = {
      ...demoData,
      badgeSettings: { badges: [] },
    }

    renderPanel(undefined, freshData)

    const ferocious = within(rowOf('Ferocious')).getByLabelText('Objetivo')
    const monarch = within(rowOf('Monarch')).queryByLabelText('Objetivo')

    expect(ferocious).toHaveValue(4)
    expect(monarch).toBeNull()
  })

  it('says out loud that the settings never leave the device', () => {
    renderPanel()

    expect(screen.getByRole('note')).toHaveTextContent(/Función simulada/)
  })

  it('drops the simulation notice once a server is behind it', () => {
    renderPanel(vi.fn().mockResolvedValue(undefined))

    expect(screen.queryByRole('note')).toBeNull()
  })

  it('sends the settings to the server, then keeps them locally', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { getSaved } = renderPanel(onSave)
    const row = rowOf('Ferocious')

    fireEvent.change(within(row).getByLabelText('Objetivo'), {
      target: { value: '6' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar insignias' }))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Insignias guardadas.',
      ),
    )
    expect(onSave).toHaveBeenCalledWith({
      badges: expect.arrayContaining([
        { id: 'ferocious', name: 'Ferocious', target: 6 },
      ]),
    })
    expect(
      getSaved()?.badgeSettings.badges.find(({ id }) => id === 'ferocious')
        ?.target,
    ).toBe(6)
  })

  it('keeps the local copy untouched when the server refuses', async () => {
    const { onDataChange } = renderPanel(
      vi.fn().mockRejectedValue(new Error('boom')),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Guardar insignias' }))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        /No se han podido guardar/,
      ),
    )
    expect(onDataChange).not.toHaveBeenCalled()
  })

  it('rewrites the description as the target changes', () => {
    renderPanel()

    const row = rowOf('Ferocious')

    expect(row).toHaveTextContent('Termina 4 veces en el Top 4')

    fireEvent.change(within(row).getByLabelText('Objetivo'), {
      target: { value: '7' },
    })

    expect(row).toHaveTextContent('Termina 7 veces en el Top 4')
  })

  it('shows the Magic rule each name comes from', () => {
    renderPanel()

    expect(rowOf('Ferocious')).toHaveTextContent(
      'Ferocidad: palabra de habilidad sin texto de reglas fijo; en sus cartas suele activarse si controlas una criatura con fuerza 4 o mayor.',
    )
  })

  it('offers no target for a badge the final ranking decides', () => {
    renderPanel()

    const row = rowOf('Monarch')

    expect(within(row).queryByLabelText('Objetivo')).toBeNull()
    expect(row).toHaveTextContent('Lo decide la clasificación final')
  })

  it('saves a renamed badge with its new target', async () => {
    const { getSaved } = renderPanel()
    const row = rowOf('Ferocious')

    fireEvent.change(within(row).getByLabelText('Nombre'), {
      target: { value: 'Bestial' },
    })
    fireEvent.change(within(row).getByLabelText('Objetivo'), {
      target: { value: '6' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar insignias' }))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Insignias guardadas en este dispositivo.',
      ),
    )
    expect(
      getSaved()?.badgeSettings.badges.find(({ id }) => id === 'ferocious'),
    ).toEqual({ id: 'ferocious', name: 'Bestial', target: 6 })
  })

  it('refuses to save an empty target and says what to fix', async () => {
    const { onDataChange } = renderPanel()

    fireEvent.change(within(rowOf('Ferocious')).getByLabelText('Objetivo'), {
      target: { value: '' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar insignias' }))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        /cada insignia necesita un nombre y un objetivo/,
      ),
    )
    expect(onDataChange).not.toHaveBeenCalled()
  })

  it('restores the shipped catalogue', () => {
    renderPanel()

    fireEvent.change(within(rowOf('Ferocious')).getByLabelText('Nombre'), {
      target: { value: 'Bestial' },
    })

    expect(screen.queryByDisplayValue('Ferocious')).toBeNull()

    fireEvent.click(
      screen.getByRole('button', { name: /Restaurar valores por defecto/ }),
    )

    expect(screen.getByDisplayValue('Ferocious')).toBeInTheDocument()
  })
})
