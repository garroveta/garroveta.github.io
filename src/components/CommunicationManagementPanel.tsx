import {
  Archive,
  CheckCircle2,
  Clock,
  ExternalLink,
  Megaphone,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'

import {
  createCommunityCommunication,
  deleteCommunityCommunication,
  updateCommunityCommunication,
  type CommunityCommunicationWriteInput,
} from '../api/communityCommunications'
import type { DemoDataUpdater } from '../data/demoRepository'
import { formatNewsPostForWhatsApp } from '../data/newsSharing'
import type { DemoDataSet, NewsPost, NewsPostType } from '../domain/types'
import type { CommunityCommunicationsStatus } from '../hooks/useCommunityCommunications'
import { isCommunityOptionActive } from '../data/communityOptions'
import { DataStateView } from './DataStateView'
import { ShareActions } from './ShareActions'

type CommunicationManagementPanelProps = {
  data: DemoDataSet
  onDataChange: (updater: DemoDataUpdater) => void
  onReload: () => void
  onViewPost: (postId: string) => void
  persistenceError: unknown
  persistenceStatus: CommunityCommunicationsStatus
}

const typeLabels: Record<NewsPostType, string> = {
  news: 'Actualidad',
  promotion: 'Promoción',
  arrival: 'Novedades',
  urgent: 'Importante',
  poll: 'Encuesta',
  rule: 'Normas',
}

const newsTypes = Object.keys(typeLabels) as NewsPostType[]

function toLocalInputValue(isoInstant?: string) {
  if (!isoInstant) {
    return ''
  }

  const instant = new Date(isoInstant)
  const offset = instant.getTimezoneOffset() * 60_000

  return new Date(instant.getTime() - offset).toISOString().slice(0, 16)
}

function fromLocalInputValue(value: string) {
  return value ? new Date(value).toISOString() : null
}

/**
 * `poll` is not offered until voting actually exists: the type only ever was a
 * badge, on a publication that invited a vote nobody could cast. The label and
 * the stored value stay, so publications created before still read correctly.
 */
const retiredNewsTypes: NewsPostType[] = ['poll']
const creatableNewsTypes = newsTypes.filter(
  (newsType) => !retiredNewsTypes.includes(newsType),
)
const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Europe/Madrid',
})

type PublicationState = 'scheduled' | 'live' | 'expired'

const publicationStateRank: Record<PublicationState, number> = {
  scheduled: 0,
  live: 1,
  expired: 2,
}

/**
 * Scheduling and expiry are read filters, not jobs: this only tells the
 * manager panel how to label and order a row. A member's own visibility comes
 * straight from the same rule applied on the server.
 */
function getPublicationState(
  post: Pick<NewsPost, 'publishedAt' | 'expiresAt'>,
  now: Date,
): PublicationState {
  if (new Date(post.publishedAt) > now) {
    return 'scheduled'
  }

  if (post.expiresAt && new Date(post.expiresAt) <= now) {
    return 'expired'
  }

  return 'live'
}

function CommunicationEditor({
  data,
  post,
  onClose,
  onSave,
}: {
  data: DemoDataSet
  post?: NewsPost
  onClose: () => void
  onSave: (input: CommunityCommunicationWriteInput) => Promise<void>
}) {
  const [type, setType] = useState<NewsPostType>(post?.type ?? 'news')
  const [title, setTitle] = useState(post?.title ?? '')
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '')
  const [content, setContent] = useState(post?.content ?? '')
  const [tagIds, setTagIds] = useState<string[]>(post?.tagIds ?? [])
  const [pinned, setPinned] = useState(post?.pinned ?? false)
  const [publishedAt, setPublishedAt] = useState(
    toLocalInputValue(post?.publishedAt),
  )
  const [expiresAt, setExpiresAt] = useState(toLocalInputValue(post?.expiresAt))
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const activeTags = data.tags.filter(isCommunityOptionActive)

  const toggleTag = (tagId: string) => {
    setTagIds((currentTagIds) =>
      currentTagIds.includes(tagId)
        ? currentTagIds.filter((currentTagId) => currentTagId !== tagId)
        : [...currentTagIds, tagId],
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setSaveError('')

    try {
      await onSave({
        type,
        title,
        excerpt,
        content,
        tagIds,
        pinned,
        publishedAt:
          fromLocalInputValue(publishedAt) ?? new Date().toISOString(),
        expiresAt: fromLocalInputValue(expiresAt),
      })
    } catch {
      setSaveError(
        'No se ha podido guardar la publicación. Inténtalo de nuevo.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="communication-editor" onSubmit={handleSubmit}>
      <div className="communication-editor__heading">
        <div>
          <span>{post ? 'Editar publicación' : 'Nueva publicación'}</span>
          <h3>{post?.title ?? 'Preparar una comunicación'}</h3>
        </div>
        <button type="button" aria-label="Cerrar editor" onClick={onClose}>
          <X aria-hidden="true" size={17} />
        </button>
      </div>

      <div className="communication-editor__fields">
        <label className="form-field">
          <span>Tipo</span>
          <select
            aria-label="Tipo de comunicación"
            value={type}
            onChange={(event) => setType(event.target.value as NewsPostType)}
          >
            {(creatableNewsTypes.includes(type)
              ? creatableNewsTypes
              : [...creatableNewsTypes, type]
            ).map((newsType) => (
              <option key={newsType} value={newsType}>
                {typeLabels[newsType]}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field communication-editor__title">
          <span>Título</span>
          <input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="form-field communication-editor__wide">
          <span>Resumen</span>
          <textarea
            required
            rows={2}
            value={excerpt}
            onChange={(event) => setExcerpt(event.target.value)}
          />
        </label>

        <label className="form-field communication-editor__wide">
          <span>Contenido</span>
          <textarea
            required
            rows={4}
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
        </label>
      </div>

      <fieldset className="communication-audience-editor">
        <legend>Público</legend>
        <p>Sin etiquetas, se mostrará a toda la comunidad.</p>
        <div>
          {activeTags.map((tag) => (
            <label key={tag.id}>
              <input
                type="checkbox"
                checked={tagIds.includes(tag.id)}
                onChange={() => toggleTag(tag.id)}
              />
              <span>{tag.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="communication-schedule">
        <legend>Cuándo se ve</legend>
        <div className="communication-schedule__fields">
          <label className="form-field">
            <span>Se publica</span>
            <input
              aria-label="Fecha de publicación"
              type="datetime-local"
              value={publishedAt}
              onChange={(event) => setPublishedAt(event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Caduca (opcional)</span>
            <input
              aria-label="Fecha de caducidad"
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </label>
        </div>
        <small>
          Una fecha futura mantiene la publicación oculta hasta ese momento. Sin
          caducidad, se queda hasta que la borres.
        </small>
      </fieldset>

      <label className="communication-pin-option">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(event) => setPinned(event.target.checked)}
        />
        <span>Fijar como comunicación prioritaria</span>
      </label>

      <div className="communication-editor__actions">
        <button
          className="secondary-button"
          type="button"
          disabled={isSaving}
          onClick={onClose}
        >
          Cancelar
        </button>
        <button className="primary-button" type="submit" disabled={isSaving}>
          {isSaving ? 'Guardando…' : post ? 'Guardar cambios' : 'Publicar'}
        </button>
      </div>
      {saveError ? (
        <p className="action-message" role="alert">
          {saveError}
        </p>
      ) : null}
    </form>
  )
}

function CommunicationManagementHeading({ onNew }: { onNew?: () => void }) {
  return (
    <div className="configuration-panel-heading communication-management-heading">
      <span aria-hidden="true">
        <Megaphone size={20} />
      </span>
      <div>
        <span>Información de la tienda</span>
        <h2 id="communication-management-title">Publicaciones</h2>
        <p>
          Publica avisos segmentados y mantén actualizada la información visible
          para la comunidad.
        </p>
      </div>
      {onNew ? (
        <button className="primary-button" type="button" onClick={onNew}>
          <Plus aria-hidden="true" size={16} />
          Nueva
        </button>
      ) : null}
    </div>
  )
}

export function CommunicationManagementPanel({
  data,
  onDataChange,
  onReload,
  onViewPost,
  persistenceError,
  persistenceStatus,
}: CommunicationManagementPanelProps) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | NewsPostType>('all')
  const [editorMode, setEditorMode] = useState<'closed' | 'new' | string>(
    'closed',
  )
  const [pendingDeleteId, setPendingDeleteId] = useState<string>()
  const [actionMessage, setActionMessage] = useState('')
  const [savingPostId, setSavingPostId] = useState<string>()
  const [savedPublication, setSavedPublication] = useState<{
    postId: string
    message: string
  }>()
  const availableTypeFilters = useMemo(
    () =>
      newsTypes.filter(
        (newsType) =>
          creatableNewsTypes.includes(newsType) ||
          data.newsPosts.some(({ type }) => type === newsType),
      ),
    [data.newsPosts],
  )
  const getPostShareText = (post: NewsPost) => {
    const tagNames = post.tagIds.flatMap((tagId) => {
      const tag = data.tags.find(({ id }) => id === tagId)
      return tag ? [tag.name] : []
    })

    return formatNewsPostForWhatsApp(post, tagNames, data.community)
  }
  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('es')
    const now = new Date()

    return [...data.newsPosts]
      .filter(({ type }) => typeFilter === 'all' || type === typeFilter)
      .filter((post) => {
        if (!normalizedQuery) {
          return true
        }

        const tagNames = post.tagIds.flatMap((tagId) => {
          const tag = data.tags.find(({ id }) => id === tagId)
          return tag ? [tag.name] : []
        })

        return [post.title, post.excerpt, typeLabels[post.type], ...tagNames]
          .join(' ')
          .toLocaleLowerCase('es')
          .includes(normalizedQuery)
      })
      .sort((first, second) => {
        const firstState = getPublicationState(first, now)
        const secondState = getPublicationState(second, now)
        const stateOrder =
          publicationStateRank[firstState] - publicationStateRank[secondState]

        if (stateOrder !== 0) {
          return stateOrder
        }

        // soonest first while it waits; most recent first once it is live or gone
        return firstState === 'scheduled'
          ? Date.parse(first.publishedAt) - Date.parse(second.publishedAt)
          : Number(second.pinned) - Number(first.pinned) ||
              Date.parse(second.publishedAt) - Date.parse(first.publishedAt)
      })
  }, [data.newsPosts, data.tags, query, typeFilter])
  const editedPost =
    editorMode !== 'closed' && editorMode !== 'new'
      ? data.newsPosts.find(({ id }) => id === editorMode)
      : undefined

  const closeEditor = () => setEditorMode('closed')
  const handleSaved = (postId: string, message: string) => {
    setActionMessage('')
    setSavedPublication({ postId, message })
    closeEditor()
  }
  const savedPost = savedPublication
    ? data.newsPosts.find(({ id }) => id === savedPublication.postId)
    : undefined
  const storeCommunication = (communication: NewsPost) => {
    onDataChange((currentData) => ({
      ...currentData,
      newsPosts: currentData.newsPosts.some(({ id }) => id === communication.id)
        ? currentData.newsPosts.map((candidate) =>
            candidate.id === communication.id ? communication : candidate,
          )
        : [...currentData.newsPosts, communication],
    }))
  }

  const saveCommunication = async (
    post: NewsPost | undefined,
    input: CommunityCommunicationWriteInput,
  ) => {
    const { communication } = post
      ? await updateCommunityCommunication(data.community.id, post.id, input)
      : await createCommunityCommunication(data.community.id, input)

    storeCommunication(communication)
    handleSaved(
      communication.id,
      post ? 'Publicación actualizada.' : 'Publicación guardada.',
    )
  }

  const togglePinned = async (post: NewsPost) => {
    setActionMessage('')
    setSavingPostId(post.id)

    try {
      const { communication } = await updateCommunityCommunication(
        data.community.id,
        post.id,
        {
          content: post.content,
          excerpt: post.excerpt,
          expiresAt: post.expiresAt ?? null,
          pinned: !post.pinned,
          publishedAt: post.publishedAt,
          tagIds: post.tagIds,
          title: post.title,
          type: post.type,
        },
      )
      storeCommunication(communication)
      setActionMessage(
        communication.pinned
          ? 'Comunicación fijada.'
          : 'Comunicación desfijada.',
      )
    } catch {
      setActionMessage(
        'No se ha podido cambiar la prioridad de la comunicación.',
      )
    } finally {
      setSavingPostId(undefined)
    }
  }

  const removeCommunication = async (post: NewsPost) => {
    setActionMessage('')
    setSavingPostId(post.id)

    try {
      const { deletedCommunicationId } = await deleteCommunityCommunication(
        data.community.id,
        post.id,
      )
      onDataChange((currentData) => ({
        ...currentData,
        newsPosts: currentData.newsPosts.filter(
          ({ id }) => id !== deletedCommunicationId,
        ),
      }))
      setPendingDeleteId(undefined)
      setActionMessage('Comunicación eliminada.')
    } catch {
      setActionMessage('No se ha podido eliminar la comunicación.')
    } finally {
      setSavingPostId(undefined)
    }
  }

  if (persistenceStatus === 'idle' || persistenceStatus === 'loading') {
    return (
      <section
        className="communication-management-panel"
        aria-labelledby="communication-management-title"
      >
        <CommunicationManagementHeading />
        <DataStateView
          status="loading"
          loadingTitle="Cargando las publicaciones…"
          loadingDescription="Estamos consultando las comunicaciones de la comunidad."
        />
      </section>
    )
  }

  if (persistenceStatus === 'error') {
    return (
      <section
        className="communication-management-panel"
        aria-labelledby="communication-management-title"
      >
        <CommunicationManagementHeading />
        <DataStateView
          status="error"
          loadingTitle="Cargando las publicaciones…"
          error={persistenceError}
          onRetry={onReload}
        />
      </section>
    )
  }

  return (
    <section
      className="communication-management-panel"
      aria-labelledby="communication-management-title"
    >
      <CommunicationManagementHeading
        onNew={() => {
          setActionMessage('')
          setSavedPublication(undefined)
          setEditorMode('new')
        }}
      />

      {editorMode !== 'closed' ? (
        <CommunicationEditor
          key={editorMode}
          data={data}
          post={editedPost}
          onClose={closeEditor}
          onSave={(input) => saveCommunication(editedPost, input)}
        />
      ) : null}

      {savedPublication ? (
        <section
          className="communication-save-actions"
          aria-labelledby="communication-save-title"
        >
          <CheckCircle2 aria-hidden="true" size={22} />
          <div className="communication-save-actions__message">
            <strong id="communication-save-title">
              {savedPublication.message}
            </strong>
            <span>¿Qué quieres hacer ahora?</span>
          </div>
          <div className="communication-save-actions__buttons">
            <ShareActions
              className="share-actions--contents"
              disabled={!savedPost}
              onFeedback={setActionMessage}
              shareText={savedPost ? getPostShareText(savedPost) : ''}
              showFeedback={false}
              shareSuccessMessage="Se ha abierto WhatsApp. Elige el grupo o contacto y pulsa enviar."
              shareErrorMessage="No se ha podido abrir WhatsApp. Prueba a copiar el texto."
              copyLabel="Copiar para WhatsApp"
              copySuccessMessage="Publicación copiada. Ya puedes pegarla en WhatsApp."
              copyErrorMessage="No se ha podido copiar. Revisa los permisos del navegador."
            />
            <button
              type="button"
              disabled={!savedPost}
              onClick={() => (savedPost ? onViewPost(savedPost.id) : undefined)}
            >
              <ExternalLink aria-hidden="true" size={16} />
              Ver la publicación
            </button>
            <button
              type="button"
              onClick={() => {
                setSavedPublication(undefined)
                setActionMessage('')
              }}
            >
              <X aria-hidden="true" size={16} />
              Cerrar
            </button>
          </div>
        </section>
      ) : null}

      <div className="communication-management-toolbar">
        <label className="member-search">
          <Search aria-hidden="true" size={18} />
          <input
            type="search"
            aria-label="Buscar publicaciones"
            placeholder="Buscar por título, tipo o etiqueta"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="communication-type-filter">
          <span>Tipo</span>
          <select
            aria-label="Filtrar comunicaciones por tipo"
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value as 'all' | NewsPostType)
            }
          >
            <option value="all">Todos</option>
            {availableTypeFilters.map((newsType) => (
              <option key={newsType} value={newsType}>
                {typeLabels[newsType]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p
        className="action-message communication-action-message"
        aria-live="polite"
      >
        {actionMessage}
      </p>

      <div className="managed-communication-list">
        {/* Recomputed each render rather than ticking live: a schedule
            crossing over can lag until the next render, which never affects
            what a member actually sees — the server applies the same rule
            independently. */}
        {filteredPosts.map((post) => {
          const author = data.members.find(
            ({ id }) => id === post.authorMemberId,
          )
          const tagNames = post.tagIds.flatMap((tagId) => {
            const tag = data.tags.find(({ id }) => id === tagId)
            return tag ? [tag.name] : []
          })
          const state = getPublicationState(post, new Date())
          const dateLabel =
            state === 'scheduled'
              ? `Se publica el ${dateFormatter.format(new Date(post.publishedAt))}`
              : state === 'expired'
                ? `Caducó el ${dateFormatter.format(new Date(post.expiresAt!))}`
                : `Publicado el ${dateFormatter.format(new Date(post.publishedAt))}`

          return (
            <article
              className={`managed-communication-row managed-communication-row--${state}`}
              key={post.id}
            >
              <div className="managed-communication-row__identity">
                <div>
                  <span
                    className={`publication-type publication-type--${post.type}`}
                  >
                    {typeLabels[post.type]}
                  </span>
                  {state === 'scheduled' ? (
                    <span className="communication-schedule-label communication-schedule-label--scheduled">
                      <Clock aria-hidden="true" size={12} /> Programada
                    </span>
                  ) : state === 'expired' ? (
                    <span className="communication-schedule-label communication-schedule-label--expired">
                      <Archive aria-hidden="true" size={12} /> Caducada
                    </span>
                  ) : null}
                  {post.pinned ? (
                    <span className="communication-pinned-label">
                      <Pin aria-hidden="true" size={12} /> Fijada
                    </span>
                  ) : null}
                </div>
                <strong>{post.title}</strong>
                <small>
                  {tagNames.length > 0
                    ? tagNames.join(', ')
                    : 'Toda la comunidad'}{' '}
                  · {author?.displayName ?? data.community.name} · {dateLabel}
                </small>
              </div>

              <div className="managed-communication-row__actions">
                <ShareActions
                  className="share-actions--contents"
                  hideLabels
                  onFeedback={setActionMessage}
                  shareAriaLabel={`Enviar ${post.title} por WhatsApp`}
                  shareButtonClassName="managed-communication-row__whatsapp"
                  shareText={getPostShareText(post)}
                  showFeedback={false}
                  shareSuccessMessage="Se ha abierto WhatsApp. Elige el grupo o contacto y pulsa enviar."
                  shareErrorMessage="No se ha podido abrir WhatsApp. Prueba a copiar el texto."
                  copyAriaLabel={`Copiar ${post.title} para WhatsApp`}
                  copyButtonClassName="managed-communication-row__copy"
                  copyLabel="Copiar para WhatsApp"
                  copySuccessMessage="Comunicación copiada. Ya puedes pegarla en WhatsApp."
                  copyErrorMessage="No se ha podido copiar. Revisa los permisos del navegador."
                />
                <button
                  type="button"
                  disabled={savingPostId === post.id}
                  aria-label={
                    post.pinned
                      ? `Desfijar ${post.title}`
                      : `Fijar ${post.title}`
                  }
                  title={post.pinned ? 'Desfijar' : 'Fijar'}
                  onClick={() => void togglePinned(post)}
                >
                  {post.pinned ? (
                    <PinOff aria-hidden="true" size={16} />
                  ) : (
                    <Pin aria-hidden="true" size={16} />
                  )}
                </button>
                <button
                  type="button"
                  aria-label={`Modificar ${post.title}`}
                  title="Modificar"
                  onClick={() => {
                    setActionMessage('')
                    setSavedPublication(undefined)
                    setEditorMode(post.id)
                  }}
                >
                  <Pencil aria-hidden="true" size={16} />
                </button>
                <button
                  className="managed-communication-row__delete"
                  type="button"
                  disabled={savingPostId === post.id}
                  aria-label={`Eliminar ${post.title}`}
                  title="Eliminar"
                  onClick={() => setPendingDeleteId(post.id)}
                >
                  <Trash2 aria-hidden="true" size={16} />
                </button>
              </div>

              {pendingDeleteId === post.id ? (
                <div className="communication-delete-confirmation">
                  <span>¿Eliminar esta comunicación?</span>
                  <button
                    type="button"
                    disabled={savingPostId === post.id}
                    onClick={() => void removeCommunication(post)}
                  >
                    {savingPostId === post.id ? 'Eliminando…' : 'Confirmar'}
                  </button>
                  <button
                    type="button"
                    disabled={savingPostId === post.id}
                    onClick={() => setPendingDeleteId(undefined)}
                  >
                    Cancelar
                  </button>
                </div>
              ) : null}
            </article>
          )
        })}
      </div>

      {filteredPosts.length === 0 ? (
        <p className="filtered-empty-state">
          No hay publicaciones para estos filtros.
        </p>
      ) : null}
    </section>
  )
}
