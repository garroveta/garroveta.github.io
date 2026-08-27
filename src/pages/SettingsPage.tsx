import {
  ArrowLeft,
  ListTree,
  Trophy,
  UserRoundCog,
  UsersRound,
} from 'lucide-react'
import { useState } from 'react'

import { CommunityOptionManager } from '../components/CommunityOptionManager'
import { MemberManagementPanel } from '../components/MemberManagementPanel'
import { RankingSettingsPanel } from '../components/RankingSettingsPanel'
import { RegistrationSettingsPanel } from '../components/RegistrationSettingsPanel'
import type { DemoDataUpdater } from '../data/demoRepository'
import type { DemoDataSet } from '../domain/types'

type SettingsSection = 'options' | 'registrations' | 'members' | 'ranking'

type SettingsPageProps = {
  data: DemoDataSet
  managerId: string
  onDataChange: (updater: DemoDataUpdater) => void
  onBack: () => void
}

export function SettingsPage({
  data,
  managerId,
  onDataChange,
  onBack,
}: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('options')

  return (
    <div className="page settings-page">
      <button className="back-button" type="button" onClick={onBack}>
        <ArrowLeft aria-hidden="true" size={18} />
        Volver al perfil
      </button>

      <header className="page-heading settings-heading">
        <span className="page-eyebrow">Herramientas del gerente</span>
        <h1>Configuración</h1>
        <p>
          Administra las opciones, las inscripciones, los miembros y las reglas
          del ranking desde un único lugar.
        </p>
      </header>

      <div
        className="settings-navigation"
        role="tablist"
        aria-label="Secciones de configuración"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'options'}
          onClick={() => setActiveSection('options')}
        >
          <ListTree aria-hidden="true" size={18} />
          Opciones
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'registrations'}
          onClick={() => setActiveSection('registrations')}
        >
          <UsersRound aria-hidden="true" size={18} />
          Inscripciones
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'members'}
          onClick={() => setActiveSection('members')}
        >
          <UserRoundCog aria-hidden="true" size={18} />
          Miembros
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'ranking'}
          onClick={() => setActiveSection('ranking')}
        >
          <Trophy aria-hidden="true" size={18} />
          Ranking
        </button>
      </div>

      {activeSection === 'options' ? (
        <CommunityOptionManager
          data={data}
          managerId={managerId}
          onDataChange={onDataChange}
        />
      ) : activeSection === 'registrations' ? (
        <RegistrationSettingsPanel
          data={data}
          managerId={managerId}
          onDataChange={onDataChange}
        />
      ) : activeSection === 'members' ? (
        <MemberManagementPanel
          data={data}
          managerId={managerId}
          onDataChange={onDataChange}
        />
      ) : (
        <RankingSettingsPanel
          data={data}
          managerId={managerId}
          onDataChange={onDataChange}
        />
      )}
    </div>
  )
}
