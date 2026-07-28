import { ArrowUpRight, Layers3 } from 'lucide-react'

import { navigationItems, type AppRoute } from '../app/navigation'

type HomePageProps = {
  onNavigate: (route: AppRoute) => void
}

const featuredAreas = navigationItems.filter(
  ({ id }) => id !== 'inicio' && id !== 'perfil',
)

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="page">
      <header className="page-heading">
        <span className="page-eyebrow">Comunidad piloto</span>
        <h1>Inicio</h1>
        <p>Todo lo importante de tu comunidad, siempre a mano.</p>
      </header>

      <section className="welcome-panel" aria-labelledby="welcome-title">
        <div className="welcome-panel__icon" aria-hidden="true">
          <Layers3 size={24} />
        </div>
        <div>
          <span className="welcome-panel__label">Primera versión</span>
          <h2 id="welcome-title">Tu comunidad, sin perder nada importante.</h2>
          <p>
            Este espacio reunirá la agenda, las noticias de la tienda y las
            coincidencias de cartas.
          </p>
        </div>
      </section>

      <section className="section-block" aria-labelledby="explore-title">
        <div className="section-heading">
          <div>
            <span>Explorar</span>
            <h2 id="explore-title">Áreas del prototipo</h2>
          </div>
          <p>3 secciones</p>
        </div>

        <div className="area-grid">
          {featuredAreas.map(
            ({ id, icon: Icon, label, description }, index) => (
              <a
                className="area-card"
                href={`#${id}`}
                key={id}
                onClick={(event) => {
                  event.preventDefault()
                  onNavigate(id)
                }}
              >
                <span
                  className={`area-card__icon area-card__icon--${index + 1}`}
                >
                  <Icon aria-hidden="true" size={22} />
                </span>
                <span className="area-card__content">
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
                <ArrowUpRight
                  className="area-card__arrow"
                  aria-hidden="true"
                  size={19}
                />
              </a>
            ),
          )}
        </div>
      </section>
    </div>
  )
}
