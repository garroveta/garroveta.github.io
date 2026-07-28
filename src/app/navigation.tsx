import {
  CalendarDays,
  House,
  Newspaper,
  Search,
  UserRound,
  type LucideIcon,
} from 'lucide-react'

export type AppRoute = 'inicio' | 'eventos' | 'cartas' | 'noticias' | 'perfil'

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
  return navigationItems.some((item) => item.id === value)
}
