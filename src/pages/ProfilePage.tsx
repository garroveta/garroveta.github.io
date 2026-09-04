import { LogOut, Settings2 } from 'lucide-react'
import { useState } from 'react'

import { getDemoRoleOption, type DemoRole } from '../app/demoRoles'
import { AccountPreferencesForm } from '../components/AccountPreferencesForm'
import type { CommunityMember, DemoDataSet } from '../domain/types'

type ProfilePageProps = {
  activeRole: DemoRole
  accountEmail: string
  data: DemoDataSet
  currentMember: CommunityMember
  onOpenSettings: () => void
  onSignOut: () => Promise<void>
  onSaveAccount: (input: {
    displayName: string
    favoriteGameIds: string[]
    tagIds: string[]
  }) => Promise<void>
}

export function ProfilePage({
  activeRole,
  accountEmail,
  data,
  currentMember,
  onOpenSettings,
  onSignOut,
  onSaveAccount,
}: ProfilePageProps) {
  const currentRole = getDemoRoleOption(activeRole)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string>()

  const handleSignOut = async () => {
    setIsSigningOut(true)
    setSignOutError(undefined)

    try {
      await onSignOut()
    } catch {
      setSignOutError('No se ha podido cerrar la sesión. Inténtalo de nuevo.')
      setIsSigningOut(false)
    }
  }

  return (
    <div className="page">
      <header className="page-heading">
        <span className="page-eyebrow">Tu cuenta</span>
        <h1>Perfil</h1>
        <p>Actualiza tus datos y elige qué juegos y grupos quieres seguir.</p>
      </header>

      <section className="profile-summary" aria-labelledby="profile-name">
        <span className="profile-avatar" aria-hidden="true">
          {currentMember.initials}
        </span>
        <div className="profile-summary__identity">
          <span>Cuenta conectada</span>
          <h2 id="profile-name">{currentMember.displayName}</h2>
          <p>Miembro validado · {data.community.name}</p>
        </div>
        <span className="current-role">
          <currentRole.icon aria-hidden="true" size={17} />
          {currentRole.label}
        </span>
      </section>

      <AccountPreferencesForm
        displayName={currentMember.displayName}
        email={accountEmail}
        favoriteGameIds={currentMember.favoriteGameIds}
        games={data.games}
        onSave={onSaveAccount}
        tagIds={currentMember.tagIds}
        tags={data.tags}
      />

      <section className="account-session" aria-labelledby="session-title">
        <div>
          <span>Acceso a la cuenta</span>
          <h2 id="session-title">Sesión</h2>
          <p>
            Sal de Garroveta en este dispositivo. Podrás volver a entrar con un
            código enviado a {accountEmail}.
          </p>
          {signOutError ? <p role="alert">{signOutError}</p> : null}
        </div>
        <button
          className="secondary-button account-session__action"
          disabled={isSigningOut}
          type="button"
          onClick={() => void handleSignOut()}
        >
          <LogOut aria-hidden="true" size={17} />
          {isSigningOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </button>
      </section>

      {activeRole === 'gerente' ? (
        <section className="manager-settings-entry">
          <span className="manager-settings-entry__icon" aria-hidden="true">
            <Settings2 size={22} />
          </span>
          <div>
            <span>Herramientas del gerente</span>
            <h2>Configuración del local</h2>
            <p>
              Gestiona juegos, eventos, inscripciones, miembros, comunicaciones
              y reglas del ranking.
            </p>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={onOpenSettings}
          >
            Abrir configuración
          </button>
        </section>
      ) : null}
    </div>
  )
}
