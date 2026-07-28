import { ArrowLeft } from 'lucide-react'

import { navigationItems, type AppRoute } from '../app/navigation'

type PlaceholderPageProps = {
  route: Exclude<AppRoute, 'inicio'>
  onNavigate: (route: AppRoute) => void
}

export function PlaceholderPage({ route, onNavigate }: PlaceholderPageProps) {
  const currentItem = navigationItems.find((item) => item.id === route)

  if (!currentItem) {
    return null
  }

  const Icon = currentItem.icon

  return (
    <div className="page">
      <header className="page-heading">
        <span className="page-eyebrow">MTG Community</span>
        <h1>{currentItem.label}</h1>
        <p>{currentItem.description}</p>
      </header>

      <section className="empty-state">
        <span className="empty-state__icon">
          <Icon aria-hidden="true" size={30} />
        </span>
        <span className="status-pill">Estructura lista</span>
        <h2>Esta sección será interactiva muy pronto.</h2>
        <p>
          La navegación ya funciona. El contenido se añadirá en las próximas
          tareas, manteniendo cada cambio en su propio commit.
        </p>
        <a
          className="text-link"
          href="#inicio"
          onClick={(event) => {
            event.preventDefault()
            onNavigate('inicio')
          }}
        >
          <ArrowLeft aria-hidden="true" size={18} />
          Volver al inicio
        </a>
      </section>
    </div>
  )
}
