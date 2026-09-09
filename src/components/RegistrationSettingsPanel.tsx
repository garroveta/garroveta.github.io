import { Save, UsersRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { QuantityField } from './QuantityField'
import {
  EVENT_TYPE_LABELS,
  isCommunityRegistrationSettingsValid,
} from '../data/registrationSettings'
import type {
  CommunityRegistrationSettings,
  DemoDataSet,
} from '../domain/types'

type RegistrationSettingsPanelProps = {
  data: DemoDataSet
  onSave: (settings: CommunityRegistrationSettings) => Promise<void>
}

export function RegistrationSettingsPanel({
  data,
  onSave,
}: RegistrationSettingsPanelProps) {
  const [settings, setSettings] = useState<CommunityRegistrationSettings>(
    data.registrationSettings,
  )
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'invalid' | 'error'
  >('idle')

  function updateRule(
    eventType: string,
    updates: Partial<CommunityRegistrationSettings['rules'][number]>,
  ) {
    setSaveStatus('idle')
    setSettings((current) => ({
      ...current,
      rules: current.rules.map((rule) =>
        rule.eventType === eventType ? { ...rule, ...updates } : rule,
      ),
    }))
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isCommunityRegistrationSettingsValid(settings)) {
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
      className="registration-settings-panel"
      aria-labelledby="registration-settings-title"
    >
      <div className="configuration-panel-heading">
        <span aria-hidden="true">
          <UsersRound size={20} />
        </span>
        <div>
          <span>Eventos MTG</span>
          <h2 id="registration-settings-title">Inscripciones por defecto</h2>
          <p>
            Estos valores preparan los nuevos eventos. Cada evento podrá
            ajustarse antes de publicarlo.
          </p>
        </div>
      </div>

      <form onSubmit={saveSettings}>
        <div className="registration-rule-list">
          {settings.rules.map((rule) => (
            <article className="registration-rule" key={rule.eventType}>
              <div className="registration-rule__identity">
                <strong>{EVENT_TYPE_LABELS[rule.eventType]}</strong>
                <small>
                  {rule.enabledByDefault
                    ? `${rule.defaultCapacity} plazas por defecto`
                    : 'Inscripción opcional'}
                </small>
              </div>

              <label className="registration-rule__toggle">
                <input
                  type="checkbox"
                  checked={rule.enabledByDefault}
                  onChange={(event) =>
                    updateRule(rule.eventType, {
                      enabledByDefault: event.target.checked,
                    })
                  }
                />
                <span>Activar</span>
              </label>

              <label className="form-field registration-rule__capacity">
                <span>Plazas</span>
                <QuantityField
                  ariaLabel={`Plazas por defecto para ${EVENT_TYPE_LABELS[rule.eventType]}`}
                  max={500}
                  required
                  value={rule.defaultCapacity}
                  onChange={(defaultCapacity) =>
                    updateRule(rule.eventType, { defaultCapacity })
                  }
                />
              </label>

              <label className="registration-rule__toggle">
                <input
                  type="checkbox"
                  checked={rule.waitlistEnabled}
                  onChange={(event) =>
                    updateRule(rule.eventType, {
                      waitlistEnabled: event.target.checked,
                    })
                  }
                />
                <span>Lista de espera</span>
              </label>
            </article>
          ))}
        </div>

        <div className="registration-settings-actions">
          <span aria-live="polite">
            {saveStatus === 'saved'
              ? 'Configuración guardada.'
              : saveStatus === 'invalid'
                ? 'Revisa las capacidades configuradas.'
                : saveStatus === 'error'
                  ? 'No se ha podido guardar. Inténtalo de nuevo.'
                  : ''}
          </span>
          <button
            className="primary-button"
            disabled={saveStatus === 'saving'}
            type="submit"
          >
            <Save aria-hidden="true" size={16} />
            {saveStatus === 'saving' ? 'Guardando…' : 'Guardar configuración'}
          </button>
        </div>
      </form>
    </section>
  )
}
