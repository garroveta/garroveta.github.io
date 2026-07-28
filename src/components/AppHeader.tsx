import { getDemoRoleOption, type DemoRole } from '../app/demoRoles'

type AppHeaderProps = {
  activeRole: DemoRole
}

export function AppHeader({ activeRole }: AppHeaderProps) {
  const role = getDemoRoleOption(activeRole)
  const RoleIcon = role.icon

  return (
    <header className="app-header">
      <a className="brand" href="#inicio" aria-label="MTG Community, inicio">
        <span className="brand__mark" aria-hidden="true">
          M
        </span>
        <span className="brand__text">
          <strong>MTG Community</strong>
          <small>Tienda piloto · Prototipo</small>
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
