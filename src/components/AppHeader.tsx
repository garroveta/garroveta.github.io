import { UserPlus } from 'lucide-react'

import { getDemoRoleOption, type DemoRole } from '../app/demoRoles'
import type { Community } from '../domain/types'

type AppHeaderProps = {
  activeRole: DemoRole
  community: Pick<Community, 'name' | 'city' | 'logoUrl'>
  registrationMode?: boolean
}

export function AppHeader({
  activeRole,
  community,
  registrationMode,
}: AppHeaderProps) {
  const role = getDemoRoleOption(activeRole)
  const RoleIcon = registrationMode ? UserPlus : role.icon
  const roleLabel = registrationMode ? 'Nuevo miembro' : role.label

  return (
    <header className="app-header">
      <a className="brand" href="#inicio" aria-label="Garroveta, inicio">
        <span
          className={`brand__mark${community.logoUrl ? ' brand__mark--image' : ''}`}
          aria-hidden="true"
        >
          {community.logoUrl ? <img src={community.logoUrl} alt="" /> : 'G'}
        </span>
        <span className="brand__text">
          <strong>Garroveta</strong>
          <small>
            {community.name} · {community.city}
          </small>
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
