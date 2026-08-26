import { UserPlus } from 'lucide-react'

import { getDemoRoleOption, type DemoRole } from '../app/demoRoles'

type AppHeaderProps = {
  activeRole: DemoRole
  registrationMode?: boolean
}

export function AppHeader({ activeRole, registrationMode }: AppHeaderProps) {
  const role = getDemoRoleOption(activeRole)
  const RoleIcon = registrationMode ? UserPlus : role.icon
  const roleLabel = registrationMode ? 'Nuevo miembro' : role.label

  return (
    <header className="app-header">
      <a className="brand" href="#inicio" aria-label="Garroveta, inicio">
        <span className="brand__mark" aria-hidden="true">
          G
        </span>
        <span className="brand__text">
          <strong>Garroveta</strong>
          <small>CRC Delorean · Inca</small>
        </span>
      </a>

      <span
        className="active-role-badge"
        aria-label={`Vista actual: ${roleLabel}`}
      >
        <RoleIcon aria-hidden="true" size={16} />
        <span>{roleLabel}</span>
      </span>
    </header>
  )
}
