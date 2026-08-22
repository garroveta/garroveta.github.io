import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Edit3,
  FileUp,
  ListChecks,
  MapPin,
  Plus,
  RotateCcw,
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
import { EventLinkImportPanel } from '../components/EventLinkImportPanel'
import {
  cancelEventRegistration,
  deleteCommunityEvent,
  leaveEventWaitlist,
  publishCommunityEvent,
  registerForEvent,
  registerMemberForEventByManager,
  removeEventParticipant,
  setEventAttendance,
  updateCommunityEvent,
} from '../data/eventMutations'
import {
  filterEventAgenda,
  getEventAgenda,
  getEventById,
  getEventParticipants,
  type EventListItem,
} from '../data/eventSelectors'
import type { DemoDataUpdater } from '../data/demoRepository'
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
  onDataChange: (updater: DemoDataUpdater) => void
  onNavigate: (route: AppRoute, query?: string) => void
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

const registrationLabels = {
  confirmed: 'Inscripción confirmada',
  waitlisted: 'En lista de espera',
  attended: 'Asistencia registrada',
  cancelled: 'Inscripción cancelada',
}

const eventTypeLabels = {
  tournament: 'Torneo',
  league: 'Liga',
  draft: 'Draft',
  casual: 'Juego libre',
  workshop: 'Taller',
  launch: 'Presentación',
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
  const nextDate = new Date(`${date}T12:00:00Z`)
  nextDate.setUTCDate(nextDate.getUTCDate() + 1)
  return nextDate.toISOString().slice(0, 10)
}

function EventComposer({
  data,
  eventToEdit,
  publishingMember,
  onClose,
  onDataChange,
  onPublished,
}: {
  data: DemoDataSet
  eventToEdit?: CommunityEvent
  publishingMember: CommunityMember
  onClose: () => void
  onDataChange: (updater: DemoDataUpdater) => void
  onPublished: () => void
}) {
  const [gameId, setGameId] = useState(
    eventToEdit?.gameId ?? data.games[0]?.id ?? '',
  )
  const initialGameId = eventToEdit?.gameId ?? data.games[0]?.id ?? ''
  const [formatId, setFormatId] = useState(
    eventToEdit
      ? (eventToEdit.formatId ?? '')
      : (data.competitionFormats.find(({ gameId }) => gameId === initialGameId)
          ?.id ?? ''),
  )
  const [competitionEventKindId, setCompetitionEventKindId] = useState(
    eventToEdit
      ? (eventToEdit.competitionEventKindId ?? '')
      : (data.competitionEventKinds[0]?.id ?? ''),
  )
  const [type, setType] = useState<EventType>(eventToEdit?.type ?? 'tournament')
  const [title, setTitle] = useState(eventToEdit?.title ?? '')
  const [description, setDescription] = useState(eventToEdit?.description ?? '')
  const [date, setDate] = useState(
    eventToEdit ? madridDatePart(eventToEdit.startsAt) : '2026-08-15',
  )
  const [startsAt, setStartsAt] = useState(
    eventToEdit ? madridTimePart(eventToEdit.startsAt) : '17:00',
  )
  const [endsAt, setEndsAt] = useState(
    eventToEdit ? madridTimePart(eventToEdit.endsAt) : '21:00',
  )
  const [capacity, setCapacity] = useState(String(eventToEdit?.capacity ?? 24))
  const [registrationEnabled, setRegistrationEnabled] = useState(
    eventToEdit?.registrationEnabled ?? false,
  )
  const [tagIds, setTagIds] = useState<string[]>(eventToEdit?.tagIds ?? [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const endDate = endsAt <= startsAt ? nextCalendarDate(date) : date

    onDataChange((currentData) => {
      const input = {
        createdByMemberId: publishingMember.id,
        gameId,
        formatId: gameId === 'game-mtg' ? formatId : undefined,
        competitionEventKindId:
          gameId === 'game-mtg' ? competitionEventKindId : undefined,
        type,
        title,
        description,
        startsAt: buildMadridIso(date, startsAt),
        endsAt: buildMadridIso(endDate, endsAt),
        registrationEnabled,
        capacity: Number(capacity),
        tagIds,
      }

      return eventToEdit
        ? updateCommunityEvent(currentData, {
            ...input,
            eventId: eventToEdit.id,
          })
        : publishCommunityEvent(currentData, input)
    })
    onPublished()
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
          <h2>{eventToEdit ? 'Modificar evento' : 'Crear un evento'}</h2>
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
                  ({ gameId: formatGameId }) => formatGameId === nextGameId,
                )?.id ?? '',
              )
              if (nextGameId !== 'game-mtg') {
                setRegistrationEnabled(false)
              }
            }}
            required
          >
            {data.games.map((game) => (
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
            onChange={(event) => setType(event.target.value as EventType)}
          >
            {(Object.keys(eventTypeLabels) as EventType[]).map((eventType) => (
              <option key={eventType} value={eventType}>
                {eventTypeLabels[eventType]}
              </option>
            ))}
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
              {data.competitionFormats
                .filter(({ gameId: formatGameId }) => formatGameId === gameId)
                .map((format) => (
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
              {data.competitionEventKinds.map((eventKind) => (
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

      <fieldset className="composer-tags">
        <legend>Etiquetas opcionales</legend>
        <p>Ayudan a los jugadores a identificar el formato y el público.</p>
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

      <div className="composer-actions">
        <button className="secondary-button" type="button" onClick={onClose}>
          Cancelar
        </button>
        <button className="primary-button" type="submit">
          {eventToEdit ? 'Guardar cambios' : 'Publicar evento'}
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
      <span className="event-type">{eventTypeLabels[item.event.type]}</span>
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

function EventListCard({
  item,
  onSelect,
}: {
  item: EventListItem
  onSelect: (eventId: string) => void
}) {
  const startsAt = new Date(item.event.startsAt)

  return (
    <article className="agenda-card">
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
  const endsAt = new Date(item.event.endsAt)
  const canRegister =
    item.event.registrationEnabled === true &&
    item.event.status !== 'completed' &&
    item.event.registrationSummary.confirmed < item.event.capacity
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
              {timeFormatter.format(startsAt)}–{timeFormatter.format(endsAt)}
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
        item.event.status !== 'completed' &&
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
  onEdit,
  onImport,
  onParticipants,
}: {
  item: EventListItem
  isDeletePending: boolean
  onDelete: (eventId: string) => void
  onDeleteCancel: () => void
  onDeleteRequest: (eventId: string) => void
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

export function EventsPage({
  activeRole,
  data,
  currentMember,
  publishingMember,
  onDataChange,
  onNavigate,
}: EventsPageProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>()
  const [selectedGameId, setSelectedGameId] = useState<string>()
  const [selectedType, setSelectedType] = useState<EventType>()
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string>()
  const [managedParticipantEventId, setManagedParticipantEventId] =
    useState<string>()
  const [managedImportEventId, setManagedImportEventId] = useState<string>()
  const [pendingDeleteEventId, setPendingDeleteEventId] = useState<string>()
  const [publicationMessage, setPublicationMessage] = useState('')
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
  const managedParticipantEvent = managedParticipantEventId
    ? getEventById(data, currentMember.id, managedParticipantEventId)
    : undefined
  const managedImportEvent = managedImportEventId
    ? getEventById(data, currentMember.id, managedImportEventId)
    : undefined
  const managerEvents = [
    ...completeAgenda.upcoming,
    ...completeAgenda.past.slice(0, 8),
  ]

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
    setManagedParticipantEventId(undefined)
    setManagedImportEventId(undefined)
    setPendingDeleteEventId(undefined)
  }

  const deleteEvent = (eventId: string) => {
    const eventTitle = data.events.find(({ id }) => id === eventId)?.title
    onDataChange((currentData) =>
      deleteCommunityEvent(currentData, eventId, publishingMember.id),
    )
    closeManagerPanels()
    setImportedStandingId(undefined)
    setPublicationMessage(
      eventTitle ? `« ${eventTitle} » se ha eliminado.` : 'Evento eliminado.',
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
      <header className="page-heading">
        <span className="page-eyebrow">Agenda de la comunidad</span>
        <h1>Eventos</h1>
        <p>
          Consulta las próximas citas, las plazas disponibles y el estado de tu
          inscripción.
        </p>
      </header>

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
              eventToEdit={editingEvent}
              publishingMember={publishingMember}
              onClose={closeManagerPanels}
              onDataChange={onDataChange}
              onPublished={() => {
                closeManagerPanels()
                setImportedStandingId(undefined)
                setSelectedGameId(undefined)
                setSelectedType(undefined)
                setPublicationMessage(
                  editingEvent
                    ? 'Los cambios se han guardado.'
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
                {(Object.keys(eventTypeLabels) as EventType[]).map((type) => (
                  <button
                    type="button"
                    key={type}
                    aria-pressed={selectedType === type}
                    onClick={() => setSelectedType(type)}
                  >
                    {eventTypeLabels[type]}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="agenda-section" aria-labelledby="upcoming-events">
            <div className="section-heading">
              <div>
                <span>Agenda</span>
                <h2 id="upcoming-events">Próximos eventos</h2>
              </div>
              <p>{agenda.upcoming.length} programados</p>
            </div>

            {upcomingDays.length > 0 ? (
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

            {pastDays.length > 0 ? (
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
