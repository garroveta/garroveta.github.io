import {
  ArrowDown,
  ArrowUp,
  Edit3,
  Plus,
  Power,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import type { CSSProperties, FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'

import {
  getCommunityOptionUsageCount,
  isCommunityOptionActive,
  type CommunityOption,
  type CommunityOptionInput,
  type CommunityOptionSection,
} from '../data/communityOptions'
import { ClientApiError } from '../api/client'
import { describeApiError } from '../api/errorPresentation'
import { DataStateView } from './DataStateView'
import type { CommunityTag, DemoDataSet, GameCategory } from '../domain/types'
import type { CommunityReferentialsStatus } from '../hooks/useCommunityReferentials'

interface CommunityOptionManagerProps {
  data: DemoDataSet
  persistenceError: unknown
  persistenceStatus: CommunityReferentialsStatus
  onCreate: (input: CommunityOptionInput) => Promise<void>
  onDelete: (section: CommunityOptionSection, optionId: string) => Promise<void>
  onReload: () => void
  onReorder: (
    section: CommunityOptionSection,
    optionIds: string[],
  ) => Promise<void>
  onUpdate: (
    optionId: string,
    input: CommunityOptionInput,
    isActive: boolean,
  ) => Promise<void>
}

type ManagedOption = CommunityOption

interface OptionFormValues {
  name: string
  shortName: string
  color: string
  category: GameCategory
  gameId: string
  tagKind: CommunityTag['kind']
}

const sectionLabels: Record<
  CommunityOptionSection,
  { label: string; singular: string }
> = {
  games: { label: 'Juegos', singular: 'juego' },
  competitionFormats: { label: 'Formatos', singular: 'formato' },
  competitionEventKinds: {
    label: 'Series',
    singular: 'serie',
  },
  tags: { label: 'Etiquetas', singular: 'etiqueta' },
}

const sectionOrder = Object.keys(sectionLabels) as CommunityOptionSection[]

const categoryLabels: Record<GameCategory, string> = {
  card_game: 'Juego de cartas',
  miniatures: 'Miniaturas',
  role_playing_game: 'Rol',
}

const tagKindLabels: Record<CommunityTag['kind'], string> = {
  interest: 'Interés',
  communication: 'Comunicación',
}

const emptyFormValues: OptionFormValues = {
  name: '',
  shortName: '',
  color: '#6d3d7d',
  category: 'card_game',
  gameId: '',
  tagKind: 'interest',
}

function getOptions(
  data: DemoDataSet,
  section: CommunityOptionSection,
): ManagedOption[] {
  if (section === 'games') {
    return data.games
  }

  if (section === 'competitionFormats') {
    return data.competitionFormats
  }

  if (section === 'competitionEventKinds') {
    return data.competitionEventKinds
  }

  return data.tags
}

function getOptionDetails(
  data: DemoDataSet,
  section: CommunityOptionSection,
  option: ManagedOption,
) {
  if (section === 'games' && 'category' in option) {
    return categoryLabels[option.category]
  }

  if (section === 'competitionFormats' && 'gameId' in option) {
    return (
      data.games.find(({ id }) => id === option.gameId)?.shortName ??
      'Juego no disponible'
    )
  }

  if (section === 'tags' && 'kind' in option) {
    return tagKindLabels[option.kind]
  }

  return 'shortName' in option ? option.shortName : ''
}

function getFormValues(
  section: CommunityOptionSection,
  option?: ManagedOption,
): OptionFormValues {
  if (!option) {
    return emptyFormValues
  }

  return {
    ...emptyFormValues,
    name: option.name,
    shortName: 'shortName' in option ? option.shortName : option.name,
    color: 'color' in option ? option.color : emptyFormValues.color,
    category:
      section === 'games' && 'category' in option
        ? option.category
        : emptyFormValues.category,
    gameId:
      section === 'competitionFormats' && 'gameId' in option
        ? option.gameId
        : '',
    tagKind:
      section === 'tags' && 'kind' in option
        ? option.kind
        : emptyFormValues.tagKind,
  }
}

function getOptionInput(
  section: CommunityOptionSection,
  option: ManagedOption,
): CommunityOptionInput {
  const values = getFormValues(section, option)

  return {
    section,
    name: values.name,
    shortName: values.shortName,
    color: values.color,
    category: values.category,
    gameId: values.gameId,
    tagKind: values.tagKind,
  }
}

function getMutationErrorMessage(error: unknown) {
  if (error instanceof ClientApiError) {
    if (error.code === 'community_referential_duplicate') {
      return 'Ya existe una opción con este nombre en esta categoría.'
    }

    if (error.code === 'community_referential_in_use') {
      return 'Esta opción ya se utiliza y debe desactivarse en lugar de eliminarse.'
    }

    if (error.code === 'community_referential_invalid') {
      return 'Revisa los datos de la opción antes de volver a guardarla.'
    }
  }

  return describeApiError(error).description
}

function OptionEditor({
  data,
  initialValues,
  isEditing,
  section,
  isSaving,
  onCancel,
  onSubmit,
}: {
  data: DemoDataSet
  initialValues: OptionFormValues
  isEditing: boolean
  isSaving: boolean
  section: CommunityOptionSection
  onCancel: () => void
  onSubmit: (input: CommunityOptionInput) => Promise<void>
}) {
  const [values, setValues] = useState(initialValues)
  const labels = sectionLabels[section]

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSubmit({
      section,
      name: values.name,
      shortName: values.shortName,
      color: values.color,
      category: values.category,
      gameId: values.gameId,
      tagKind: values.tagKind,
    })
  }

  return (
    <form className="community-option-form" onSubmit={handleSubmit}>
      <div className="community-option-form__heading">
        <div>
          <span>{isEditing ? 'Modificar' : 'Añadir'}</span>
          <h3>
            {isEditing
              ? `Modificar ${labels.singular}`
              : `Nuevo ${labels.singular}`}
          </h3>
        </div>
        <button type="button" aria-label="Cerrar formulario" onClick={onCancel}>
          <X aria-hidden="true" size={17} />
        </button>
      </div>

      <div className="community-option-form__grid">
        <label className="form-field">
          <span>Nombre</span>
          <input
            required
            value={values.name}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
          />
        </label>

        {section !== 'tags' ? (
          <label className="form-field">
            <span>Nombre corto</span>
            <input
              value={values.shortName}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  shortName: event.target.value,
                }))
              }
            />
          </label>
        ) : null}

        {section === 'games' ? (
          <label className="form-field">
            <span>Categoría</span>
            <select
              value={values.category}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  category: event.target.value as GameCategory,
                }))
              }
            >
              {(Object.keys(categoryLabels) as GameCategory[]).map(
                (category) => (
                  <option key={category} value={category}>
                    {categoryLabels[category]}
                  </option>
                ),
              )}
            </select>
          </label>
        ) : null}

        {section === 'competitionFormats' ? (
          <label className="form-field">
            <span>Juego</span>
            <select
              required
              value={values.gameId}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  gameId: event.target.value,
                }))
              }
            >
              <option value="">Seleccionar juego</option>
              {data.games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                  {isCommunityOptionActive(game) ? '' : ' · desactivado'}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {section === 'tags' ? (
          <label className="form-field">
            <span>Clase</span>
            <select
              value={values.tagKind}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  tagKind: event.target.value as CommunityTag['kind'],
                }))
              }
            >
              {(Object.keys(tagKindLabels) as CommunityTag['kind'][]).map(
                (kind) => (
                  <option key={kind} value={kind}>
                    {tagKindLabels[kind]}
                  </option>
                ),
              )}
            </select>
          </label>
        ) : null}

        {section !== 'competitionEventKinds' ? (
          <label className="form-field community-option-color">
            <span>Color</span>
            <input
              type="color"
              value={values.color}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  color: event.target.value,
                }))
              }
            />
          </label>
        ) : null}
      </div>

      <div className="composer-actions">
        <button
          className="secondary-button"
          disabled={isSaving}
          type="button"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button className="primary-button" disabled={isSaving} type="submit">
          <Save aria-hidden="true" size={16} />
          {isSaving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

export function CommunityOptionManager({
  data,
  persistenceError,
  persistenceStatus,
  onCreate,
  onDelete,
  onReload,
  onReorder,
  onUpdate,
}: CommunityOptionManagerProps) {
  const [activeSection, setActiveSection] =
    useState<CommunityOptionSection>('games')
  const [editingOptionId, setEditingOptionId] = useState<string>()
  const [isAdding, setIsAdding] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string>()
  const [pendingMutation, setPendingMutation] = useState<string>()
  const [mutationError, setMutationError] = useState<unknown>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const options = getOptions(data, activeSection)
  const editingOption = options.find(({ id }) => id === editingOptionId)
  const labels = sectionLabels[activeSection]

  useEffect(() => {
    if (!isAdding && !editingOptionId) {
      return
    }

    editorRef.current?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'start',
    })
  }, [editingOptionId, isAdding])

  function closeEditor() {
    setEditingOptionId(undefined)
    setIsAdding(false)
  }

  function selectSection(section: CommunityOptionSection) {
    setActiveSection(section)
    setPendingDeleteId(undefined)
    closeEditor()
  }

  async function runMutation(key: string, mutation: () => Promise<void>) {
    setPendingMutation(key)
    setMutationError(null)

    try {
      await mutation()
      return true
    } catch (error) {
      setMutationError(error)
      return false
    } finally {
      setPendingMutation(undefined)
    }
  }

  async function saveOption(input: CommunityOptionInput) {
    const saved = await runMutation('save', () =>
      editingOptionId && editingOption
        ? onUpdate(
            editingOptionId,
            input,
            isCommunityOptionActive(editingOption),
          )
        : onCreate(input),
    )

    if (saved) {
      closeEditor()
    }
  }

  if (persistenceStatus !== 'ready') {
    return (
      <section className="community-options">
        <DataStateView
          error={persistenceError}
          loadingDescription="Estamos recuperando los juegos, formatos, series y etiquetas."
          loadingTitle="Cargando las opciones"
          onRetry={onReload}
          status={persistenceStatus === 'error' ? 'error' : 'loading'}
        />
      </section>
    )
  }

  return (
    <section
      className="community-options"
      aria-labelledby="community-options-title"
    >
      <div className="section-heading">
        <div>
          <span>Herramientas del gerente</span>
          <h2 id="community-options-title">Configuración de la comunidad</h2>
        </div>
        {!isAdding && !editingOptionId ? (
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              setPendingDeleteId(undefined)
              setIsAdding(true)
            }}
          >
            <Plus aria-hidden="true" size={16} />
            Añadir {labels.singular}
          </button>
        ) : null}
      </div>
      <p className="community-options__intro">
        Configura juegos, formatos, series y etiquetas sin perder el historial.
        El tipo de actividad se gestiona por separado en cada evento.
      </p>

      {mutationError ? (
        <p className="community-options__error" role="alert">
          {getMutationErrorMessage(mutationError)}
        </p>
      ) : null}

      <div
        className="community-options__tabs"
        role="tablist"
        aria-label="Opciones administrables"
      >
        {sectionOrder.map((section) => (
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === section}
            key={section}
            onClick={() => selectSection(section)}
          >
            {sectionLabels[section].label}
            <span>{getOptions(data, section).length}</span>
          </button>
        ))}
      </div>

      {isAdding || editingOption ? (
        <div className="community-option-editor-anchor" ref={editorRef}>
          <OptionEditor
            data={data}
            initialValues={getFormValues(activeSection, editingOption)}
            isEditing={Boolean(editingOption)}
            isSaving={pendingMutation === 'save'}
            key={`${activeSection}-${editingOption?.id ?? 'new'}`}
            section={activeSection}
            onCancel={closeEditor}
            onSubmit={saveOption}
          />
        </div>
      ) : null}

      <div className="community-options__list">
        {options.map((option, index) => {
          const isActive = isCommunityOptionActive(option)
          const optionColor =
            'color' in option ? option.color : 'var(--color-accent, #6d3d7d)'
          const usageCount = getCommunityOptionUsageCount(
            data,
            activeSection,
            option.id,
          )

          return (
            <article
              className="community-option-row"
              data-active={isActive}
              key={option.id}
            >
              <span
                className="community-option-row__color"
                style={{ '--option-color': optionColor } as CSSProperties}
                aria-hidden="true"
              />
              <div className="community-option-row__identity">
                <strong>{option.name}</strong>
                <small>{getOptionDetails(data, activeSection, option)}</small>
              </div>
              <span className="community-option-row__status">
                {isActive ? 'Activa' : 'Desactivada'}
              </span>
              <div
                className="community-option-row__actions"
                aria-label={`Acciones para ${option.name}`}
              >
                <button
                  type="button"
                  aria-label={`Subir ${option.name}`}
                  title="Subir"
                  disabled={index === 0 || Boolean(pendingMutation)}
                  onClick={() => {
                    const optionIds = options.map(({ id }) => id)
                    ;[optionIds[index - 1], optionIds[index]] = [
                      optionIds[index],
                      optionIds[index - 1],
                    ]
                    void runMutation(`reorder-${option.id}`, () =>
                      onReorder(activeSection, optionIds),
                    )
                  }}
                >
                  <ArrowUp aria-hidden="true" size={15} />
                </button>
                <button
                  type="button"
                  aria-label={`Bajar ${option.name}`}
                  title="Bajar"
                  disabled={
                    index === options.length - 1 || Boolean(pendingMutation)
                  }
                  onClick={() => {
                    const optionIds = options.map(({ id }) => id)
                    ;[optionIds[index], optionIds[index + 1]] = [
                      optionIds[index + 1],
                      optionIds[index],
                    ]
                    void runMutation(`reorder-${option.id}`, () =>
                      onReorder(activeSection, optionIds),
                    )
                  }}
                >
                  <ArrowDown aria-hidden="true" size={15} />
                </button>
                <button
                  type="button"
                  aria-label={`Modificar ${option.name}`}
                  title="Modificar"
                  disabled={Boolean(pendingMutation)}
                  onClick={() => {
                    setIsAdding(false)
                    setPendingDeleteId(undefined)
                    setEditingOptionId(option.id)
                  }}
                >
                  <Edit3 aria-hidden="true" size={15} />
                </button>
                <button
                  type="button"
                  aria-label={`${isActive ? 'Desactivar' : 'Activar'} ${option.name}`}
                  title={isActive ? 'Desactivar' : 'Activar'}
                  disabled={Boolean(pendingMutation)}
                  onClick={() =>
                    void runMutation(`active-${option.id}`, () =>
                      onUpdate(
                        option.id,
                        getOptionInput(activeSection, option),
                        !isActive,
                      ),
                    )
                  }
                >
                  <Power aria-hidden="true" size={15} />
                </button>
                {usageCount === 0 ? (
                  pendingDeleteId === option.id ? (
                    <span className="community-option-row__delete-confirmation">
                      <button
                        type="button"
                        disabled={Boolean(pendingMutation)}
                        onClick={() =>
                          void runMutation(`delete-${option.id}`, () =>
                            onDelete(activeSection, option.id),
                          ).then((deleted) => {
                            if (deleted) {
                              setPendingDeleteId(undefined)
                            }
                          })
                        }
                      >
                        Eliminar
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(pendingMutation)}
                        onClick={() => setPendingDeleteId(undefined)}
                      >
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <button
                      className="community-option-row__delete"
                      type="button"
                      aria-label={`Eliminar definitivamente ${option.name}`}
                      title="Eliminar definitivamente"
                      disabled={Boolean(pendingMutation)}
                      onClick={() => setPendingDeleteId(option.id)}
                    >
                      <Trash2 aria-hidden="true" size={15} />
                    </button>
                  )
                ) : (
                  <span
                    className="community-option-row__usage"
                    title="La opción conserva datos históricos y no se puede eliminar"
                  >
                    {usageCount} {usageCount === 1 ? 'uso' : 'usos'}
                  </span>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
