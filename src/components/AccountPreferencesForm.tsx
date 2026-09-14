import { Check, Save } from 'lucide-react'
import type { CSSProperties, FormEvent } from 'react'
import { useMemo, useState } from 'react'

import { ClientApiError } from '../api/client'
import { isCommunityOptionActive } from '../data/communityOptions'
import type {
  CommunityGame,
  CommunityTag,
  ContactMethod,
} from '../domain/types'

/**
 * Fixed labels: the member chooses what to share, not how it is named, so the
 * same wording appears to everyone who is matched with them.
 */
const contactKinds: Array<{ kind: ContactMethod['kind']; label: string }> = [
  { kind: 'whatsapp', label: 'WhatsApp' },
  { kind: 'email', label: 'Correo' },
  { kind: 'discord', label: 'Discord' },
]

type ContactDraft = Record<ContactMethod['kind'], string>

const emptyContactDraft: ContactDraft = {
  whatsapp: '',
  email: '',
  discord: '',
}

function toContactDraft(contactMethods: ContactMethod[]): ContactDraft {
  return contactMethods.reduce(
    (draft, { kind, value }) => ({ ...draft, [kind]: value }),
    emptyContactDraft,
  )
}

function toContactMethods(draft: ContactDraft): ContactMethod[] {
  return contactKinds.flatMap(({ kind, label }) =>
    draft[kind].trim() ? [{ kind, label, value: draft[kind].trim() }] : [],
  )
}

function haveSameContacts(left: ContactMethod[], right: ContactMethod[]) {
  return (
    left.length === right.length &&
    left.every((method) =>
      right.some(
        (candidate) =>
          candidate.kind === method.kind && candidate.value === method.value,
      ),
    )
  )
}

type AccountPreferencesFormProps = {
  contactMethods: ContactMethod[]
  displayName: string
  email: string
  favoriteGameIds: string[]
  games: CommunityGame[]
  onSave: (input: {
    contactMethods: ContactMethod[]
    displayName: string
    favoriteGameIds: string[]
    tagIds: string[]
  }) => Promise<void>
  tagIds: string[]
  tags: CommunityTag[]
}

function haveSameIds(left: string[], right: string[]) {
  return (
    left.length === right.length && left.every((value) => right.includes(value))
  )
}

function toggleId(ids: string[], id: string) {
  return ids.includes(id)
    ? ids.filter((candidate) => candidate !== id)
    : [...ids, id]
}

export function AccountPreferencesForm({
  contactMethods,
  displayName,
  email,
  favoriteGameIds,
  games,
  onSave,
  tagIds,
  tags,
}: AccountPreferencesFormProps) {
  const activeGames = useMemo(
    () => games.filter(isCommunityOptionActive),
    [games],
  )
  const activeTags = useMemo(() => tags.filter(isCommunityOptionActive), [tags])
  const [draftName, setDraftName] = useState(displayName)
  const [selectedGameIds, setSelectedGameIds] = useState(favoriteGameIds)
  const [selectedTagIds, setSelectedTagIds] = useState(tagIds)
  const [contactDraft, setContactDraft] = useState(() =>
    toContactDraft(contactMethods),
  )
  const [savedValues, setSavedValues] = useState({
    contactMethods,
    displayName,
    favoriteGameIds,
    tagIds,
  })
  const [feedback, setFeedback] = useState<{
    kind: 'error' | 'success'
    message: string
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const normalizedName = draftName.trim()
  const hasChanges =
    normalizedName !== savedValues.displayName ||
    !haveSameIds(selectedGameIds, savedValues.favoriteGameIds) ||
    !haveSameIds(selectedTagIds, savedValues.tagIds) ||
    !haveSameContacts(
      toContactMethods(contactDraft),
      savedValues.contactMethods,
    )

  const resetDraft = () => {
    setDraftName(savedValues.displayName)
    setSelectedGameIds(savedValues.favoriteGameIds)
    setSelectedTagIds(savedValues.tagIds)
    setContactDraft(toContactDraft(savedValues.contactMethods))
    setFeedback(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!normalizedName || normalizedName.length > 80) {
      setFeedback({
        kind: 'error',
        message: 'El nombre visible debe contener entre 1 y 80 caracteres.',
      })
      return
    }

    setIsSaving(true)
    setFeedback(null)

    try {
      const updatedValues = {
        contactMethods: toContactMethods(contactDraft),
        displayName: normalizedName,
        favoriteGameIds: selectedGameIds,
        tagIds: selectedTagIds,
      }
      await onSave(updatedValues)
      setSavedValues(updatedValues)
      setFeedback({
        kind: 'success',
        message: 'Cuenta y preferencias actualizadas.',
      })
    } catch (error) {
      setFeedback({
        kind: 'error',
        message:
          error instanceof ClientApiError &&
          error.code === 'membership_access_required'
            ? 'Tu acceso a la comunidad ya no permite modificar este perfil.'
            : 'No se han podido guardar los cambios. Inténtalo de nuevo.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="account-preferences" aria-labelledby="account-title">
      <div className="section-heading">
        <div>
          <span>Tu cuenta</span>
          <h2 id="account-title">Datos y preferencias</h2>
        </div>
      </div>

      <form
        className="account-preferences__form"
        aria-busy={isSaving}
        onSubmit={handleSubmit}
      >
        <div className="account-identity-fields">
          <label className="form-field">
            <span>Correo electrónico</span>
            <input
              readOnly
              aria-label="Correo electrónico"
              type="email"
              value={email}
              aria-describedby="account-email-help"
            />
            <small id="account-email-help">
              El correo identifica tu acceso y no se puede cambiar aquí.
            </small>
          </label>

          <div className="form-field">
            <label htmlFor="account-display-name">Nombre visible</label>
            <input
              required
              id="account-display-name"
              autoComplete="name"
              maxLength={80}
              value={draftName}
              onChange={(event) => {
                setDraftName(event.target.value)
                setFeedback(null)
              }}
              aria-describedby="account-name-help"
            />
            <small id="account-name-help">
              Escríbelo igual que en tu cuenta de Wizards, la de la app
              Companion: <strong>nombre y apellidos</strong>, en ese orden. Así
              tus resultados de torneo se enlazan automáticamente con tu ficha.
            </small>
          </div>
        </div>

        <fieldset className="registration-choice-group contact-methods-group">
          <legend>Cómo pueden contactarte</legend>
          <p>
            Lo que indiques aquí aparece en tu ficha para todos los miembros
            validados. Deja en blanco lo que no quieras compartir.
          </p>
          <div className="contact-methods-fields">
            {contactKinds.map(({ kind, label }) => (
              <label className="form-field" key={kind}>
                <span>{label}</span>
                <input
                  maxLength={120}
                  type={kind === 'email' ? 'email' : 'text'}
                  value={contactDraft[kind]}
                  onChange={(event) => {
                    setContactDraft((draft) => ({
                      ...draft,
                      [kind]: event.target.value,
                    }))
                    setFeedback(null)
                  }}
                />
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="registration-choice-group">
          <legend>Mis juegos</legend>
          <p>Elige los juegos que quieres seguir en la comunidad.</p>
          <div className="registration-game-options">
            {activeGames.map((game) => {
              const isSelected = selectedGameIds.includes(game.id)

              return (
                <button
                  type="button"
                  key={game.id}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedGameIds((ids) => toggleId(ids, game.id))
                    setFeedback(null)
                  }}
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
          <legend>Mis grupos favoritos</legend>
          <p>
            Se usarán para adaptar las comunicaciones y actividades destacadas.
          </p>
          <div className="registration-tag-options">
            {activeTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id)

              return (
                <button
                  type="button"
                  key={tag.id}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedTagIds((ids) => toggleId(ids, tag.id))
                    setFeedback(null)
                  }}
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

        {feedback ? (
          <p
            className={`account-preferences__feedback account-preferences__feedback--${feedback.kind}`}
            role={feedback.kind === 'error' ? 'alert' : 'status'}
          >
            {feedback.message}
          </p>
        ) : null}

        <div className="account-preferences__actions">
          <button
            className="secondary-button"
            disabled={!hasChanges || isSaving}
            type="button"
            onClick={resetDraft}
          >
            Descartar
          </button>
          <button
            className="primary-button"
            disabled={!hasChanges || isSaving}
            type="submit"
          >
            <Save aria-hidden="true" size={17} />
            {isSaving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </section>
  )
}
