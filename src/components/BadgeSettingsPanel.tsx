import { Award, RotateCcw } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import type { DemoDataUpdater } from '../data/demoRepository'
import {
  getDefaultBadgeSettings,
  resolveSeasonBadges,
  type BadgeFamily,
} from '../data/rankingBadges'
import {
  isCommunityBadgeSettingsValid,
  updateCommunityBadgeSettings,
} from '../data/rankingBadgeSettings'
import type { CommunityBadgeSetting, DemoDataSet } from '../domain/types'

const familyLabels: Record<BadgeFamily, string> = {
  attendance: 'Asistencia',
  top4: 'Top 4',
  titles: 'Victorias',
  formats: 'Formatos',
  field: 'Torneos grandes',
  season: 'Temporada',
}

const familyOrder: BadgeFamily[] = [
  'attendance',
  'top4',
  'titles',
  'formats',
  'field',
  'season',
]

type BadgeSettingsPanelProps = {
  data: DemoDataSet
  onDataChange: (updater: DemoDataUpdater) => void
}

export function BadgeSettingsPanel({
  data,
  onDataChange,
}: BadgeSettingsPanelProps) {
  const [badges, setBadges] = useState<CommunityBadgeSetting[]>(
    () => data.badgeSettings.badges,
  )
  const [status, setStatus] = useState<'idle' | 'invalid' | 'saved'>('idle')
  const preview = resolveSeasonBadges({ badges })
  const settingsById = new Map(badges.map((badge) => [badge.id, badge]))

  function editBadge(id: string, patch: Partial<CommunityBadgeSetting>) {
    setStatus('idle')
    setBadges((current) =>
      current.map((badge) =>
        badge.id === id ? { ...badge, ...patch } : badge,
      ),
    )
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isCommunityBadgeSettingsValid({ badges })) {
      setStatus('invalid')
      return
    }

    onDataChange((current) => updateCommunityBadgeSettings(current, { badges }))
    setStatus('saved')
  }

  function restoreDefaults() {
    setBadges(getDefaultBadgeSettings().badges)
    setStatus('idle')
  }

  return (
    <section className="badge-settings-panel" aria-labelledby="badge-settings">
      <div className="badge-settings-panel__heading">
        <span className="badge-settings-panel__icon" aria-hidden="true">
          <Award size={22} />
        </span>
        <div>
          <span>Herramientas del gerente</span>
          <h2 id="badge-settings">Insignias</h2>
          <p>
            Cambia el nombre y el objetivo de cada insignia. La descripción se
            escribe sola a partir del objetivo, así nunca promete algo distinto
            de lo que mide.
          </p>
        </div>
      </div>

      <p className="badge-settings-panel__notice" role="note">
        Función simulada: estos ajustes se guardan solo en este dispositivo y
        todavía no viajan al servidor.
      </p>

      <form onSubmit={save}>
        {familyOrder.map((family) => {
          const familyBadges = preview.filter(
            (badge) => badge.family === family,
          )

          return (
            <fieldset key={family} className="badge-settings-family">
              <legend>{familyLabels[family]}</legend>

              {familyBadges.map((badge) => {
                const setting = settingsById.get(badge.id)

                return (
                  <div className="badge-settings-row" key={badge.id}>
                    <label className="badge-settings-row__name">
                      <span>Nombre</span>
                      <input
                        type="text"
                        maxLength={40}
                        value={setting?.name ?? badge.name}
                        onChange={(event) =>
                          editBadge(badge.id, { name: event.target.value })
                        }
                      />
                    </label>

                    {badge.counter === undefined ? (
                      <p className="badge-settings-row__fixed">
                        Lo decide la clasificación final
                      </p>
                    ) : (
                      <label className="badge-settings-row__target">
                        <span>Objetivo</span>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={setting?.target ?? ''}
                          onChange={(event) =>
                            editBadge(badge.id, {
                              target:
                                event.target.value === ''
                                  ? undefined
                                  : Number(event.target.value),
                            })
                          }
                        />
                      </label>
                    )}

                    <p className="badge-settings-row__description">
                      {badge.description}
                    </p>
                    <p className="badge-settings-row__reference">
                      {badge.reference}
                    </p>
                  </div>
                )
              })}
            </fieldset>
          )
        })}

        <div className="badge-settings-panel__actions">
          <button className="primary-button" type="submit">
            Guardar insignias
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={restoreDefaults}
          >
            <RotateCcw aria-hidden="true" size={17} />
            Restaurar valores por defecto
          </button>
          <span role="status">
            {status === 'saved'
              ? 'Insignias guardadas en este dispositivo.'
              : status === 'invalid'
                ? 'Revisa los nombres y los objetivos: cada insignia necesita un nombre y un objetivo entre 1 y 999.'
                : ''}
          </span>
        </div>
      </form>
    </section>
  )
}
