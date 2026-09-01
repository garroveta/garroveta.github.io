import {
  AlertCircle,
  ArrowRight,
  ArrowLeftRight,
  BellRing,
  CalendarDays,
  Clock3,
  FileUp,
  MapPin,
  Megaphone,
  Plus,
  Settings2,
  Sparkles,
  UserPlus,
  UsersRound,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

import {
  listCommunityMembers,
  type ManagedCommunityMember,
} from '../api/managerMembers'
import type { DemoRole } from '../app/demoRoles'
import type { AppRoute } from '../app/navigation'
import {
  getManagerDashboard,
  getPlayerDashboard,
  type DashboardEvent,
  type ManagerDashboardEvent,
} from '../data/dashboardSelectors'
import type { CommunityMember, DemoDataSet } from '../domain/types'

type HomePageProps = {
  activeRole: DemoRole
  data: DemoDataSet
  currentMember: CommunityMember
  publishingMember: CommunityMember
  onNavigate: (route: AppRoute, query?: string) => void
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
  query,
  onNavigate,
}: {
  children: ReactNode
  route: AppRoute
  query?: string
  onNavigate: (route: AppRoute, query?: string) => void
}) {
  const href = `#${route}${query ? `?${query}` : ''}`

  return (
    <a
      className="dashboard-link"
      href={href}
      onClick={(event) => {
        event.preventDefault()
        onNavigate(route, query)
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
  onNavigate: (route: AppRoute, query?: string) => void
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

  const { event, game, registration } = dashboardEvent
  const eventDate = new Date(event.startsAt)
  const registrationLabel = registration
    ? registrationLabels[registration.status]
    : event.registrationEnabled
      ? 'Inscripción disponible'
      : undefined

  return (
    <section
      className="dashboard-card event-card"
      aria-labelledby="event-title"
    >
      <div className="dashboard-card__topline">
        <span className="dashboard-label">Próximo evento</span>
        {registrationLabel ? (
          <span className="event-registration">{registrationLabel}</span>
        ) : null}
      </div>

      <div className="event-card__body">
        <time className="event-date" dateTime={event.startsAt}>
          <span>{weekdayFormatter.format(eventDate)}</span>
          <strong>{eventDateFormatter.format(eventDate)}</strong>
        </time>

        <div className="event-card__content">
          {game ? (
            <span
              className="dashboard-game"
              style={{ '--game-color': game.color } as React.CSSProperties}
            >
              {game.shortName}
            </span>
          ) : null}
          <h2 id="event-title">{event.title}</h2>
          <p>{event.description}</p>
          <div className="event-meta">
            <span>
              <Clock3 aria-hidden="true" size={15} />
              {timeFormatter.format(eventDate)}
            </span>
            {event.registrationEnabled ? (
              <span>
                <UsersRound aria-hidden="true" size={15} />
                {event.registrationSummary.confirmed}/{event.capacity} plazas
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <DashboardLink route="eventos" onNavigate={onNavigate}>
        Ver evento
      </DashboardLink>
    </section>
  )
}

function ManagerMetric({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  detail: string
}) {
  return (
    <article className="manager-metric">
      <span className="manager-metric__icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        <small>{detail}</small>
      </div>
    </article>
  )
}

function ManagerEventRow({ item }: { item: ManagerDashboardEvent }) {
  const startsAt = new Date(item.event.startsAt)

  return (
    <article className="manager-event-row">
      <time dateTime={item.event.startsAt}>
        <strong>{eventDateFormatter.format(startsAt)}</strong>
        <span>{timeFormatter.format(startsAt)}</span>
      </time>
      <div className="manager-event-row__content">
        <div>
          <span>{item.game?.shortName ?? 'Comunidad'}</span>
          <h3>{item.event.title}</h3>
        </div>
        {item.event.registrationEnabled ? (
          <div className="occupancy-summary">
            <span>
              {item.event.registrationSummary.confirmed}/{item.event.capacity}
            </span>
            <div aria-label={`${item.occupancyRate}% de ocupación`}>
              <span style={{ width: `${item.occupancyRate}%` }} />
            </div>
          </div>
        ) : null}
      </div>
    </article>
  )
}

function ManagerQuickAction({
  icon,
  title,
  detail,
  route,
  query,
  onNavigate,
}: {
  icon: ReactNode
  title: string
  detail: string
  route: AppRoute
  query?: string
  onNavigate: (route: AppRoute, query?: string) => void
}) {
  const href = `#${route}${query ? `?${query}` : ''}`

  return (
    <a
      className="manager-quick-action"
      href={href}
      onClick={(event) => {
        event.preventDefault()
        onNavigate(route, query)
      }}
    >
      <span aria-hidden="true">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <ArrowRight aria-hidden="true" size={16} />
    </a>
  )
}

function ManagerHome({
  data,
  manager,
  onNavigate,
}: {
  data: DemoDataSet
  manager: CommunityMember
  onNavigate: (route: AppRoute, query?: string) => void
}) {
  const dashboard = getManagerDashboard(data)
  const firstName = manager.displayName.split(' ')[0]
  const [managedMembers, setManagedMembers] = useState<
    ManagedCommunityMember[] | null
  >(null)
  const [memberLoadFailed, setMemberLoadFailed] = useState(false)
  const pendingMembers =
    managedMembers?.filter(({ status }) => status === 'pending') ?? []
  const pendingMemberValue = memberLoadFailed
    ? '—'
    : managedMembers
      ? pendingMembers.length
      : '…'
  const attentionCount =
    pendingMembers.length + dashboard.attentionEvents.length

  useEffect(() => {
    const controller = new AbortController()
    let isActive = true

    void listCommunityMembers(data.community.id, controller.signal)
      .then(({ members }) => {
        if (!isActive) {
          return
        }

        setManagedMembers(members)
        setMemberLoadFailed(false)
      })
      .catch((error: unknown) => {
        if (
          !isActive ||
          (error instanceof DOMException && error.name === 'AbortError')
        ) {
          return
        }

        setMemberLoadFailed(true)
      })

    return () => {
      isActive = false
      controller.abort()
    }
  }, [data.community.id])

  return (
    <div className="page manager-dashboard">
      <header className="page-heading dashboard-heading">
        <span className="page-eyebrow">
          <MapPin aria-hidden="true" size={13} />
          {data.community.name} · {data.community.city}
        </span>
        <h1>Hola, {firstName}</h1>
        <p>Este es el estado de la tienda y de sus próximas actividades.</p>
      </header>

      <section className="manager-metrics" aria-label="Resumen de la agenda">
        <ManagerMetric
          icon={<CalendarDays size={18} />}
          label="Próximos eventos"
          value={dashboard.upcomingEvents.length}
          detail="En la agenda"
        />
        <ManagerMetric
          icon={<UserPlus size={18} />}
          label="Solicitudes pendientes"
          value={pendingMemberValue}
          detail={memberLoadFailed ? 'No disponible' : 'Nuevos miembros'}
        />
        <ManagerMetric
          icon={<UsersRound size={18} />}
          label="En lista de espera"
          value={dashboard.totalWaitlisted}
          detail="Requieren seguimiento"
        />
        <ManagerMetric
          icon={<AlertCircle size={18} />}
          label="Eventos completos"
          value={dashboard.fullEvents}
          detail="Sin plazas libres"
        />
      </section>

      <div className="manager-dashboard__grid">
        <section className="dashboard-card manager-agenda-card">
          <div className="dashboard-card__topline">
            <span className="dashboard-label">
              <CalendarDays aria-hidden="true" size={15} />
              Operación
            </span>
            <span>{dashboard.upcomingEvents.length} programados</span>
          </div>
          <h2>Próximos eventos</h2>
          <div className="manager-event-list">
            {dashboard.upcomingEvents.slice(0, 4).map((item) => (
              <ManagerEventRow item={item} key={item.event.id} />
            ))}
          </div>
          <DashboardLink route="eventos" onNavigate={onNavigate}>
            Gestionar agenda
          </DashboardLink>
        </section>

        <section className="dashboard-card manager-attention-card">
          <div className="dashboard-card__topline">
            <span className="dashboard-label">
              <AlertCircle aria-hidden="true" size={15} />
              Atención
            </span>
            <span>{attentionCount} avisos</span>
          </div>
          <h2>Por revisar</h2>
          {attentionCount > 0 ? (
            <div className="manager-alert-list">
              {pendingMembers.length > 0 ? (
                <article>
                  <strong>
                    {pendingMembers.length}{' '}
                    {pendingMembers.length === 1
                      ? 'solicitud de acceso'
                      : 'solicitudes de acceso'}
                  </strong>
                  <p>
                    {pendingMembers
                      .slice(0, 2)
                      .map(({ displayName }) => displayName)
                      .join(', ')}
                    {pendingMembers.length > 2 ? '…' : ''}
                  </p>
                </article>
              ) : null}
              {dashboard.attentionEvents.slice(0, 2).map(({ event }) => (
                <article key={event.id}>
                  <strong>{event.title}</strong>
                  <p>
                    {event.registrationSummary.waitlisted > 0
                      ? `${event.registrationSummary.waitlisted} personas en lista de espera.`
                      : 'El evento está casi completo.'}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="manager-clear-state">
              No hay incidencias pendientes en la agenda.
            </p>
          )}
          <DashboardLink
            route={pendingMembers.length > 0 ? 'perfil' : 'eventos'}
            query={
              pendingMembers.length > 0
                ? 'view=configuracion&section=members'
                : undefined
            }
            onNavigate={onNavigate}
          >
            {pendingMembers.length > 0
              ? 'Revisar solicitudes'
              : 'Revisar participantes'}
          </DashboardLink>
        </section>

        <section className="dashboard-card manager-quick-actions-card">
          <div className="dashboard-card__topline">
            <span className="dashboard-label">
              <Sparkles aria-hidden="true" size={15} />
              Gestión
            </span>
          </div>
          <h2>Acciones rápidas</h2>
          <div className="manager-quick-actions">
            <ManagerQuickAction
              icon={<Plus size={17} />}
              title="Nuevo evento"
              detail="Añadirlo a la agenda"
              route="eventos"
              query="action=new"
              onNavigate={onNavigate}
            />
            <ManagerQuickAction
              icon={<Megaphone size={17} />}
              title="Nueva publicación"
              detail="Comunicar con la comunidad"
              route="perfil"
              query="view=configuracion&section=communications"
              onNavigate={onNavigate}
            />
            <ManagerQuickAction
              icon={<FileUp size={17} />}
              title="Importar resultados"
              detail="Abrir la gestión de eventos"
              route="eventos"
              onNavigate={onNavigate}
            />
            <ManagerQuickAction
              icon={<Settings2 size={17} />}
              title="Configuración"
              detail="Administrar la comunidad"
              route="perfil"
              query="view=configuracion&section=community"
              onNavigate={onNavigate}
            />
          </div>
        </section>
      </div>
    </div>
  )
}

export function HomePage({
  activeRole,
  data,
  currentMember,
  publishingMember,
  onNavigate,
}: HomePageProps) {
  if (activeRole === 'gerente') {
    return (
      <ManagerHome
        data={data}
        manager={publishingMember}
        onNavigate={onNavigate}
      />
    )
  }

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
