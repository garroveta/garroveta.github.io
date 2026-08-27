import {
  Check,
  Copy,
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

import type { DemoDataUpdater } from '../data/demoRepository'
import {
  deleteNewsPost,
  publishNewsPost,
  setNewsPostPinned,
  updateNewsPost,
} from '../data/newsMutations'
import { formatNewsPostForWhatsApp } from '../data/newsSharing'
import type { DemoDataSet, NewsPost, NewsPostType } from '../domain/types'
import { isCommunityOptionActive } from '../data/communityOptions'

type CommunicationManagementPanelProps = {
  data: DemoDataSet
  managerId: string
  onDataChange: (updater: DemoDataUpdater) => void
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
const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Europe/Madrid',
})

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()

  if (!copied) {
    throw new Error('Clipboard unavailable')
  }
}

function CommunicationEditor({
  data,
  managerId,
  post,
  onClose,
  onDataChange,
  onSaved,
}: CommunicationManagementPanelProps & {
  post?: NewsPost
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const [type, setType] = useState<NewsPostType>(post?.type ?? 'news')
  const [title, setTitle] = useState(post?.title ?? '')
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '')
  const [content, setContent] = useState(post?.content ?? '')
  const [tagIds, setTagIds] = useState<string[]>(post?.tagIds ?? [])
  const [pinned, setPinned] = useState(post?.pinned ?? false)
  const activeTags = data.tags.filter(isCommunityOptionActive)

  const toggleTag = (tagId: string) => {
    setTagIds((currentTagIds) =>
      currentTagIds.includes(tagId)
        ? currentTagIds.filter((currentTagId) => currentTagId !== tagId)
        : [...currentTagIds, tagId],
    )
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const input = { type, title, excerpt, content, tagIds, pinned }

    onDataChange((currentData) =>
      post
        ? updateNewsPost(currentData, post.id, managerId, input)
        : publishNewsPost(currentData, {
            ...input,
            authorMemberId: managerId,
          }),
    )
    onSaved(post ? 'Comunicación actualizada.' : 'Comunicación publicada.')
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
            {newsTypes.map((newsType) => (
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

      <label className="communication-pin-option">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(event) => setPinned(event.target.checked)}
        />
        <span>Fijar como comunicación prioritaria</span>
      </label>

      <div className="communication-editor__actions">
        <button className="secondary-button" type="button" onClick={onClose}>
          Cancelar
        </button>
        <button className="primary-button" type="submit">
          {post ? 'Guardar cambios' : 'Publicar'}
        </button>
      </div>
    </form>
  )
}

export function CommunicationManagementPanel({
  data,
  managerId,
  onDataChange,
}: CommunicationManagementPanelProps) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | NewsPostType>('all')
  const [editorMode, setEditorMode] = useState<'closed' | 'new' | string>(
    'closed',
  )
  const [pendingDeleteId, setPendingDeleteId] = useState<string>()
  const [copiedPostId, setCopiedPostId] = useState<string>()
  const [actionMessage, setActionMessage] = useState('')
  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('es')

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
      .sort(
        (first, second) =>
          Number(second.pinned) - Number(first.pinned) ||
          Date.parse(second.publishedAt) - Date.parse(first.publishedAt),
      )
  }, [data.newsPosts, data.tags, query, typeFilter])
  const editedPost =
    editorMode !== 'closed' && editorMode !== 'new'
      ? data.newsPosts.find(({ id }) => id === editorMode)
      : undefined

  const closeEditor = () => setEditorMode('closed')
  const handleSaved = (message: string) => {
    setActionMessage(message)
    closeEditor()
  }

  return (
    <section
      className="communication-management-panel"
      aria-labelledby="communication-management-title"
    >
      <div className="configuration-panel-heading communication-management-heading">
        <span aria-hidden="true">
          <Megaphone size={20} />
        </span>
        <div>
          <span>Información de la tienda</span>
          <h2 id="communication-management-title">Comunicaciones</h2>
          <p>
            Publica avisos segmentados y mantén actualizada la información
            visible para la comunidad.
          </p>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => {
            setActionMessage('')
            setEditorMode('new')
          }}
        >
          <Plus aria-hidden="true" size={16} />
          Nueva
        </button>
      </div>

      {editorMode !== 'closed' ? (
        <CommunicationEditor
          key={editorMode}
          data={data}
          managerId={managerId}
          post={editedPost}
          onClose={closeEditor}
          onDataChange={onDataChange}
          onSaved={handleSaved}
        />
      ) : null}

      <div className="communication-management-toolbar">
        <label className="member-search">
          <Search aria-hidden="true" size={18} />
          <input
            type="search"
            aria-label="Buscar comunicaciones"
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
            {newsTypes.map((newsType) => (
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
        {filteredPosts.map((post) => {
          const author = data.members.find(
            ({ id }) => id === post.authorMemberId,
          )
          const tagNames = post.tagIds.flatMap((tagId) => {
            const tag = data.tags.find(({ id }) => id === tagId)
            return tag ? [tag.name] : []
          })

          return (
            <article className="managed-communication-row" key={post.id}>
              <div className="managed-communication-row__identity">
                <div>
                  <span
                    className={`publication-type publication-type--${post.type}`}
                  >
                    {typeLabels[post.type]}
                  </span>
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
                  · {author?.displayName ?? 'CRC Delorean'} ·{' '}
                  {dateFormatter.format(new Date(post.publishedAt))}
                </small>
              </div>

              <div className="managed-communication-row__actions">
                <button
                  className={
                    copiedPostId === post.id
                      ? 'managed-communication-row__copy managed-communication-row__copy--done'
                      : 'managed-communication-row__copy'
                  }
                  type="button"
                  aria-label={`Copiar ${post.title} para WhatsApp`}
                  title="Copiar para WhatsApp"
                  onClick={async () => {
                    try {
                      await copyText(
                        formatNewsPostForWhatsApp(
                          post,
                          tagNames,
                          data.community,
                        ),
                      )
                      setCopiedPostId(post.id)
                      setActionMessage(
                        'Comunicación copiada. Ya puedes pegarla en WhatsApp.',
                      )
                    } catch {
                      setCopiedPostId(undefined)
                      setActionMessage(
                        'No se ha podido copiar. Revisa los permisos del navegador.',
                      )
                    }
                  }}
                >
                  {copiedPostId === post.id ? (
                    <Check aria-hidden="true" size={16} />
                  ) : (
                    <Copy aria-hidden="true" size={16} />
                  )}
                </button>
                <button
                  type="button"
                  aria-label={
                    post.pinned
                      ? `Desfijar ${post.title}`
                      : `Fijar ${post.title}`
                  }
                  title={post.pinned ? 'Desfijar' : 'Fijar'}
                  onClick={() =>
                    onDataChange((currentData) =>
                      setNewsPostPinned(
                        currentData,
                        post.id,
                        managerId,
                        !post.pinned,
                      ),
                    )
                  }
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
                    setEditorMode(post.id)
                  }}
                >
                  <Pencil aria-hidden="true" size={16} />
                </button>
                <button
                  className="managed-communication-row__delete"
                  type="button"
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
                    onClick={() => {
                      onDataChange((currentData) =>
                        deleteNewsPost(currentData, post.id, managerId),
                      )
                      setPendingDeleteId(undefined)
                      setActionMessage('Comunicación eliminada.')
                    }}
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
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
          No hay comunicaciones para estos filtros.
        </p>
      ) : null}
    </section>
  )
}
