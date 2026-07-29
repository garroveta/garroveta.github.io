import {
  ArrowLeft,
  BellRing,
  ChevronRight,
  Megaphone,
  Pin,
  Plus,
  Tags,
  X,
} from 'lucide-react'
import type { CSSProperties, FormEvent } from 'react'
import { useState } from 'react'

import type { DemoRole } from '../app/demoRoles'
import { publishNewsPost } from '../data/newsMutations'
import {
  getNewsById,
  getNewsFeed,
  type NewsListItem,
} from '../data/newsSelectors'
import type { DemoDataUpdater } from '../data/demoRepository'
import type {
  CommunityMember,
  DemoDataSet,
  NewsPostType,
} from '../domain/types'

type NewsPageProps = {
  activeRole: DemoRole
  data: DemoDataSet
  currentMember: CommunityMember
  publishingMember: CommunityMember
  onDataChange: (updater: DemoDataUpdater) => void
}

const newsTypeLabels: Record<NewsPostType, string> = {
  news: 'Actualidad',
  promotion: 'Promoción',
  arrival: 'Novedades',
  urgent: 'Importante',
  poll: 'Encuesta',
  rule: 'Normas',
}

const newsTypes = Object.keys(newsTypeLabels) as NewsPostType[]

const newsDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Madrid',
})

function TargetTags({ item }: { item: NewsListItem }) {
  if (item.tags.length === 0) {
    return (
      <span className="news-audience">
        <Megaphone aria-hidden="true" size={14} />
        Toda la comunidad
      </span>
    )
  }

  return (
    <div className="news-target-tags" aria-label="Público">
      {item.tags.map((tag) => (
        <span
          key={tag.id}
          style={{ '--tag-color': tag.color } as CSSProperties}
        >
          {tag.name}
        </span>
      ))}
    </div>
  )
}

function NewsCard({
  item,
  onSelect,
}: {
  item: NewsListItem
  onSelect: (newsPostId: string) => void
}) {
  return (
    <article className="publication-card">
      <div className="publication-card__topline">
        <span
          className={`publication-type publication-type--${item.post.type}`}
        >
          {newsTypeLabels[item.post.type]}
        </span>
        {item.post.pinned ? (
          <span className="pinned-label">
            <Pin aria-hidden="true" size={13} />
            Fijada
          </span>
        ) : null}
      </div>

      <h3>{item.post.title}</h3>
      <p>{item.post.excerpt}</p>
      <TargetTags item={item} />

      <div className="publication-card__footer">
        <span>
          {item.author.displayName} ·{' '}
          <time dateTime={item.post.publishedAt}>
            {newsDateFormatter.format(new Date(item.post.publishedAt))}
          </time>
        </span>
        <button
          className="event-detail-link"
          type="button"
          onClick={() => onSelect(item.post.id)}
        >
          Leer
          <ChevronRight aria-hidden="true" size={17} />
        </button>
      </div>
    </article>
  )
}

function NewsDetail({
  item,
  onBack,
}: {
  item: NewsListItem
  onBack: () => void
}) {
  return (
    <div className="page news-detail-page">
      <button className="back-button" type="button" onClick={onBack}>
        <ArrowLeft aria-hidden="true" size={18} />
        Volver a las noticias
      </button>

      <article className="news-detail">
        <div className="publication-card__topline">
          <span
            className={`publication-type publication-type--${item.post.type}`}
          >
            {newsTypeLabels[item.post.type]}
          </span>
          {item.post.pinned ? (
            <span className="pinned-label">
              <Pin aria-hidden="true" size={13} />
              Fijada
            </span>
          ) : null}
        </div>

        <h1>{item.post.title}</h1>
        <p className="news-detail__lead">{item.post.excerpt}</p>
        <p className="news-detail__content">{item.post.content}</p>

        <TargetTags item={item} />

        <footer>
          Publicado por <strong>{item.author.displayName}</strong> el{' '}
          <time dateTime={item.post.publishedAt}>
            {newsDateFormatter.format(new Date(item.post.publishedAt))}
          </time>
        </footer>
      </article>
    </div>
  )
}

function NewsComposer({
  data,
  publishingMember,
  onClose,
  onDataChange,
  onPublished,
}: {
  data: DemoDataSet
  publishingMember: CommunityMember
  onClose: () => void
  onDataChange: (updater: DemoDataUpdater) => void
  onPublished: () => void
}) {
  const [type, setType] = useState<NewsPostType>('news')
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [tagIds, setTagIds] = useState<string[]>([])
  const [pinned, setPinned] = useState(false)

  const toggleTag = (tagId: string) => {
    setTagIds((currentTagIds) =>
      currentTagIds.includes(tagId)
        ? currentTagIds.filter((currentTagId) => currentTagId !== tagId)
        : [...currentTagIds, tagId],
    )
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onDataChange((currentData) =>
      publishNewsPost(currentData, {
        authorMemberId: publishingMember.id,
        type,
        title,
        excerpt,
        content,
        tagIds,
        pinned,
      }),
    )
    onPublished()
  }

  return (
    <form
      className="news-composer"
      aria-label="Nueva publicación"
      onSubmit={handleSubmit}
    >
      <div className="news-composer__heading">
        <div>
          <span>Publicar como {publishingMember.displayName}</span>
          <h2>Nueva publicación</h2>
        </div>
        <button type="button" aria-label="Cerrar formulario" onClick={onClose}>
          <X aria-hidden="true" size={18} />
        </button>
      </div>

      <label className="form-field">
        <span>Tipo</span>
        <select
          value={type}
          onChange={(event) => setType(event.target.value as NewsPostType)}
        >
          {newsTypes.map((newsType) => (
            <option key={newsType} value={newsType}>
              {newsTypeLabels[newsType]}
            </option>
          ))}
        </select>
      </label>

      <label className="form-field">
        <span>Título</span>
        <input
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>

      <label className="form-field">
        <span>Resumen</span>
        <textarea
          required
          rows={2}
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
        />
      </label>

      <label className="form-field">
        <span>Contenido</span>
        <textarea
          required
          rows={5}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      </label>

      <fieldset className="composer-tags">
        <legend>Público</legend>
        <p>Sin etiqueta, la publicación será visible para toda la comunidad.</p>
        <div>
          {data.tags.map((tag) => (
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

      <label className="pin-option">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(event) => setPinned(event.target.checked)}
        />
        <span>
          <strong>Fijar publicación</strong>
          Mantenerla entre las comunicaciones prioritarias.
        </span>
      </label>

      <div className="composer-actions">
        <button className="secondary-button" type="button" onClick={onClose}>
          Cancelar
        </button>
        <button className="primary-button" type="submit">
          Publicar
        </button>
      </div>
    </form>
  )
}

export function NewsPage({
  activeRole,
  data,
  currentMember,
  publishingMember,
  onDataChange,
}: NewsPageProps) {
  const [selectedPostId, setSelectedPostId] = useState<string>()
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [publicationMessage, setPublicationMessage] = useState('')
  const [feedMode, setFeedMode] = useState<'personalized' | 'all'>(
    'personalized',
  )
  const [activeTagId, setActiveTagId] = useState<string>()
  const feed = getNewsFeed(data, {
    memberId: feedMode === 'personalized' ? currentMember.id : undefined,
    tagId: activeTagId,
  })
  const memberTags = data.tags.filter((tag) =>
    currentMember.tagIds.includes(tag.id),
  )
  const publicationTags = data.tags.filter((tag) =>
    data.newsPosts.some((post) => post.tagIds.includes(tag.id)),
  )
  const selectedPost = selectedPostId
    ? getNewsById(data, selectedPostId)
    : undefined

  if (selectedPost) {
    return (
      <NewsDetail
        item={selectedPost}
        onBack={() => setSelectedPostId(undefined)}
      />
    )
  }

  return (
    <div className="page">
      <header className="page-heading">
        <span className="page-eyebrow">
          <BellRing aria-hidden="true" size={14} />
          CRC Delorean
        </span>
        <h1>Noticias</h1>
        <p>
          Actualidad, horarios y comunicaciones de la tienda, sin perder la
          información importante entre mensajes.
        </p>
      </header>

      {activeRole !== 'jugador' ? (
        <div className="manager-news-tools">
          {isComposerOpen ? (
            <NewsComposer
              data={data}
              publishingMember={publishingMember}
              onClose={() => setIsComposerOpen(false)}
              onDataChange={onDataChange}
              onPublished={() => {
                setIsComposerOpen(false)
                setFeedMode('all')
                setActiveTagId(undefined)
                setPublicationMessage('La publicación ya está visible.')
              }}
            />
          ) : (
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setPublicationMessage('')
                setIsComposerOpen(true)
              }}
            >
              <Plus aria-hidden="true" size={17} />
              Nueva publicación
            </button>
          )}
          <p className="action-message" aria-live="polite">
            {publicationMessage}
          </p>
        </div>
      ) : null}

      <section className="news-feed" aria-labelledby="news-feed-title">
        <div className="section-heading">
          <div>
            <span>Comunidad</span>
            <h2 id="news-feed-title">
              {feedMode === 'personalized'
                ? 'Publicaciones para ti'
                : 'Todas las publicaciones'}
            </h2>
          </div>
          <p>{feed.length} publicadas</p>
        </div>

        <div className="news-feed-controls">
          <div className="segmented-control" aria-label="Vista de noticias">
            <button
              type="button"
              aria-pressed={feedMode === 'personalized'}
              onClick={() => {
                setFeedMode('personalized')
                setActiveTagId(undefined)
              }}
            >
              Para mí
            </button>
            <button
              type="button"
              aria-pressed={feedMode === 'all'}
              onClick={() => setFeedMode('all')}
            >
              Todas
            </button>
          </div>

          {feedMode === 'personalized' ? (
            <p>
              Incluye avisos generales y tus etiquetas:{' '}
              <strong>
                {memberTags.map(({ name }) => name).join(', ') || 'ninguna'}
              </strong>
            </p>
          ) : (
            <div className="tag-filter" aria-label="Filtrar por etiqueta">
              <button
                type="button"
                aria-pressed={!activeTagId}
                onClick={() => setActiveTagId(undefined)}
              >
                Todas
              </button>
              {publicationTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={activeTagId === tag.id}
                  onClick={() => setActiveTagId(tag.id)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="publication-list">
          {feed.length > 0 ? (
            feed.map((item) => (
              <NewsCard
                item={item}
                key={item.post.id}
                onSelect={setSelectedPostId}
              />
            ))
          ) : (
            <p className="filtered-empty-state">
              No hay publicaciones para esta etiqueta.
            </p>
          )}
        </div>
      </section>

      <p className="news-member-note">
        <Tags aria-hidden="true" size={15} />
        Viendo la comunidad como {currentMember.displayName}
      </p>
    </div>
  )
}
