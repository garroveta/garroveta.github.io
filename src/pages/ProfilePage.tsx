import { Check, LogOut, RotateCcw, Settings2 } from 'lucide-react'
import { useState } from 'react'

import {
  demoRoleOptions,
  getDemoRoleOption,
  type DemoRole,
} from '../app/demoRoles'
import { AccountPreferencesForm } from '../components/AccountPreferencesForm'
import { DemoDataSummary } from '../components/DemoDataSummary'
import type {
  CommunityMember,
  DemoDataSet,
  DemoDataSummary as DemoDataSummaryValue,
} from '../domain/types'

type ProfilePageProps = {
  activeRole: DemoRole
  accountEmail: string
  data: DemoDataSet
  currentMember: CommunityMember
  dataSummary: DemoDataSummaryValue
  onRoleChange: (role: DemoRole) => void
  onReset: () => void
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
  dataSummary,
  onRoleChange,
  onReset,
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

      <DemoDataSummary community={data.community} summary={dataSummary} />

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

      <section className="role-section" aria-labelledby="role-title">
        <div className="section-heading">
          <div>
            <span>Modo de prueba</span>
            <h2 id="role-title">Cambiar de vista</h2>
          </div>
        </div>

        <div className="role-options">
          {demoRoleOptions.map(
            ({ id, icon: Icon, label, description }, index) => {
              const isSelected = activeRole === id

              return (
                <button
                  className="role-option"
                  type="button"
                  key={id}
                  aria-pressed={isSelected}
                  onClick={() => onRoleChange(id)}
                >
                  <span
                    className={`role-option__icon role-option__icon--${index + 1}`}
                  >
                    <Icon aria-hidden="true" size={21} />
                  </span>
                  <span className="role-option__content">
                    <strong>{label}</strong>
                    <small>{description}</small>
                  </span>
                  <span className="role-option__check" aria-hidden="true">
                    {isSelected ? <Check size={17} strokeWidth={3} /> : null}
                  </span>
                </button>
              )
            },
          )}
        </div>
      </section>

      <section className="reset-panel">
        <div>
          <strong>Restaurar la demostración</strong>
          <p>
            Vuelve a la vista de jugador y recupera los datos iniciales del
            prototipo.
          </p>
        </div>
        <button className="secondary-button" type="button" onClick={onReset}>
          <RotateCcw aria-hidden="true" size={17} />
          Restablecer
        </button>
      </section>
    </div>
  )
}
