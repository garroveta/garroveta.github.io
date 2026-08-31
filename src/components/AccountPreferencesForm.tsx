import { Check, Save } from 'lucide-react'
import type { CSSProperties, FormEvent } from 'react'
import { useMemo, useState } from 'react'

import { ClientApiError } from '../api/client'
import { isCommunityOptionActive } from '../data/communityOptions'
import type { CommunityGame, CommunityTag } from '../domain/types'

type AccountPreferencesFormProps = {
  displayName: string
  email: string
  favoriteGameIds: string[]
  games: CommunityGame[]
  onSave: (input: {
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
  const [savedValues, setSavedValues] = useState({
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
    !haveSameIds(selectedTagIds, savedValues.tagIds)

  const resetDraft = () => {
    setDraftName(savedValues.displayName)
    setSelectedGameIds(savedValues.favoriteGameIds)
    setSelectedTagIds(savedValues.tagIds)
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

          <label className="form-field">
            <span>Nombre visible</span>
            <input
              required
              autoComplete="name"
              maxLength={80}
              value={draftName}
              onChange={(event) => {
                setDraftName(event.target.value)
                setFeedback(null)
              }}
            />
          </label>
        </div>

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
