import { Building2, Image, Save } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import {
  COMMUNITY_WEEKDAYS,
  COMMUNITY_WEEKDAY_LABELS,
  isCommunitySettingsValid,
  type CommunitySettingsInput,
} from '../data/communitySettings'
import type { DemoDataSet, OpeningHours, Weekday } from '../domain/types'

type CommunitySettingsPanelProps = {
  data: DemoDataSet
  onSave: (input: CommunitySettingsInput) => Promise<void>
}

function getOrderedOpeningHours(openingHours: OpeningHours[]) {
  return COMMUNITY_WEEKDAYS.map(
    (day) => openingHours.find((entry) => entry.day === day) ?? { day },
  )
}

export function CommunitySettingsPanel({
  data,
  onSave,
}: CommunitySettingsPanelProps) {
  const [settings, setSettings] = useState<CommunitySettingsInput>({
    name: data.community.name,
    city: data.community.city,
    address: data.community.address ?? '',
    contactEmail: data.community.contactEmail ?? '',
    contactPhone: data.community.contactPhone ?? '',
    websiteUrl: data.community.websiteUrl ?? '',
    instagramUrl: data.community.instagramUrl ?? '',
    facebookUrl: data.community.facebookUrl ?? '',
    logoUrl: data.community.logoUrl ?? '',
    openingHours: getOrderedOpeningHours(data.community.openingHours),
  })
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'invalid' | 'error'
  >('idle')

  function updateDay(day: Weekday, updates: Partial<OpeningHours>) {
    setSaveStatus('idle')
    setSettings((current) => ({
      ...current,
      openingHours: current.openingHours.map((entry) =>
        entry.day === day ? { ...entry, ...updates } : entry,
      ),
    }))
  }

  function updateField(
    field: Exclude<keyof CommunitySettingsInput, 'openingHours'>,
    value: string,
  ) {
    setSaveStatus('idle')
    setSettings((current) => ({ ...current, [field]: value }))
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

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isCommunitySettingsValid(settings)) {
      setSaveStatus('invalid')
      return
    }

    setSaveStatus('saving')

    try {
      await onSave(settings)
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
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
        <fieldset className="community-settings-section">
          <legend>Identidad y ubicación</legend>
          <div className="community-settings-identity">
            <label className="form-field">
              <span>Nombre de la comunidad</span>
              <input
                required
                value={settings.name}
                onChange={(event) => updateField('name', event.target.value)}
              />
            </label>
            <label className="form-field">
              <span>Ciudad</span>
              <input
                required
                value={settings.city}
                onChange={(event) => updateField('city', event.target.value)}
              />
            </label>
            <label className="form-field community-settings-wide-field">
              <span>Dirección (opcional)</span>
              <input
                autoComplete="street-address"
                placeholder="Calle, número y código postal"
                value={settings.address ?? ''}
                onChange={(event) => updateField('address', event.target.value)}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="community-settings-section">
          <legend>Contacto y presencia online</legend>
          <p>
            Los miembros podrán consultar estos datos desde el perfil de la
            comunidad.
          </p>
          <div className="community-settings-contact-grid">
            <label className="form-field">
              <span>Correo de contacto</span>
              <input
                autoComplete="email"
                type="email"
                placeholder="tienda@email.com"
                value={settings.contactEmail ?? ''}
                onChange={(event) =>
                  updateField('contactEmail', event.target.value)
                }
              />
            </label>
            <label className="form-field">
              <span>Teléfono</span>
              <input
                autoComplete="tel"
                type="tel"
                placeholder="+34 600 000 000"
                value={settings.contactPhone ?? ''}
                onChange={(event) =>
                  updateField('contactPhone', event.target.value)
                }
              />
            </label>
            <label className="form-field">
              <span>Sitio web</span>
              <input
                type="url"
                placeholder="https://…"
                value={settings.websiteUrl ?? ''}
                onChange={(event) =>
                  updateField('websiteUrl', event.target.value)
                }
              />
            </label>
            <label className="form-field">
              <span>Instagram</span>
              <input
                type="url"
                placeholder="https://instagram.com/…"
                value={settings.instagramUrl ?? ''}
                onChange={(event) =>
                  updateField('instagramUrl', event.target.value)
                }
              />
            </label>
            <label className="form-field">
              <span>Facebook</span>
              <input
                type="url"
                placeholder="https://facebook.com/…"
                value={settings.facebookUrl ?? ''}
                onChange={(event) =>
                  updateField('facebookUrl', event.target.value)
                }
              />
            </label>
            <label className="form-field">
              <span>URL del logo</span>
              <input
                type="url"
                placeholder="https://…/logo.png"
                value={settings.logoUrl ?? ''}
                onChange={(event) => updateField('logoUrl', event.target.value)}
              />
            </label>
          </div>
          {settings.logoUrl ? (
            <div className="community-logo-preview">
              <span>
                <Image aria-hidden="true" size={15} /> Vista previa
              </span>
              <img alt="Vista previa del logo" src={settings.logoUrl} />
            </div>
          ) : null}
        </fieldset>

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
              ? 'Información guardada en la comunidad.'
              : saveStatus === 'invalid'
                ? 'Revisa la identidad, los contactos, las URL y los horarios.'
                : saveStatus === 'error'
                  ? 'No se ha podido guardar la información. Inténtalo de nuevo.'
                  : saveStatus === 'saving'
                    ? 'Guardando información…'
                    : ''}
          </span>
          <button
            className="primary-button"
            type="submit"
            disabled={saveStatus === 'saving'}
          >
            <Save aria-hidden="true" size={16} />
            {saveStatus === 'saving' ? 'Guardando…' : 'Guardar información'}
          </button>
        </div>
      </form>
    </section>
  )
}
