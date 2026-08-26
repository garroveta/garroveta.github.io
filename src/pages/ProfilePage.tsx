import { Check, RotateCcw, UserPlus } from 'lucide-react'
import type { CSSProperties } from 'react'

import {
  demoRoleOptions,
  getDemoRoleOption,
  type DemoRole,
} from '../app/demoRoles'
import { CommunityOptionManager } from '../components/CommunityOptionManager'
import { DemoDataSummary } from '../components/DemoDataSummary'
import { isCommunityOptionActive } from '../data/communityOptions'
import { toggleFavoriteGame } from '../data/memberPreferences'
import type { DemoDataUpdater } from '../data/demoRepository'
import type {
  CommunityMember,
  DemoDataSet,
  DemoDataSummary as DemoDataSummaryValue,
} from '../domain/types'

type ProfilePageProps = {
  activeRole: DemoRole
  data: DemoDataSet
  currentMember: CommunityMember
  managerId: string
  dataSummary: DemoDataSummaryValue
  onRoleChange: (role: DemoRole) => void
  onDataChange: (updater: DemoDataUpdater) => void
  onReset: () => void
  onStartRegistration: () => void
}

export function ProfilePage({
  activeRole,
  data,
  currentMember,
  managerId,
  dataSummary,
  onRoleChange,
  onDataChange,
  onReset,
  onStartRegistration,
}: ProfilePageProps) {
  const currentRole = getDemoRoleOption(activeRole)
  const activeGames = data.games.filter(isCommunityOptionActive)
  const favoriteGameCount = activeGames.filter(({ id }) =>
    currentMember.favoriteGameIds.includes(id),
  ).length

  return (
    <div className="page">
      <header className="page-heading">
        <span className="page-eyebrow">Cuenta de demostración</span>
        <h1>Perfil</h1>
        <p>
          Cambia de vista para explorar el prototipo con cada tipo de usuario.
        </p>
      </header>

      <section className="registration-entry">
        <span className="registration-entry__icon" aria-hidden="true">
          <UserPlus size={22} />
        </span>
        <div>
          <strong>Probar el alta de un nuevo miembro</strong>
          <p>
            Recorre la creación de cuenta y la solicitud de acceso a CRC
            Delorean.
          </p>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={onStartRegistration}
        >
          Crear cuenta
        </button>
      </section>

      <section className="profile-summary" aria-labelledby="profile-name">
        <span className="profile-avatar" aria-hidden="true">
          {currentMember.initials}
        </span>
        <div className="profile-summary__identity">
          <span>Perfil activo</span>
          <h2 id="profile-name">{currentMember.displayName}</h2>
          <p>Miembro validado · {data.community.name}</p>
        </div>
        <span className="current-role">
          <currentRole.icon aria-hidden="true" size={17} />
          {currentRole.label}
        </span>
      </section>

      <DemoDataSummary community={data.community} summary={dataSummary} />

      {activeRole === 'gerente' ? (
        <CommunityOptionManager
          data={data}
          managerId={managerId}
          onDataChange={onDataChange}
        />
      ) : null}

      <section className="game-preferences" aria-labelledby="favorite-games">
        <div className="section-heading">
          <div>
            <span>Tu agenda</span>
            <h2 id="favorite-games">Mis juegos</h2>
          </div>
          <p>{favoriteGameCount} seleccionados</p>
        </div>
        <p>
          Elige los juegos que quieres seguir. Garroveta usará esta selección
          para destacar tu próximo evento.
        </p>

        <div className="favorite-game-options">
          {activeGames.map((game) => {
            const isFavorite = currentMember.favoriteGameIds.includes(game.id)

            return (
              <button
                type="button"
                key={game.id}
                aria-pressed={isFavorite}
                onClick={() =>
                  onDataChange((data) =>
                    toggleFavoriteGame(data, currentMember.id, game.id),
                  )
                }
              >
                <span
                  className="favorite-game-color"
                  style={{ '--game-color': game.color } as CSSProperties}
                  aria-hidden="true"
                />
                <span>
                  <strong>{game.shortName}</strong>
                  <small>{game.name}</small>
                </span>
                <span className="favorite-game-check" aria-hidden="true">
                  {isFavorite ? <Check size={16} strokeWidth={3} /> : null}
                </span>
              </button>
            )
          })}
        </div>
      </section>

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
