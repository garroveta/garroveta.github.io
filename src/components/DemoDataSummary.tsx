import {
  ArrowLeftRight,
  CalendarDays,
  ExternalLink,
  HardDrive,
  Mail,
  MapPin,
  Newspaper,
  Phone,
  UsersRound,
} from 'lucide-react'

import type {
  Community,
  DemoDataSummary as DemoDataSummaryValue,
} from '../domain/types'

type DemoDataSummaryProps = {
  community: Community
  summary: DemoDataSummaryValue
}

export function DemoDataSummary({ community, summary }: DemoDataSummaryProps) {
  const metrics = [
    {
      label: 'Miembros',
      value: summary.members,
      icon: UsersRound,
    },
    {
      label: 'Eventos',
      value: summary.events,
      icon: CalendarDays,
    },
    {
      label: 'Noticias',
      value: summary.newsPosts,
      icon: Newspaper,
    },
    {
      label: 'Coincidencias',
      value: summary.cardMatches,
      icon: ArrowLeftRight,
    },
  ]

  return (
    <section className="demo-data-panel" aria-labelledby="demo-data-title">
      <div className="demo-data-panel__heading">
        <div>
          <span>Comunidad cargada</span>
          <h2 id="demo-data-title">{community.name}</h2>
        </div>
        <p>
          <MapPin aria-hidden="true" size={15} />
          {community.address ?? community.city}
        </p>
      </div>

      {community.contactEmail ||
      community.contactPhone ||
      community.websiteUrl ||
      community.instagramUrl ||
      community.facebookUrl ? (
        <div
          className="community-contact-links"
          aria-label="Contacto del local"
        >
          {community.contactEmail ? (
            <a href={`mailto:${community.contactEmail}`}>
              <Mail aria-hidden="true" size={14} />
              {community.contactEmail}
            </a>
          ) : null}
          {community.contactPhone ? (
            <a href={`tel:${community.contactPhone}`}>
              <Phone aria-hidden="true" size={14} />
              {community.contactPhone}
            </a>
          ) : null}
          {[
            ['Web', community.websiteUrl],
            ['Instagram', community.instagramUrl],
            ['Facebook', community.facebookUrl],
          ].map(([label, url]) =>
            url ? (
              <a key={label} href={url} rel="noreferrer" target="_blank">
                <ExternalLink aria-hidden="true" size={14} />
                {label}
              </a>
            ) : null,
          )}
        </div>
      ) : null}

      <div className="demo-metrics">
        {metrics.map(({ icon: Icon, label, value }) => (
          <div className="demo-metric" key={label}>
            <Icon aria-hidden="true" size={17} />
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <p className="demo-data-note">
        Los nombres de miembros y el contenido son ficticios para esta
        demostración.
      </p>
      <p className="storage-status">
        <HardDrive aria-hidden="true" size={14} />
        Datos guardados en este navegador
      </p>
    </section>
  )
}
