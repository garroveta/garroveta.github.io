import { getDemoRoleOption, type DemoRole } from '../app/demoRoles'
import type { Community } from '../domain/types'

type AppHeaderProps = {
  activeRole: DemoRole
  community: Pick<Community, 'name' | 'city' | 'logoUrl'>
}

export function AppHeader({ activeRole, community }: AppHeaderProps) {
  const role = getDemoRoleOption(activeRole)
  const RoleIcon = role.icon

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
        aria-label={`Vista actual: ${role.label}`}
      >
        <RoleIcon aria-hidden="true" size={16} />
        <span>{role.label}</span>
      </span>
    </header>
  )
}
