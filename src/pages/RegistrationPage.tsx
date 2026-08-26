import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import type { CSSProperties, FormEvent } from 'react'
import { useState } from 'react'

import type { Community, CommunityGame, CommunityTag } from '../domain/types'

type RegistrationPageProps = {
  community: Community
  games: CommunityGame[]
  tags: CommunityTag[]
  onBack: () => void
}

type RegistrationStep = 'account' | 'preferences' | 'pending'

export function RegistrationPage({
  community,
  games,
  tags,
  onBack,
}: RegistrationPageProps) {
  const [step, setStep] = useState<RegistrationStep>('account')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [acceptedRules, setAcceptedRules] = useState(false)
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    community.suggestedTagIds,
  )
  const [passwordError, setPasswordError] = useState('')

  const toggleSelection = (
    id: string,
    selectedIds: string[],
    setSelectedIds: (ids: string[]) => void,
  ) => {
    setSelectedIds(
      selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id],
    )
  }

  const handleAccountSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (password !== passwordConfirmation) {
      setPasswordError('Las contraseñas no coinciden.')
      return
    }

    setPasswordError('')
    setStep('preferences')
  }

  const handlePreferencesSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStep('pending')
  }

  if (step === 'pending') {
    return (
      <div className="page registration-page">
        <section className="registration-pending" aria-live="polite">
          <span className="registration-pending__icon" aria-hidden="true">
            <CheckCircle2 size={32} />
          </span>
          <span className="page-eyebrow">Solicitud enviada</span>
          <h1>Tu cuenta está pendiente de validación</h1>
          <p>
            Hemos preparado el perfil de <strong>{displayName}</strong> para la
            comunidad de {community.name}.
          </p>

          <div className="registration-status-card">
            <Clock3 aria-hidden="true" size={20} />
            <div>
              <strong>Pendiente de validación</strong>
              <p>
                Tomás o un moderador comprobará que formas parte de la comunidad
                antes de darte acceso.
              </p>
            </div>
          </div>

          <div className="registration-next-steps">
            <strong>Después de la validación podrás:</strong>
            <ul>
              <li>consultar los eventos y noticias de la tienda;</li>
              <li>seguir tus juegos y grupos favoritos;</li>
              <li>publicar y reservar cartas MTG.</li>
            </ul>
          </div>

          <button className="secondary-button" type="button" onClick={onBack}>
            Volver al perfil de prueba
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="page registration-page">
      <button className="back-button" type="button" onClick={onBack}>
        <ArrowLeft aria-hidden="true" size={18} />
        Volver al perfil
      </button>

      <header className="registration-heading">
        <span className="page-eyebrow">
          <UserPlus aria-hidden="true" size={15} />
          Nuevo miembro
        </span>
        <h1>Crear una cuenta</h1>
        <p>
          Únete a {community.name}. El acceso se activará cuando el gerente o un
          moderador valide tu solicitud.
        </p>
      </header>

      <ol className="registration-progress" aria-label="Progreso del registro">
        <li aria-current={step === 'account' ? 'step' : undefined}>
          <span>{step === 'preferences' ? <Check size={15} /> : '1'}</span>
          Tu cuenta
        </li>
        <li aria-current={step === 'preferences' ? 'step' : undefined}>
          <span>2</span>
          Tus intereses
        </li>
      </ol>

      {step === 'account' ? (
        <form className="registration-form" onSubmit={handleAccountSubmit}>
          <div className="registration-form__heading">
            <span>Primera etapa</span>
            <h2>Información de la cuenta</h2>
            <p>Utiliza el nombre con el que te conoce la comunidad.</p>
          </div>

          <div className="registration-field-grid">
            <label className="form-field registration-field--wide">
              <span>Nombre visible</span>
              <input
                required
                autoComplete="name"
                placeholder="Ej. Pep Peralta Isern"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>

            <label className="form-field registration-field--wide">
              <span>Correo electrónico</span>
              <input
                required
                autoComplete="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="form-field">
              <span>Contraseña</span>
              <input
                required
                autoComplete="new-password"
                minLength={8}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            <label className="form-field">
              <span>Repetir contraseña</span>
              <input
                required
                autoComplete="new-password"
                minLength={8}
                type="password"
                value={passwordConfirmation}
                onChange={(event) =>
                  setPasswordConfirmation(event.target.value)
                }
              />
            </label>
          </div>

          {passwordError ? (
            <p className="registration-error" role="alert">
              {passwordError}
            </p>
          ) : null}

          <label className="registration-rules">
            <input
              required
              type="checkbox"
              checked={acceptedRules}
              onChange={(event) => setAcceptedRules(event.target.checked)}
            />
            <span>
              <strong>Acepto las normas de la comunidad</strong>
              Mis datos serán visibles únicamente para los miembros validados.
            </span>
          </label>

          <div className="registration-actions">
            <button className="primary-button" type="submit">
              Continuar
              <ChevronRight aria-hidden="true" size={17} />
            </button>
          </div>
        </form>
      ) : (
        <form className="registration-form" onSubmit={handlePreferencesSubmit}>
          <div className="registration-form__heading">
            <span>Segunda etapa</span>
            <h2>Elige lo que quieres seguir</h2>
            <p>
              Estas preferencias personalizarán tu agenda y las comunicaciones
              que verás primero.
            </p>
          </div>

          <fieldset className="registration-choice-group">
            <legend>Mis juegos</legend>
            <p>Selecciona al menos un juego.</p>
            <div className="registration-game-options">
              {games.map((game) => {
                const isSelected = selectedGameIds.includes(game.id)

                return (
                  <button
                    type="button"
                    key={game.id}
                    aria-pressed={isSelected}
                    onClick={() =>
                      toggleSelection(
                        game.id,
                        selectedGameIds,
                        setSelectedGameIds,
                      )
                    }
                  >
                    <span
                      className="registration-game-color"
                      style={{ '--game-color': game.color } as CSSProperties}
                      aria-hidden="true"
                    />
                    <span>{game.shortName}</span>
                    <span
                      className="registration-choice-check"
                      aria-hidden="true"
                    >
                      {isSelected ? <Check size={14} strokeWidth={3} /> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="registration-choice-group">
            <legend>Mis grupos y avisos</legend>
            <p>Puedes cambiar esta selección más adelante desde tu perfil.</p>
            <div className="registration-tag-options">
              {tags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id)

                return (
                  <button
                    type="button"
                    key={tag.id}
                    aria-pressed={isSelected}
                    onClick={() =>
                      toggleSelection(tag.id, selectedTagIds, setSelectedTagIds)
                    }
                  >
                    {tag.name}
                    {isSelected ? (
                      <Check aria-hidden="true" size={14} strokeWidth={3} />
                    ) : null}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div className="registration-approval-note">
            <ShieldCheck aria-hidden="true" size={20} />
            <p>
              <strong>Comunidad privada</strong>
              Tu solicitud no da acceso inmediato: primero debe ser validada.
            </p>
          </div>

          <div className="registration-actions registration-actions--split">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setStep('account')}
            >
              Atrás
            </button>
            <button
              className="primary-button"
              type="submit"
              disabled={selectedGameIds.length === 0}
            >
              Enviar solicitud
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
