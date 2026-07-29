import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock3,
  MapPin,
  UsersRound,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { useState } from 'react'

import {
  cancelEventRegistration,
  leaveEventWaitlist,
  registerForEvent,
} from '../data/eventMutations'
import {
  filterEventAgenda,
  getEventAgenda,
  getEventById,
  type EventListItem,
} from '../data/eventSelectors'
import type { DemoDataUpdater } from '../data/demoRepository'
import type { CommunityMember, DemoDataSet, EventType } from '../domain/types'

type EventsPageProps = {
  data: DemoDataSet
  currentMember: CommunityMember
  onDataChange: (updater: DemoDataUpdater) => void
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
          {item.registration ? (
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
          <span>
            <UsersRound aria-hidden="true" size={15} />
            {item.event.registrationSummary.confirmed}/{item.event.capacity}
          </span>
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
  item,
  communityName,
  memberId,
  onBack,
  onDataChange,
}: {
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
        </dl>

        {item.event.registrationSummary.waitlisted > 0 ? (
          <p className="event-waitlist-summary">
            {item.event.registrationSummary.waitlisted} personas en lista de
            espera
          </p>
        ) : null}

        {item.registration ? (
          <p className="event-detail__registration">
            {registrationLabels[item.registration.status]}
          </p>
        ) : null}

        {item.event.status !== 'completed' ? (
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

export function EventsPage({
  data,
  currentMember,
  onDataChange,
}: EventsPageProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>()
  const [selectedGameId, setSelectedGameId] = useState<string>()
  const [selectedType, setSelectedType] = useState<EventType>()
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

  if (selectedEvent) {
    return (
      <EventDetail
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

      <section className="event-filter-panel" aria-labelledby="event-filters">
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
          <div className="event-filter-chips" aria-label="Filtrar por juego">
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
    </div>
  )
}
