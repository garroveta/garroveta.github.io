import { Building2, Save } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import {
  COMMUNITY_WEEKDAYS,
  COMMUNITY_WEEKDAY_LABELS,
  isCommunitySettingsValid,
  updateCommunitySettings,
  type CommunitySettingsInput,
} from '../data/communitySettings'
import type { DemoDataUpdater } from '../data/demoRepository'
import type { DemoDataSet, OpeningHours, Weekday } from '../domain/types'

type CommunitySettingsPanelProps = {
  data: DemoDataSet
  managerId: string
  onDataChange: (updater: DemoDataUpdater) => void
}

function getOrderedOpeningHours(openingHours: OpeningHours[]) {
  return COMMUNITY_WEEKDAYS.map(
    (day) => openingHours.find((entry) => entry.day === day) ?? { day },
  )
}

export function CommunitySettingsPanel({
  data,
  managerId,
  onDataChange,
}: CommunitySettingsPanelProps) {
  const [settings, setSettings] = useState<CommunitySettingsInput>({
    name: data.community.name,
    city: data.community.city,
    openingHours: getOrderedOpeningHours(data.community.openingHours),
  })
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'invalid'>(
    'idle',
  )

  function updateDay(day: Weekday, updates: Partial<OpeningHours>) {
    setSaveStatus('idle')
    setSettings((current) => ({
      ...current,
      openingHours: current.openingHours.map((entry) =>
        entry.day === day ? { ...entry, ...updates } : entry,
      ),
    }))
  }

  function toggleDay(day: Weekday, isOpen: boolean) {
    setSaveStatus('idle')
    setSettings((current) => ({
      ...current,
      openingHours: current.openingHours.map((entry) =>
        entry.day === day
          ? isOpen
            ? { day, opensAt: '17:00', closesAt: '23:00' }
            : { day }
          : entry,
      ),
    }))
  }

  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isCommunitySettingsValid(settings)) {
      setSaveStatus('invalid')
      return
    }

    onDataChange((currentData) =>
      updateCommunitySettings(currentData, managerId, settings),
    )
    setSaveStatus('saved')
  }

  return (
    <section
      className="community-settings-panel"
      aria-labelledby="community-settings-title"
    >
      <div className="configuration-panel-heading">
        <span aria-hidden="true">
          <Building2 size={20} />
        </span>
        <div>
          <span>Identidad de la tienda</span>
          <h2 id="community-settings-title">Información de la comunidad</h2>
          <p>
            Estos datos se utilizan en la cabecera, las publicaciones y la
            información visible para los miembros.
          </p>
        </div>
      </div>

      <form onSubmit={saveSettings}>
        <div className="community-settings-identity">
          <label className="form-field">
            <span>Nombre de la comunidad</span>
            <input
              required
              value={settings.name}
              onChange={(event) => {
                setSaveStatus('idle')
                setSettings((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }}
            />
          </label>
          <label className="form-field">
            <span>Ciudad</span>
            <input
              required
              value={settings.city}
              onChange={(event) => {
                setSaveStatus('idle')
                setSettings((current) => ({
                  ...current,
                  city: event.target.value,
                }))
              }}
            />
          </label>
        </div>

        <fieldset className="community-opening-hours">
          <legend>Horario habitual</legend>
          <p>
            Utiliza el formato 24 horas. Marca “día siguiente” cuando el cierre
            sea después de medianoche.
          </p>
          <div className="community-opening-hours__list">
            {settings.openingHours.map((entry) => {
              const isOpen = Boolean(entry.opensAt && entry.closesAt)
              const label = COMMUNITY_WEEKDAY_LABELS[entry.day]

              return (
                <div className="community-opening-hours__row" key={entry.day}>
                  <strong>{label}</strong>
                  <label className="community-opening-hours__toggle">
                    <input
                      type="checkbox"
                      checked={isOpen}
                      onChange={(event) =>
                        toggleDay(entry.day, event.target.checked)
                      }
                    />
                    <span>{isOpen ? 'Abierto' : 'Cerrado'}</span>
                  </label>
                  {isOpen ? (
                    <>
                      <label className="form-field">
                        <span>Apertura</span>
                        <input
                          aria-label={`Apertura del ${label}`}
                          inputMode="numeric"
                          placeholder="17:00"
                          required
                          value={entry.opensAt ?? ''}
                          onChange={(event) =>
                            updateDay(entry.day, {
                              opensAt: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="form-field">
                        <span>Cierre</span>
                        <input
                          aria-label={`Cierre del ${label}`}
                          inputMode="numeric"
                          placeholder="23:00"
                          required
                          value={entry.closesAt ?? ''}
                          onChange={(event) =>
                            updateDay(entry.day, {
                              closesAt: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="community-opening-hours__next-day">
                        <input
                          type="checkbox"
                          checked={Boolean(entry.closesNextDay)}
                          onChange={(event) =>
                            updateDay(entry.day, {
                              closesNextDay: event.target.checked,
                            })
                          }
                        />
                        <span>Día siguiente</span>
                      </label>
                    </>
                  ) : (
                    <span className="community-opening-hours__closed">
                      Sin horario de apertura
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </fieldset>

        <div className="community-settings-actions">
          <span aria-live="polite">
            {saveStatus === 'saved'
              ? 'Información guardada.'
              : saveStatus === 'invalid'
                ? 'Revisa el nombre, la ciudad y los horarios.'
                : ''}
          </span>
          <button className="primary-button" type="submit">
            <Save aria-hidden="true" size={16} />
            Guardar información
          </button>
        </div>
      </form>
    </section>
  )
}
