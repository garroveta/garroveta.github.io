import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Edit3,
  FileUp,
  ListChecks,
  MapPin,
  Plus,
  RotateCcw,
  Rows3,
  Trash2,
  UserMinus,
  UsersRound,
  X,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'

import type { DemoRole } from '../app/demoRoles'
import type { AppRoute } from '../app/navigation'
import type { CommunityEventWriteInput } from '../api/communityEvents'
import { EventLinkImportPanel } from '../components/EventLinkImportPanel'
import { isCommunityOptionActive } from '../data/communityOptions'
import {
  cancelEventRegistration,
  leaveEventWaitlist,
  registerForEvent,
  registerMemberForEventByManager,
  removeEventParticipant,
  setEventAttendance,
} from '../data/eventMutations'
import {
  filterEventAgenda,
  getEventAgenda,
  getEventById,
  getEventParticipants,
  type EventListItem,
} from '../data/eventSelectors'
import type { DemoDataUpdater } from '../data/demoRepository'
import type { CommunityEventsStatus } from '../hooks/useCommunityEvents'
import {
  EVENT_TYPE_LABELS,
  getRegistrationRule,
} from '../data/registrationSettings'
import type {
  CommunityEvent,
  CommunityMember,
  DemoDataSet,
  EventType,
} from '../domain/types'

type EventsPageProps = {
  activeRole: DemoRole
  data: DemoDataSet
  currentMember: CommunityMember
  publishingMember: CommunityMember
  eventPersistenceStatus: CommunityEventsStatus
  onDataChange: (updater: DemoDataUpdater) => void
  onCreateEvent: (input: CommunityEventWriteInput) => Promise<void>
  onDeleteEvent: (eventId: string) => Promise<void>
  onNavigate: (route: AppRoute, query?: string) => void
  onReloadEvents: () => void
  onUpdateEvent: (
    eventId: string,
    input: CommunityEventWriteInput,
  ) => Promise<void>
  initialManagerAction?: 'new'
}

const eventDateFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Madrid',
})

const timeFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Madrid',
})

const compactDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  timeZone: 'Europe/Madrid',
})

type EventViewMode = 'agenda' | 'list'

const eventViewStorageKey = 'events:view-mode'

function getInitialEventViewMode(): EventViewMode {
  if (typeof window === 'undefined') {
    return 'agenda'
  }

  try {
    const storedView = window.localStorage.getItem(eventViewStorageKey)

    if (storedView === 'agenda' || storedView === 'list') {
      return storedView
    }
  } catch {
    // A browser can disable local storage while still allowing the prototype.
  }

  return window.matchMedia?.('(min-width: 58rem)').matches ? 'list' : 'agenda'
}

const registrationLabels = {
  confirmed: 'Inscripción confirmada',
  waitlisted: 'En lista de espera',
  attended: 'Asistencia registrada',
  cancelled: 'Inscripción cancelada',
}

const compactRegistrationLabels = {
  confirmed: 'Inscrito',
  waitlisted: 'En espera',
  attended: 'Asistió',
  cancelled: '',
}

function madridOffsetForDate(date: string) {
  const offsetName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    timeZoneName: 'longOffset',
  })
    .formatToParts(new Date(`${date}T12:00:00Z`))
    .find(({ type }) => type === 'timeZoneName')
    ?.value.replace('GMT', '')

  return offsetName || '+01:00'
}

function buildMadridIso(date: string, time: string) {
  return `${date}T${time}:00${madridOffsetForDate(date)}`
}

function madridDatePart(isoDate: string) {
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Europe/Madrid',
  }).format(new Date(isoDate))
}

function madridTimePart(isoDate: string) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Europe/Madrid',
  }).format(new Date(isoDate))
}

function nextCalendarDate(date: string) {
  return addCalendarDays(date, 1)
}

function addCalendarDays(date: string, days: number) {
  const nextDate = new Date(`${date}T12:00:00Z`)
  nextDate.setUTCDate(nextDate.getUTCDate() + days)
  return nextDate.toISOString().slice(0, 10)
}

function EventComposer({
  data,
  eventToDuplicate,
  eventToEdit,
  onClose,
  onSave,
  onPublished,
}: {
  data: DemoDataSet
  eventToDuplicate?: CommunityEvent
  eventToEdit?: CommunityEvent
  onClose: () => void
  onSave: (input: CommunityEventWriteInput) => Promise<void>
  onPublished: () => void
}) {
  const sourceEvent = eventToEdit ?? eventToDuplicate
  const availableGames = data.games.filter(
    (game) => isCommunityOptionActive(game) || game.id === eventToEdit?.gameId,
  )
  const initialGameId = sourceEvent?.gameId ?? availableGames[0]?.id ?? ''
  const [gameId, setGameId] = useState(initialGameId)
  const [formatId, setFormatId] = useState(
    sourceEvent
      ? (sourceEvent.formatId ?? '')
      : (data.competitionFormats.find(
          (format) =>
            format.gameId === initialGameId && isCommunityOptionActive(format),
        )?.id ?? ''),
  )
  const [competitionEventKindId, setCompetitionEventKindId] = useState(
    sourceEvent
      ? (sourceEvent.competitionEventKindId ?? '')
      : (data.competitionEventKinds.find(isCommunityOptionActive)?.id ?? ''),
  )
  const [type, setType] = useState<EventType>(sourceEvent?.type ?? 'tournament')
  const [title, setTitle] = useState(sourceEvent?.title ?? '')
  const [description, setDescription] = useState(sourceEvent?.description ?? '')
  const [imageUri, setImageUri] = useState(sourceEvent?.imageUri ?? '')
  const [date, setDate] = useState(
    sourceEvent
      ? eventToDuplicate
        ? addCalendarDays(madridDatePart(sourceEvent.startsAt), 7)
        : madridDatePart(sourceEvent.startsAt)
      : '2026-08-15',
  )
  const [startsAt, setStartsAt] = useState(
    sourceEvent ? madridTimePart(sourceEvent.startsAt) : '17:00',
  )
  const [endsAt, setEndsAt] = useState(
    sourceEvent?.endsAt ? madridTimePart(sourceEvent.endsAt) : '21:00',
  )
  const initialRegistrationRule = getRegistrationRule(
    data.registrationSettings,
    sourceEvent?.type ?? 'tournament',
  )
  const [capacity, setCapacity] = useState(
    String(sourceEvent?.capacity || initialRegistrationRule.defaultCapacity),
  )
  const [registrationEnabled, setRegistrationEnabled] = useState(
    sourceEvent?.registrationEnabled ??
      initialRegistrationRule.enabledByDefault,
  )
  const [waitlistEnabled, setWaitlistEnabled] = useState(
    sourceEvent?.waitlistEnabled ?? initialRegistrationRule.waitlistEnabled,
  )
  const [listedInAgenda, setListedInAgenda] = useState(
    sourceEvent?.listedInAgenda ?? true,
  )
  const [countsForCommunityRanking, setCountsForCommunityRanking] = useState(
    sourceEvent?.countsForCommunityRanking ?? false,
  )
  const [tagIds, setTagIds] = useState<string[]>(sourceEvent?.tagIds ?? [])
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const availableFormats = data.competitionFormats.filter(
    (format) =>
      format.gameId === gameId &&
      (isCommunityOptionActive(format) || format.id === eventToEdit?.formatId),
  )
  const availableEventKinds = data.competitionEventKinds.filter(
    (eventKind) =>
      isCommunityOptionActive(eventKind) ||
      eventKind.id === eventToEdit?.competitionEventKindId,
  )
  const availableTags = data.tags.filter(
    (tag) =>
      isCommunityOptionActive(tag) || eventToEdit?.tagIds.includes(tag.id),
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const endDate = endsAt <= startsAt ? nextCalendarDate(date) : date
    const input = {
      gameId,
      formatId: gameId === 'game-mtg' ? formatId : undefined,
      competitionEventKindId:
        gameId === 'game-mtg' ? competitionEventKindId : undefined,
      type,
      title,
      description,
      imageUri,
      startsAt: buildMadridIso(date, startsAt),
      endsAt: buildMadridIso(endDate, endsAt),
      listedInAgenda,
      countsForCommunityRanking,
      registrationEnabled,
      waitlistEnabled,
      capacity: Number(capacity),
      tagIds,
    }

    setSaveError('')
    setIsSaving(true)

    try {
      await onSave(input)
      onPublished()
    } catch {
      setSaveError(
        'No se ha podido guardar el evento. Comprueba los datos e inténtalo de nuevo.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const toggleTag = (tagId: string) => {
    setTagIds((currentTagIds) =>
      currentTagIds.includes(tagId)
        ? currentTagIds.filter((candidate) => candidate !== tagId)
        : [...currentTagIds, tagId],
    )
  }

  return (
    <form className="event-composer" onSubmit={handleSubmit}>
      <div className="event-composer__heading">
        <div>
          <span>Herramienta del gerente</span>
          <h2>
            {eventToEdit
              ? 'Modificar evento'
              : eventToDuplicate
                ? 'Duplicar evento'
                : 'Crear un evento'}
          </h2>
          {eventToDuplicate ? (
            <p className="event-composer__duplicate-note">
              Se han copiado los datos y la fecha se ha movido siete días.
            </p>
          ) : null}
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar formulario">
          <X aria-hidden="true" size={18} />
        </button>
      </div>

      <div className="event-composer__grid">
        <label className="form-field">
          <span>Juego</span>
          <select
            value={gameId}
            onChange={(event) => {
              const nextGameId = event.target.value
              setGameId(nextGameId)
              setFormatId(
                data.competitionFormats.find(
                  (format) =>
                    format.gameId === nextGameId &&
                    isCommunityOptionActive(format),
                )?.id ?? '',
              )
              if (nextGameId !== 'game-mtg') {
                setRegistrationEnabled(false)
                setCountsForCommunityRanking(false)
              } else if (!eventToEdit) {
                const rule = getRegistrationRule(
                  data.registrationSettings,
                  type,
                )
                setRegistrationEnabled(rule.enabledByDefault)
                setCapacity(String(rule.defaultCapacity))
                setWaitlistEnabled(rule.waitlistEnabled)
              }
            }}
            required
          >
            {availableGames.map((game) => (
              <option key={game.id} value={game.id}>
                {game.name}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Tipo de actividad</span>
          <select
            value={type}
            onChange={(event) => {
              const nextType = event.target.value as EventType
              setType(nextType)

              if (!eventToEdit && gameId === 'game-mtg') {
                const rule = getRegistrationRule(
                  data.registrationSettings,
                  nextType,
                )
                setRegistrationEnabled(rule.enabledByDefault)
                setCapacity(String(rule.defaultCapacity))
                setWaitlistEnabled(rule.waitlistEnabled)
              }
            }}
          >
            {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map(
              (eventType) => (
                <option key={eventType} value={eventType}>
                  {EVENT_TYPE_LABELS[eventType]}
                </option>
              ),
            )}
          </select>
        </label>
      </div>

      {gameId === 'game-mtg' ? (
        <div className="event-composer__grid">
          <label className="form-field">
            <span>Formato MTG</span>
            <select
              value={formatId}
              onChange={(event) => setFormatId(event.target.value)}
              required
            >
              <option disabled value="">
                Seleccionar formato
              </option>
              {availableFormats.map((format) => (
                <option key={format.id} value={format.id}>
                  {format.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Tipo de evento competitivo</span>
            <select
              value={competitionEventKindId}
              onChange={(event) =>
                setCompetitionEventKindId(event.target.value)
              }
              required
            >
              <option disabled value="">
                Seleccionar tipo
              </option>
              {availableEventKinds.map((eventKind) => (
                <option key={eventKind.id} value={eventKind.id}>
                  {eventKind.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <label className="form-field">
        <span>Título</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ej. Liga One Piece"
          required
        />
      </label>

      <label className="form-field">
        <span>Descripción</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Información útil para los participantes"
          rows={3}
          required
        />
      </label>

      <label className="form-field">
        <span>URL de la imagen o cartel (opcional)</span>
        <input
          type="url"
          value={imageUri}
          onChange={(event) => setImageUri(event.target.value)}
          placeholder="https://…"
        />
      </label>

      <div className="event-composer__grid event-composer__grid--schedule">
        <label className="form-field">
          <span>Fecha</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </label>
        <label className="form-field">
          <span>Inicio</span>
          <input
            type="time"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            required
          />
        </label>
        <label className="form-field">
          <span>Fin</span>
          <input
            type="time"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            required
          />
        </label>
        {registrationEnabled ? (
          <label className="form-field">
            <span>Plazas</span>
            <input
              type="number"
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              min={eventToEdit?.registrationSummary.confirmed ?? 1}
              max="500"
              required
            />
          </label>
        ) : null}
      </div>

      <div className="event-publication-options">
        <label className="event-registration-option">
          <input
            type="checkbox"
            checked={listedInAgenda}
            onChange={(event) => setListedInAgenda(event.target.checked)}
          />
          <span>
            <strong>Mostrar en la agenda</strong>
            Permite preparar el evento antes de hacerlo visible para la
            comunidad.
          </span>
        </label>

        {gameId === 'game-mtg' ? (
          <label className="event-registration-option">
            <input
              type="checkbox"
              checked={countsForCommunityRanking}
              onChange={(event) =>
                setCountsForCommunityRanking(event.target.checked)
              }
            />
            <span>
              <strong>Contar para el ranking comunitario</strong>
              Los resultados importados sumarán puntos según el barómetro de la
              comunidad.
            </span>
          </label>
        ) : null}

        {gameId === 'game-mtg' ? (
          <label className="event-registration-option">
            <input
              type="checkbox"
              checked={registrationEnabled}
              onChange={(event) => setRegistrationEnabled(event.target.checked)}
            />
            <span>
              <strong>Activar inscripciones</strong>
              Gestiona plazas y lista de espera para este evento MTG.
            </span>
          </label>
        ) : null}

        {gameId === 'game-mtg' && registrationEnabled ? (
          <label className="event-registration-option event-registration-option--nested">
            <input
              type="checkbox"
              checked={waitlistEnabled}
              onChange={(event) => setWaitlistEnabled(event.target.checked)}
            />
            <span>
              <strong>Activar lista de espera</strong>
              Cuando se completen las plazas, conserva las siguientes
              solicitudes en orden de inscripción.
            </span>
          </label>
        ) : null}
      </div>

      <fieldset className="composer-tags">
        <legend>Etiquetas opcionales</legend>
        <p>Ayudan a los jugadores a identificar el formato y el público.</p>
        <div>
          {availableTags.map((tag) => (
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

      {saveError ? (
        <p className="event-composer__error" role="alert">
          {saveError}
        </p>
      ) : null}

      <div className="composer-actions">
        <button className="secondary-button" type="button" onClick={onClose}>
          Cancelar
        </button>
        <button className="primary-button" type="submit" disabled={isSaving}>
          {isSaving
            ? 'Guardando…'
            : eventToEdit
              ? 'Guardar cambios'
              : eventToDuplicate
                ? 'Crear copia'
                : 'Publicar evento'}
        </button>
      </div>
    </form>
  )
}

type EventDayGroup = {
  dateKey: string
  date: Date
  items: EventListItem[]
}

function groupEventsByDay(items: EventListItem[]): EventDayGroup[] {
  const groups = new Map<string, EventDayGroup>()

  for (const item of items) {
    const date = new Date(item.event.startsAt)
    const dateKey = new Intl.DateTimeFormat('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Europe/Madrid',
    }).format(date)
    const group = groups.get(dateKey)

    if (group) {
      group.items.push(item)
    } else {
      groups.set(dateKey, { dateKey, date, items: [item] })
    }
  }

  return [...groups.values()]
}

function EventTags({ item }: { item: EventListItem }) {
  return (
    <div className="event-tags" aria-label="Juego y formatos">
      {item.game ? (
        <span
          className="event-game"
          style={{ '--tag-color': item.game.color } as CSSProperties}
        >
          {item.game.shortName}
        </span>
      ) : null}
      <span className="event-type">{EVENT_TYPE_LABELS[item.event.type]}</span>
      {item.tags.map((tag) => (
        <span
          key={tag.id}
          style={{ '--tag-color': tag.color } as CSSProperties}
        >
          {tag.name}
        </span>
      ))}
      {item.event.listedInAgenda === false ? (
        <span className="event-type">No visible</span>
      ) : null}
    </div>
  )
}

function EventListCard({
  item,
  onSelect,
}: {
  item: EventListItem
  onSelect: (eventId: string) => void
}) {
  const startsAt = new Date(item.event.startsAt)
  const hasImage = Boolean(item.event.imageUri)

  return (
    <article
      className={`agenda-card${hasImage ? ' agenda-card--with-image' : ''}`}
    >
      {item.event.imageUri ? (
        <button
          className="agenda-card__poster"
          type="button"
          aria-label={`Ver el cartel de ${item.event.title}`}
          onClick={() => onSelect(item.event.id)}
        >
          <img
            src={item.event.imageUri}
            alt={`Cartel de ${item.event.title}`}
          />
        </button>
      ) : null}
      <div className="agenda-card__body">
        <div className="agenda-card__topline">
          <EventTags item={item} />
          {item.event.registrationEnabled && item.registration ? (
            <span className="agenda-registration">
              {registrationLabels[item.registration.status]}
            </span>
          ) : null}
        </div>

        <h3>{item.event.title}</h3>
        <p>{item.event.description}</p>

        <div className="agenda-card__meta">
          <span>
            <Clock3 aria-hidden="true" size={15} />
            {timeFormatter.format(startsAt)}
          </span>
          {item.event.registrationEnabled ? (
            <span>
              <UsersRound aria-hidden="true" size={15} />
              {item.event.registrationSummary.confirmed}/{item.event.capacity}
            </span>
          ) : null}
        </div>

        <button
          className="event-detail-link"
          type="button"
          onClick={() => onSelect(item.event.id)}
        >
          Ver detalles
          <ChevronRight aria-hidden="true" size={17} />
        </button>
      </div>
    </article>
  )
}

function EventDay({
  group,
  onSelect,
}: {
  group: EventDayGroup
  onSelect: (eventId: string) => void
}) {
  return (
    <section className="agenda-day">
      <header className="agenda-day__heading">
        <time dateTime={group.dateKey}>
          <CalendarDays aria-hidden="true" size={17} />
          {eventDateFormatter.format(group.date)}
        </time>
        <span>
          {group.items.length}{' '}
          {group.items.length === 1 ? 'actividad' : 'actividades'}
        </span>
      </header>
      <div className="agenda-day__events">
        {group.items.map((item) => (
          <EventListCard item={item} key={item.event.id} onSelect={onSelect} />
        ))}
      </div>
    </section>
  )
}

function compactDateParts(date: Date) {
  const parts = compactDateFormatter.formatToParts(date)

  return {
    day: parts.find(({ type }) => type === 'day')?.value ?? '',
    month: (parts.find(({ type }) => type === 'month')?.value ?? '')
      .replace('.', '')
      .toUpperCase(),
  }
}

function eventContextLabel(item: EventListItem) {
  return [
    ...new Set([
      item.game?.shortName,
      EVENT_TYPE_LABELS[item.event.type],
      ...item.tags.map(({ name }) => name),
    ]),
  ]
    .filter(Boolean)
    .join(' · ')
}

function compactEventStatus(item: EventListItem) {
  if (item.event.status === 'completed') {
    return 'Finalizado'
  }

  if (item.event.registrationEnabled && item.registration) {
    return compactRegistrationLabels[item.registration.status]
  }

  if (!item.event.registrationEnabled) {
    return '—'
  }

  return item.event.registrationSummary.confirmed >= item.event.capacity
    ? 'Completo'
    : 'Disponible'
}

function CompactEventList({
  items,
  label,
  onSelect,
}: {
  items: EventListItem[]
  label: string
  onSelect: (eventId: string) => void
}) {
  return (
    <div className="event-compact-table" aria-label={label} role="group">
      <div className="event-compact-table__header" aria-hidden="true">
        <span>Fecha</span>
        <span>Hora</span>
        <span>Evento</span>
        <span>Juego / formato</span>
        <span>Plazas</span>
        <span>Estado</span>
        <span aria-hidden="true" />
      </div>
      <div className="event-compact-table__body">
        {items.map((item) => {
          const startsAt = new Date(item.event.startsAt)
          const dateParts = compactDateParts(startsAt)
          const capacity = item.event.registrationEnabled
            ? `${item.event.registrationSummary.confirmed}/${item.event.capacity}`
            : '—'
          const status = compactEventStatus(item)

          return (
            <button
              className="event-compact-row"
              type="button"
              aria-label={`Ver ${item.event.title}, ${compactDateFormatter.format(startsAt)} a las ${timeFormatter.format(startsAt)}`}
              key={item.event.id}
              onClick={() => onSelect(item.event.id)}
            >
              <span className="event-compact-row__date">
                <strong>{dateParts.day}</strong>
                <small>{dateParts.month}</small>
              </span>
              <span className="event-compact-row__time">
                {timeFormatter.format(startsAt)}
              </span>
              <span className="event-compact-row__title">
                {item.event.title}
              </span>
              <span className="event-compact-row__context">
                {eventContextLabel(item)}
              </span>
              <span className="event-compact-row__capacity">{capacity}</span>
              <span
                className="event-compact-row__status"
                data-status={status === '—' ? 'none' : status.toLowerCase()}
              >
                {item.event.registrationEnabled ? (
                  <small className="event-compact-row__mobile-capacity">
                    {capacity}
                  </small>
                ) : null}
                {status}
              </span>
              <ChevronRight
                className="event-compact-row__arrow"
                aria-hidden="true"
                size={17}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function EventDetail({
  activeRole,
  item,
  communityName,
  memberId,
  onBack,
  onDataChange,
}: {
  activeRole: DemoRole
  item: EventListItem
  communityName: string
  memberId: string
  onBack: () => void
  onDataChange: (updater: DemoDataUpdater) => void
}) {
  const [actionMessage, setActionMessage] = useState('')
  const startsAt = new Date(item.event.startsAt)
  const endsAt = item.event.endsAt ? new Date(item.event.endsAt) : undefined
  const canRegister =
    item.event.registrationEnabled === true &&
    item.event.status !== 'completed' &&
    item.event.registrationSummary.confirmed < item.event.capacity
  const canJoinWaitlist =
    item.event.registrationEnabled === true &&
    item.event.status !== 'completed' &&
    item.event.registrationSummary.confirmed >= item.event.capacity &&
    item.event.waitlistEnabled !== false
  const isConfirmed = item.registration?.status === 'confirmed'
  const isWaitlisted = item.registration?.status === 'waitlisted'

  const handleRegistration = () => {
    if (isConfirmed) {
      onDataChange((currentData) =>
        cancelEventRegistration(currentData, item.event.id, memberId),
      )
      setActionMessage('Tu inscripción se ha cancelado.')
      return
    }

    if (isWaitlisted) {
      onDataChange((currentData) =>
        leaveEventWaitlist(currentData, item.event.id, memberId),
      )
      setActionMessage('Has salido de la lista de espera.')
      return
    }

    onDataChange((currentData) =>
      registerForEvent(currentData, item.event.id, memberId),
    )
    setActionMessage(
      canRegister
        ? 'Tu plaza está confirmada.'
        : 'Te has unido a la lista de espera.',
    )
  }

  return (
    <div className="page event-detail-page">
      <button className="back-button" type="button" onClick={onBack}>
        <ArrowLeft aria-hidden="true" size={18} />
        Volver a la agenda
      </button>

      <article className="event-detail">
        <EventTags item={item} />
        <h1>{item.event.title}</h1>
        <p className="event-detail__description">{item.event.description}</p>

        <dl className="event-detail__facts">
          <div>
            <dt>
              <CalendarDays aria-hidden="true" size={18} />
              Fecha
            </dt>
            <dd>{eventDateFormatter.format(startsAt)}</dd>
          </div>
          <div>
            <dt>
              <Clock3 aria-hidden="true" size={18} />
              Horario
            </dt>
            <dd>
              {endsAt
                ? `${timeFormatter.format(startsAt)}–${timeFormatter.format(endsAt)}`
                : `${timeFormatter.format(startsAt)} · hora de fin por confirmar`}
            </dd>
          </div>
          <div>
            <dt>
              <MapPin aria-hidden="true" size={18} />
              Lugar
            </dt>
            <dd>{communityName}</dd>
          </div>
          {item.event.registrationEnabled ? (
            <div>
              <dt>
                <UsersRound aria-hidden="true" size={18} />
                Plazas
              </dt>
              <dd>
                {item.event.registrationSummary.confirmed}/{item.event.capacity}{' '}
                confirmadas
              </dd>
            </div>
          ) : null}
        </dl>

        {item.event.registrationEnabled &&
        item.event.registrationSummary.waitlisted > 0 ? (
          <p className="event-waitlist-summary">
            {item.event.registrationSummary.waitlisted} personas en lista de
            espera
          </p>
        ) : null}

        {item.event.registrationEnabled &&
        item.registration &&
        activeRole !== 'gerente' ? (
          <p className="event-detail__registration">
            {registrationLabels[item.registration.status]}
          </p>
        ) : null}

        {item.event.registrationEnabled &&
        (canRegister || canJoinWaitlist || item.registration) &&
        activeRole !== 'gerente' ? (
          <button
            className="primary-button event-action"
            type="button"
            onClick={handleRegistration}
          >
            {isConfirmed
              ? 'Cancelar inscripción'
              : isWaitlisted
                ? 'Salir de la lista de espera'
                : canRegister
                  ? 'Inscribirme'
                  : 'Unirme a la lista de espera'}
          </button>
        ) : null}

        <p className="action-message" aria-live="polite">
          {actionMessage}
        </p>
      </article>
    </div>
  )
}

function EventParticipantManager({
  data,
  eventId,
  managerId,
  onDataChange,
}: {
  data: DemoDataSet
  eventId: string
  managerId: string
  onDataChange: (updater: DemoDataUpdater) => void
}) {
  const [memberIdToAdd, setMemberIdToAdd] = useState('')
  const participants = getEventParticipants(data, eventId)
  const event = data.events.find(({ id }) => id === eventId)
  const registered = participants.filter(
    ({ registration }) => registration.status !== 'waitlisted',
  )
  const waitlisted = participants.filter(
    ({ registration }) => registration.status === 'waitlisted',
  )
  const totalRegistrations = event
    ? event.registrationSummary.confirmed + event.registrationSummary.waitlisted
    : 0
  const registeredMemberIds = new Set(
    participants.map(({ member }) => member.id),
  )
  const availableMembers = data.members
    .filter(
      ({ id, status }) => status === 'approved' && !registeredMemberIds.has(id),
    )
    .sort((first, second) =>
      first.displayName.localeCompare(second.displayName, 'es'),
    )

  const addParticipant = (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault()

    if (!memberIdToAdd) {
      return
    }

    onDataChange((currentData) =>
      registerMemberForEventByManager(
        currentData,
        eventId,
        memberIdToAdd,
        managerId,
      ),
    )
    setMemberIdToAdd('')
  }

  const removeParticipant = (memberId: string) => {
    onDataChange((currentData) =>
      removeEventParticipant(currentData, eventId, memberId),
    )
  }

  const changeAttendance = (memberId: string, attended: boolean) => {
    onDataChange((currentData) =>
      setEventAttendance(currentData, eventId, memberId, attended),
    )
  }

  return (
    <section
      className="participant-manager"
      aria-labelledby="participants-title"
    >
      <div className="section-heading">
        <div>
          <span>Organización</span>
          <h2 id="participants-title">Participantes</h2>
        </div>
        <p>{totalRegistrations} inscripciones</p>
      </div>

      {participants.length < totalRegistrations ? (
        <p className="participant-demo-note">
          El prototipo muestra {participants.length} perfiles detallados de las{' '}
          {totalRegistrations} inscripciones simuladas.
        </p>
      ) : null}

      {event?.status !== 'completed' ? (
        <form className="participant-add" onSubmit={addParticipant}>
          <label className="form-field">
            <span>Añadir una inscripción</span>
            <select
              value={memberIdToAdd}
              onChange={(selectEvent) =>
                setMemberIdToAdd(selectEvent.target.value)
              }
            >
              <option value="">Seleccionar miembro</option>
              {availableMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </label>
          <button
            className="secondary-button"
            type="submit"
            disabled={!memberIdToAdd}
          >
            <Plus aria-hidden="true" size={16} />
            Añadir
          </button>
        </form>
      ) : null}

      <div className="participant-group">
        <div className="participant-group__heading">
          <strong>Plaza confirmada</strong>
          <span>{event?.registrationSummary.confirmed ?? 0}</span>
        </div>
        {registered.length > 0 ? (
          <div className="participant-list">
            {registered.map(({ member, registration }) => {
              const hasAttended = registration.status === 'attended'

              return (
                <article className="participant-row" key={registration.id}>
                  <span className="member-initials" aria-hidden="true">
                    {member.initials}
                  </span>
                  <div className="participant-row__identity">
                    <strong>{member.displayName}</strong>
                    <small>{hasAttended ? 'Presente' : 'Confirmada'}</small>
                  </div>
                  <div className="participant-row__actions">
                    <button
                      className="participant-row__icon-action"
                      type="button"
                      aria-label={
                        hasAttended
                          ? 'Anular asistencia'
                          : 'Registrar asistencia'
                      }
                      title={
                        hasAttended
                          ? 'Anular asistencia'
                          : 'Registrar asistencia'
                      }
                      onClick={() => changeAttendance(member.id, !hasAttended)}
                    >
                      {hasAttended ? (
                        <RotateCcw aria-hidden="true" size={14} />
                      ) : (
                        <CheckCircle2 aria-hidden="true" size={14} />
                      )}
                      <span className="participant-row__action-label">
                        {hasAttended
                          ? 'Anular asistencia'
                          : 'Registrar asistencia'}
                      </span>
                    </button>
                    <button
                      className="participant-remove participant-row__icon-action"
                      type="button"
                      aria-label="Liberar plaza"
                      title="Liberar plaza"
                      onClick={() => removeParticipant(member.id)}
                    >
                      <UserMinus aria-hidden="true" size={14} />
                      <span className="participant-row__action-label">
                        Liberar plaza
                      </span>
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="participant-empty">No hay perfiles detallados.</p>
        )}
      </div>

      <div className="participant-group">
        <div className="participant-group__heading">
          <strong>Lista de espera</strong>
          <span>{event?.registrationSummary.waitlisted ?? 0}</span>
        </div>
        {waitlisted.length > 0 ? (
          <div className="participant-list">
            {waitlisted.map(({ member, registration, waitlistPosition }) => (
              <article className="participant-row" key={registration.id}>
                <span className="waitlist-position" aria-hidden="true">
                  {waitlistPosition}
                </span>
                <div className="participant-row__identity">
                  <strong>{member.displayName}</strong>
                  <small>En espera</small>
                </div>
                <div className="participant-row__actions">
                  <button
                    className="participant-remove participant-row__icon-action"
                    type="button"
                    aria-label="Quitar de la lista"
                    title="Quitar de la lista"
                    onClick={() => removeParticipant(member.id)}
                  >
                    <UserMinus aria-hidden="true" size={14} />
                    <span className="participant-row__action-label">
                      Quitar de la lista
                    </span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="participant-empty">No hay nadie en espera.</p>
        )}
      </div>

      <div
        className="participant-actions-legend"
        role="note"
        aria-label="Leyenda de acciones"
      >
        <span>
          <CheckCircle2 aria-hidden="true" size={14} />
          Registrar asistencia
        </span>
        <span>
          <RotateCcw aria-hidden="true" size={14} />
          Anular asistencia
        </span>
        <span>
          <UserMinus aria-hidden="true" size={14} />
          Retirar inscripción
        </span>
      </div>
    </section>
  )
}

function ManagerEventRow({
  item,
  isDeletePending,
  onDelete,
  onDeleteCancel,
  onDeleteRequest,
  onDuplicate,
  onEdit,
  onImport,
  onParticipants,
}: {
  item: EventListItem
  isDeletePending: boolean
  onDelete: (eventId: string) => void
  onDeleteCancel: () => void
  onDeleteRequest: (eventId: string) => void
  onDuplicate: (eventId: string) => void
  onEdit: (eventId: string) => void
  onImport: (eventId: string) => void
  onParticipants: (eventId: string) => void
}) {
  const startsAt = new Date(item.event.startsAt)
  const registrationCount =
    item.event.registrationSummary.confirmed +
    item.event.registrationSummary.waitlisted

  return (
    <article className="manager-event-item">
      <div className="manager-event-item__date" aria-hidden="true">
        <strong>{startsAt.getDate()}</strong>
        <span>
          {new Intl.DateTimeFormat('es-ES', {
            month: 'short',
            timeZone: 'Europe/Madrid',
          }).format(startsAt)}
        </span>
      </div>
      <div className="manager-event-item__content">
        <div>
          <EventTags item={item} />
          <h3>{item.event.title}</h3>
        </div>
        <p>
          {timeFormatter.format(startsAt)}
          {item.event.registrationEnabled
            ? ` · ${item.event.registrationSummary.confirmed}/${item.event.capacity} confirmadas${
                item.event.registrationSummary.waitlisted > 0
                  ? ` · ${item.event.registrationSummary.waitlisted} en espera`
                  : ''
              }`
            : ''}
        </p>
      </div>
      <div className="manager-event-item__actions">
        {item.event.registrationEnabled ? (
          <button type="button" onClick={() => onParticipants(item.event.id)}>
            <ListChecks aria-hidden="true" size={16} />
            Inscripciones <span>{registrationCount}</span>
          </button>
        ) : null}
        {item.event.gameId === 'game-mtg' ? (
          <button
            className="manager-event-item__icon-action"
            type="button"
            aria-label={`Importar resultados de ${item.event.title}`}
            title="Importar resultados"
            onClick={() => onImport(item.event.id)}
          >
            <FileUp aria-hidden="true" size={16} />
            <span className="manager-event-item__action-label">Resultados</span>
          </button>
        ) : null}
        <button
          className="manager-event-item__icon-action"
          type="button"
          aria-label={`Duplicar ${item.event.title}`}
          title="Duplicar"
          onClick={() => onDuplicate(item.event.id)}
        >
          <Copy aria-hidden="true" size={16} />
          <span className="manager-event-item__action-label">Duplicar</span>
        </button>
        <button
          className="manager-event-item__icon-action"
          type="button"
          aria-label={`Modificar ${item.event.title}`}
          title="Modificar"
          onClick={() => onEdit(item.event.id)}
        >
          <Edit3 aria-hidden="true" size={16} />
          <span className="manager-event-item__action-label">Modificar</span>
        </button>
        {isDeletePending ? (
          <div className="manager-event-item__delete-confirmation">
            <button type="button" onClick={() => onDelete(item.event.id)}>
              Confirmar
            </button>
            <button type="button" onClick={onDeleteCancel}>
              Cancelar
            </button>
          </div>
        ) : (
          <button
            className="manager-event-item__delete manager-event-item__icon-action"
            type="button"
            aria-label={`Eliminar ${item.event.title}`}
            title="Eliminar"
            onClick={() => onDeleteRequest(item.event.id)}
          >
            <Trash2 aria-hidden="true" size={16} />
            <span className="manager-event-item__action-label">Eliminar</span>
          </button>
        )}
      </div>
    </article>
  )
}

function EventsPageHeading() {
  return (
    <header className="page-heading">
      <span className="page-eyebrow">Agenda de la comunidad</span>
      <h1>Eventos</h1>
      <p>
        Consulta las próximas citas, las plazas disponibles y el estado de tu
        inscripción.
      </p>
    </header>
  )
}

export function EventsPage({
  activeRole,
  data,
  currentMember,
  publishingMember,
  eventPersistenceStatus,
  onDataChange,
  onCreateEvent,
  onDeleteEvent,
  onNavigate,
  onReloadEvents,
  onUpdateEvent,
  initialManagerAction,
}: EventsPageProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>()
  const [selectedGameId, setSelectedGameId] = useState<string>()
  const [selectedType, setSelectedType] = useState<EventType>()
  const [eventViewMode, setEventViewMode] = useState<EventViewMode>(
    getInitialEventViewMode,
  )
  const [isComposerOpen, setIsComposerOpen] = useState(
    activeRole === 'gerente' && initialManagerAction === 'new',
  )
  const [editingEventId, setEditingEventId] = useState<string>()
  const [duplicatingEventId, setDuplicatingEventId] = useState<string>()
  const [managedParticipantEventId, setManagedParticipantEventId] =
    useState<string>()
  const [managedImportEventId, setManagedImportEventId] = useState<string>()
  const [pendingDeleteEventId, setPendingDeleteEventId] = useState<string>()
  const [publicationMessage, setPublicationMessage] = useState('')
  const [operationError, setOperationError] = useState('')
  const [importedStandingId, setImportedStandingId] = useState<string>()
  const participantPanelRef = useRef<HTMLDivElement>(null)
  const importPanelRef = useRef<HTMLDivElement>(null)
  const completeAgenda = getEventAgenda(data, currentMember.id)
  const agenda = filterEventAgenda(completeAgenda, {
    gameId: selectedGameId,
    type: selectedType,
  })
  const upcomingDays = groupEventsByDay(agenda.upcoming)
  const pastDays = groupEventsByDay(agenda.past)
  const selectedEvent = selectedEventId
    ? getEventById(data, currentMember.id, selectedEventId)
    : undefined
  const editingEvent = editingEventId
    ? data.events.find(({ id }) => id === editingEventId)
    : undefined
  const duplicatingEvent = duplicatingEventId
    ? data.events.find(({ id }) => id === duplicatingEventId)
    : undefined
  const managedParticipantEvent = managedParticipantEventId
    ? getEventById(data, currentMember.id, managedParticipantEventId)
    : undefined
  const managedImportEvent = managedImportEventId
    ? getEventById(data, currentMember.id, managedImportEventId)
    : undefined
  const hiddenManagerEvents = data.events.flatMap((event) => {
    if (event.listedInAgenda !== false || event.status === 'completed') {
      return []
    }

    const item = getEventById(data, currentMember.id, event.id)
    return item ? [item] : []
  })
  const managerEvents = [
    ...hiddenManagerEvents,
    ...completeAgenda.upcoming,
    ...completeAgenda.past.slice(0, 8),
  ]

  useEffect(() => {
    try {
      window.localStorage.setItem(eventViewStorageKey, eventViewMode)
    } catch {
      // The selected view remains available for the current session.
    }
  }, [eventViewMode])

  useEffect(() => {
    if (!managedParticipantEventId || !participantPanelRef.current) {
      return
    }

    participantPanelRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, [managedParticipantEventId])

  useEffect(() => {
    if (!managedImportEventId || !importPanelRef.current) {
      return
    }

    importPanelRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, [managedImportEventId])

  const closeManagerPanels = () => {
    setIsComposerOpen(false)
    setEditingEventId(undefined)
    setDuplicatingEventId(undefined)
    setManagedParticipantEventId(undefined)
    setManagedImportEventId(undefined)
    setPendingDeleteEventId(undefined)
  }

  const deleteEvent = async (eventId: string) => {
    const eventTitle = data.events.find(({ id }) => id === eventId)?.title
    setOperationError('')

    try {
      await onDeleteEvent(eventId)
      closeManagerPanels()
      setImportedStandingId(undefined)
      setPublicationMessage(
        eventTitle ? `« ${eventTitle} » se ha eliminado.` : 'Evento eliminado.',
      )
    } catch {
      setPendingDeleteEventId(undefined)
      setOperationError(
        'No se ha podido eliminar el evento. Inténtalo de nuevo.',
      )
    }
  }

  if (
    eventPersistenceStatus === 'idle' ||
    eventPersistenceStatus === 'loading'
  ) {
    return (
      <div className="page">
        <EventsPageHeading />
        <section className="event-data-state" aria-live="polite">
          <CalendarDays aria-hidden="true" size={24} />
          <h2>Cargando la agenda…</h2>
          <p>Estamos consultando los eventos de la comunidad.</p>
        </section>
      </div>
    )
  }

  if (eventPersistenceStatus === 'error') {
    return (
      <div className="page">
        <EventsPageHeading />
        <section className="event-data-state" role="alert">
          <RotateCcw aria-hidden="true" size={24} />
          <h2>No se ha podido cargar la agenda</h2>
          <p>Comprueba tu conexión y vuelve a intentarlo.</p>
          <button
            className="primary-button"
            type="button"
            onClick={onReloadEvents}
          >
            Reintentar
          </button>
        </section>
      </div>
    )
  }

  if (selectedEvent) {
    return (
      <EventDetail
        activeRole={activeRole}
        item={selectedEvent}
        communityName={data.community.name}
        memberId={currentMember.id}
        onBack={() => setSelectedEventId(undefined)}
        onDataChange={onDataChange}
      />
    )
  }

  return (
    <div className="page">
      <EventsPageHeading />

      <p className="event-local-registration-note" role="note">
        En esta etapa, la agenda se guarda en la comunidad. Las inscripciones
        siguen siendo una simulación local en este navegador.
      </p>

      {activeRole === 'gerente' ? (
        <section
          className="manager-event-tools"
          aria-labelledby="manager-events-title"
        >
          <div className="manager-event-tools__heading">
            <div>
              <span>Herramientas del gerente</span>
              <h2 id="manager-events-title">Gestión de eventos</h2>
            </div>
            {!isComposerOpen && !editingEventId ? (
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  closeManagerPanels()
                  setPublicationMessage('')
                  setImportedStandingId(undefined)
                  setIsComposerOpen(true)
                }}
              >
                <Plus aria-hidden="true" size={17} />
                Nuevo evento
              </button>
            ) : null}
          </div>
          {isComposerOpen ? (
            <EventComposer
              data={data}
              eventToDuplicate={duplicatingEvent}
              eventToEdit={editingEvent}
              onClose={closeManagerPanels}
              onSave={(input) =>
                editingEvent
                  ? onUpdateEvent(editingEvent.id, input)
                  : onCreateEvent(input)
              }
              onPublished={() => {
                closeManagerPanels()
                setImportedStandingId(undefined)
                setSelectedGameId(undefined)
                setSelectedType(undefined)
                setPublicationMessage(
                  editingEvent
                    ? 'Los cambios se han guardado.'
                    : duplicatingEvent
                      ? 'La copia ya aparece en la agenda.'
                      : 'El evento ya aparece en la agenda.',
                )
              }}
            />
          ) : (
            <div className="manager-event-list">
              {managerEvents.map((item) => (
                <ManagerEventRow
                  item={item}
                  isDeletePending={pendingDeleteEventId === item.event.id}
                  key={item.event.id}
                  onDelete={deleteEvent}
                  onDeleteCancel={() => setPendingDeleteEventId(undefined)}
                  onDeleteRequest={setPendingDeleteEventId}
                  onDuplicate={(eventId) => {
                    closeManagerPanels()
                    setPublicationMessage('')
                    setImportedStandingId(undefined)
                    setDuplicatingEventId(eventId)
                    setIsComposerOpen(true)
                  }}
                  onEdit={(eventId) => {
                    closeManagerPanels()
                    setEditingEventId(eventId)
                    setIsComposerOpen(true)
                  }}
                  onImport={(eventId) => {
                    closeManagerPanels()
                    setPublicationMessage('')
                    setImportedStandingId(undefined)
                    setManagedImportEventId(eventId)
                  }}
                  onParticipants={(eventId) => {
                    setManagedImportEventId(undefined)
                    setManagedParticipantEventId((currentEventId) =>
                      currentEventId === eventId ? undefined : eventId,
                    )
                    setPendingDeleteEventId(undefined)
                  }}
                />
              ))}
            </div>
          )}
          <div
            className="manager-event-actions-legend"
            role="note"
            aria-label="Leyenda de acciones de eventos"
          >
            <span>
              <FileUp aria-hidden="true" size={14} /> Importar resultados
            </span>
            <span>
              <Copy aria-hidden="true" size={14} /> Duplicar
            </span>
            <span>
              <Edit3 aria-hidden="true" size={14} /> Modificar
            </span>
            <span>
              <Trash2 aria-hidden="true" size={14} /> Eliminar
            </span>
          </div>
          {publicationMessage ? (
            <div className="manager-event-feedback" aria-live="polite">
              <p className="action-message">{publicationMessage}</p>
              {importedStandingId ? (
                <button
                  type="button"
                  onClick={() =>
                    onNavigate(
                      'ranking',
                      `view=events&standing=${encodeURIComponent(importedStandingId)}`,
                    )
                  }
                >
                  Ver clasificación
                  <ChevronRight aria-hidden="true" size={16} />
                </button>
              ) : null}
            </div>
          ) : null}
          {operationError ? (
            <p className="event-operation-error" role="alert">
              {operationError}
            </p>
          ) : null}
          {managedParticipantEvent ? (
            <div
              className="manager-participant-panel"
              ref={participantPanelRef}
            >
              <button
                className="manager-participant-panel__close"
                type="button"
                onClick={() => setManagedParticipantEventId(undefined)}
              >
                <X aria-hidden="true" size={16} />
                Cerrar
              </button>
              <h3>{managedParticipantEvent.event.title}</h3>
              <EventParticipantManager
                data={data}
                eventId={managedParticipantEvent.event.id}
                managerId={publishingMember.id}
                onDataChange={onDataChange}
              />
            </div>
          ) : null}
          {managedImportEvent ? (
            <div className="manager-import-panel" ref={importPanelRef}>
              <EventLinkImportPanel
                data={data}
                event={managedImportEvent.event}
                manager={publishingMember}
                onClose={() => setManagedImportEventId(undefined)}
                onDataChange={onDataChange}
                onImported={(message, standingId) => {
                  setManagedImportEventId(undefined)
                  setPublicationMessage(message)
                  setImportedStandingId(standingId)
                }}
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {activeRole !== 'gerente' ? (
        <>
          <section
            className="event-filter-panel"
            aria-labelledby="event-filters"
          >
            <div className="section-heading">
              <div>
                <span>Personaliza la agenda</span>
                <h2 id="event-filters">Filtrar eventos</h2>
              </div>
              {selectedGameId || selectedType ? (
                <button
                  className="filter-reset"
                  type="button"
                  onClick={() => {
                    setSelectedGameId(undefined)
                    setSelectedType(undefined)
                  }}
                >
                  Restablecer
                </button>
              ) : null}
            </div>

            <div className="event-filter-select-grid">
              <label>
                <span>Juego</span>
                <select
                  aria-label="Filtrar por juego"
                  value={selectedGameId ?? ''}
                  onChange={(event) =>
                    setSelectedGameId(event.currentTarget.value || undefined)
                  }
                >
                  <option value="">Todos</option>
                  {data.games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.shortName}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Actividad</span>
                <select
                  aria-label="Filtrar por actividad"
                  value={selectedType ?? ''}
                  onChange={(event) =>
                    setSelectedType(
                      (event.currentTarget.value || undefined) as
                        EventType | undefined,
                    )
                  }
                >
                  <option value="">Todas</option>
                  {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map(
                    (type) => (
                      <option key={type} value={type}>
                        {EVENT_TYPE_LABELS[type]}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>

            <div className="event-filter-chip-groups">
              <div className="event-filter-group">
                <strong>Juego</strong>
                <div
                  className="event-filter-chips"
                  aria-label="Filtrar por juego"
                >
                  <button
                    type="button"
                    aria-pressed={!selectedGameId}
                    onClick={() => setSelectedGameId(undefined)}
                  >
                    Todos
                  </button>
                  {data.games.map((game) => (
                    <button
                      type="button"
                      key={game.id}
                      aria-pressed={selectedGameId === game.id}
                      onClick={() => setSelectedGameId(game.id)}
                    >
                      {game.shortName}
                    </button>
                  ))}
                </div>
              </div>

              <div className="event-filter-group">
                <strong>Actividad</strong>
                <div
                  className="event-filter-chips"
                  aria-label="Filtrar por actividad"
                >
                  <button
                    type="button"
                    aria-pressed={!selectedType}
                    onClick={() => setSelectedType(undefined)}
                  >
                    Todas
                  </button>
                  {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map(
                    (type) => (
                      <button
                        type="button"
                        key={type}
                        aria-pressed={selectedType === type}
                        onClick={() => setSelectedType(type)}
                      >
                        {EVENT_TYPE_LABELS[type]}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="agenda-section" aria-labelledby="upcoming-events">
            <div className="section-heading">
              <div>
                <span>Agenda</span>
                <h2 id="upcoming-events">Próximos eventos</h2>
              </div>
              <div className="agenda-section__actions">
                <p>{agenda.upcoming.length} programados</p>
                <div
                  className="event-view-toggle"
                  role="group"
                  aria-label="Vista de eventos"
                >
                  <button
                    type="button"
                    aria-pressed={eventViewMode === 'agenda'}
                    onClick={() => setEventViewMode('agenda')}
                  >
                    <CalendarDays aria-hidden="true" size={16} />
                    Agenda
                  </button>
                  <button
                    type="button"
                    aria-pressed={eventViewMode === 'list'}
                    onClick={() => setEventViewMode('list')}
                  >
                    <Rows3 aria-hidden="true" size={16} />
                    Lista
                  </button>
                </div>
              </div>
            </div>

            {agenda.upcoming.length > 0 && eventViewMode === 'list' ? (
              <CompactEventList
                items={agenda.upcoming}
                label="Próximos eventos en vista de lista"
                onSelect={setSelectedEventId}
              />
            ) : upcomingDays.length > 0 ? (
              <div className="agenda-list">
                {upcomingDays.map((group) => (
                  <EventDay
                    group={group}
                    key={group.dateKey}
                    onSelect={setSelectedEventId}
                  />
                ))}
              </div>
            ) : (
              <p className="filtered-empty-state">
                No hay próximos eventos para estos filtros.
              </p>
            )}
          </section>

          <section className="agenda-section" aria-labelledby="past-events">
            <div className="section-heading">
              <div>
                <span>Historial</span>
                <h2 id="past-events">Eventos pasados</h2>
              </div>
            </div>

            {agenda.past.length > 0 && eventViewMode === 'list' ? (
              <CompactEventList
                items={agenda.past}
                label="Eventos pasados en vista de lista"
                onSelect={setSelectedEventId}
              />
            ) : pastDays.length > 0 ? (
              <div className="agenda-list agenda-list--past">
                {pastDays.map((group) => (
                  <EventDay
                    group={group}
                    key={group.dateKey}
                    onSelect={setSelectedEventId}
                  />
                ))}
              </div>
            ) : (
              <p className="filtered-empty-state">
                No hay eventos pasados para estos filtros.
              </p>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
