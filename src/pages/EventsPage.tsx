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
  getEventAgenda,
  getEventById,
  type EventListItem,
} from '../data/eventSelectors'
import type { DemoDataUpdater } from '../data/demoRepository'
import type { CommunityMember, DemoDataSet } from '../domain/types'

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

const eventShortDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
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

function EventTags({ item }: { item: EventListItem }) {
  return (
    <div className="event-tags" aria-label="Juego y formatos">
      <span
        className="event-game"
        style={{ '--tag-color': item.game.color } as CSSProperties}
      >
        {item.game.shortName}
      </span>
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
      <time className="agenda-card__date" dateTime={item.event.startsAt}>
        <CalendarDays aria-hidden="true" size={17} />
        {eventShortDateFormatter.format(startsAt)}
      </time>

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
  const agenda = getEventAgenda(data, currentMember.id)
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

      <section className="agenda-section" aria-labelledby="upcoming-events">
        <div className="section-heading">
          <div>
            <span>Agenda</span>
            <h2 id="upcoming-events">Próximos eventos</h2>
          </div>
          <p>{agenda.upcoming.length} programados</p>
        </div>

        <div className="agenda-list">
          {agenda.upcoming.map((item) => (
            <EventListCard
              item={item}
              key={item.event.id}
              onSelect={setSelectedEventId}
            />
          ))}
        </div>
      </section>

      <section className="agenda-section" aria-labelledby="past-events">
        <div className="section-heading">
          <div>
            <span>Historial</span>
            <h2 id="past-events">Eventos pasados</h2>
          </div>
        </div>

        <div className="agenda-list agenda-list--past">
          {agenda.past.map((item) => (
            <EventListCard
              item={item}
              key={item.event.id}
              onSelect={setSelectedEventId}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
