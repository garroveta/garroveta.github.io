import { ShieldCheck, Store, UserRound, type LucideIcon } from 'lucide-react'

export type DemoRole = 'jugador' | 'gerente' | 'moderador'

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
  {
    id: 'moderador',
    label: 'Moderador',
    description: 'Valida miembros y ayuda a mantener la comunidad.',
    icon: ShieldCheck,
  },
]

export function getDemoRoleOption(role: DemoRole) {
  return demoRoleOptions.find((option) => option.id === role)!
}
