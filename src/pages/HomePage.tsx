import {
  ArrowRight,
  ArrowLeftRight,
  BellRing,
  Clock3,
  MapPin,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import type { ReactNode } from 'react'

import type { AppRoute } from '../app/navigation'
import {
  getPlayerDashboard,
  type DashboardEvent,
} from '../data/dashboardSelectors'
import type { CommunityMember, DemoDataSet } from '../domain/types'

type HomePageProps = {
  data: DemoDataSet
  currentMember: CommunityMember
  onNavigate: (route: AppRoute) => void
}

const eventDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Europe/Madrid',
})

const weekdayFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'short',
  timeZone: 'Europe/Madrid',
})

const timeFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Madrid',
})

const newsDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Madrid',
})

const registrationLabels = {
  confirmed: 'Inscripción confirmada',
  waitlisted: 'En lista de espera',
  attended: 'Asistencia registrada',
  cancelled: 'Inscripción cancelada',
}

function DashboardLink({
  children,
  route,
  onNavigate,
}: {
  children: ReactNode
  route: AppRoute
  onNavigate: (route: AppRoute) => void
}) {
  return (
    <a
      className="dashboard-link"
      href={`#${route}`}
      onClick={(event) => {
        event.preventDefault()
        onNavigate(route)
      }}
    >
      {children}
      <ArrowRight aria-hidden="true" size={17} />
    </a>
  )
}

function NextEventCard({
  dashboardEvent,
  onNavigate,
}: {
  dashboardEvent?: DashboardEvent
  onNavigate: (route: AppRoute) => void
}) {
  if (!dashboardEvent) {
    return (
      <section className="dashboard-card event-card">
        <span className="dashboard-label">Próximo evento</span>
        <h2>No hay eventos programados.</h2>
        <DashboardLink route="eventos" onNavigate={onNavigate}>
          Consultar agenda
        </DashboardLink>
      </section>
    )
  }

  const { event, registration } = dashboardEvent
  const eventDate = new Date(event.startsAt)
  const registrationLabel = registration
    ? registrationLabels[registration.status]
    : 'Inscripción disponible'

  return (
    <section
      className="dashboard-card event-card"
      aria-labelledby="event-title"
    >
      <div className="dashboard-card__topline">
        <span className="dashboard-label">Próximo evento</span>
        <span className="event-registration">{registrationLabel}</span>
      </div>

      <div className="event-card__body">
        <time className="event-date" dateTime={event.startsAt}>
          <span>{weekdayFormatter.format(eventDate)}</span>
          <strong>{eventDateFormatter.format(eventDate)}</strong>
        </time>

        <div className="event-card__content">
          <h2 id="event-title">{event.title}</h2>
          <p>{event.description}</p>
          <div className="event-meta">
            <span>
              <Clock3 aria-hidden="true" size={15} />
              {timeFormatter.format(eventDate)}
            </span>
            <span>
              <UsersRound aria-hidden="true" size={15} />
              {event.registrationSummary.confirmed}/{event.capacity} plazas
            </span>
          </div>
        </div>
      </div>

      <DashboardLink route="eventos" onNavigate={onNavigate}>
        Ver evento
      </DashboardLink>
    </section>
  )
}

export function HomePage({ data, currentMember, onNavigate }: HomePageProps) {
  const dashboard = getPlayerDashboard(data, currentMember.id)
  const firstName = currentMember.displayName.split(' ')[0]

  return (
    <div className="page">
      <header className="page-heading dashboard-heading">
        <span className="page-eyebrow">
          <MapPin aria-hidden="true" size={13} />
          {data.community.name} · {data.community.city}
        </span>
        <h1>Hola, {firstName}</h1>
        <p>Esto es lo más importante para tu próxima visita.</p>
      </header>

      <div className="dashboard-grid">
        <NextEventCard
          dashboardEvent={dashboard.nextEvent}
          onNavigate={onNavigate}
        />

        <section
          className="dashboard-card news-card"
          aria-labelledby="news-title"
        >
          <div className="dashboard-card__topline">
            <span className="dashboard-label">
              <BellRing aria-hidden="true" size={15} />
              Noticias
            </span>
            {dashboard.highlightedNews?.pinned ? (
              <span className="important-badge">Importante</span>
            ) : null}
          </div>

          {dashboard.highlightedNews ? (
            <>
              <h2 id="news-title">{dashboard.highlightedNews.title}</h2>
              <p>{dashboard.highlightedNews.excerpt}</p>
              <time dateTime={dashboard.highlightedNews.publishedAt}>
                Publicado el{' '}
                {newsDateFormatter.format(
                  new Date(dashboard.highlightedNews.publishedAt),
                )}
              </time>
            </>
          ) : (
            <h2 id="news-title">No hay noticias nuevas.</h2>
          )}

          <DashboardLink route="noticias" onNavigate={onNavigate}>
            Ver noticias
          </DashboardLink>
        </section>

        <section
          className="dashboard-card matches-card"
          aria-labelledby="matches-title"
        >
          <div className="dashboard-card__topline">
            <span className="dashboard-label">
              <Sparkles aria-hidden="true" size={15} />
              Cartas
            </span>
            <span className="match-count">
              {dashboard.newMatches.length}{' '}
              {dashboard.newMatches.length === 1 ? 'nueva' : 'nuevas'}
            </span>
          </div>

          <div className="matches-card__heading">
            <div>
              <h2 id="matches-title">
                {dashboard.newMatches.length} coincidencias nuevas
              </h2>
              <p>Otros miembros tienen cartas que estás buscando.</p>
            </div>
            <ArrowLeftRight aria-hidden="true" size={22} />
          </div>

          <div className="match-list">
            {dashboard.newMatches.slice(0, 2).map(({ card, match, seller }) => (
              <article className="match-item" key={match.id}>
                <span className="match-item__initials" aria-hidden="true">
                  {seller.initials}
                </span>
                <span>
                  <strong>{card.name}</strong>
                  <small>Disponible por {seller.displayName}</small>
                </span>
              </article>
            ))}
          </div>

          <DashboardLink route="cartas" onNavigate={onNavigate}>
            Ver coincidencias
          </DashboardLink>
        </section>
      </div>
    </div>
  )
}
