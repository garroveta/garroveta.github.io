import { Store, UserRound, type LucideIcon } from 'lucide-react'

/**
 * `moderator` still exists in the database and in `CommunityRole`, but it
 * grants nothing today, so the product never presents it as a role of its own.
 * Reinstating it means adding the option back here and defining its permissions.
 */
export type DemoRole = 'jugador' | 'gerente'

export type DemoRoleOption = {
  id: DemoRole
  label: string
  description: string
  icon: LucideIcon
}

export const demoRoleOptions: DemoRoleOption[] = [
  {
    id: 'jugador',
    label: 'Jugador',
    description: 'Consulta eventos, noticias y coincidencias de cartas.',
    icon: UserRound,
  },
  {
    id: 'gerente',
    label: 'Gerente',
    description: 'Organiza la tienda, publica contenido y gestiona eventos.',
    icon: Store,
  },
]

export function getDemoRoleOption(role: DemoRole) {
  return demoRoleOptions.find((option) => option.id === role)!
}
