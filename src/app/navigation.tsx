import {
  CalendarDays,
  House,
  Newspaper,
  Search,
  Trophy,
  UserRound,
  type LucideIcon,
} from 'lucide-react'

export type AppRoute =
  | 'inicio'
  | 'eventos'
  | 'ranking'
  | 'cartas'
  | 'noticias'
  | 'perfil'
  | 'registro'

export type NavigationItem = {
  id: AppRoute
  label: string
  icon: LucideIcon
  description: string
}

export const navigationItems: NavigationItem[] = [
  {
    id: 'inicio',
    label: 'Inicio',
    icon: House,
    description: 'Lo esencial de tu comunidad en un solo vistazo.',
  },
  {
    id: 'eventos',
    label: 'Eventos',
    icon: CalendarDays,
    description: 'Agenda, inscripciones, listas de espera y clasificaciones.',
  },
  {
    id: 'ranking',
    label: 'Ranking',
    icon: Trophy,
    description: 'Resultados recientes y clasificación de la comunidad.',
  },
  {
    id: 'cartas',
    label: 'Cartas',
    icon: Search,
    description: 'Ofertas, búsquedas y coincidencias entre miembros.',
  },
  {
    id: 'noticias',
    label: 'Noticias',
    icon: Newspaper,
    description: 'Comunicaciones de la tienda organizadas por etiquetas.',
  },
  {
    id: 'perfil',
    label: 'Perfil',
    icon: UserRound,
    description: 'Tu cuenta, tus etiquetas y tus preferencias.',
  },
]

export function isAppRoute(value: string): value is AppRoute {
  return (
    value === 'registro' || navigationItems.some((item) => item.id === value)
  )
}
