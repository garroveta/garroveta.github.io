import {
  ArrowLeft,
  Building2,
  ListTree,
  Megaphone,
  QrCode,
  Trophy,
  UserRoundCog,
  UsersRound,
} from 'lucide-react'
import { useState } from 'react'

import { CommunityOptionManager } from '../components/CommunityOptionManager'
import { CommunitySettingsPanel } from '../components/CommunitySettingsPanel'
import { CommunicationManagementPanel } from '../components/CommunicationManagementPanel'
import { MemberManagementPanel } from '../components/MemberManagementPanel'
import { InvitationManagementPanel } from '../components/InvitationManagementPanel'
import { RankingSettingsPanel } from '../components/RankingSettingsPanel'
import { RegistrationSettingsPanel } from '../components/RegistrationSettingsPanel'
import type { DemoDataUpdater } from '../data/demoRepository'
import type { DemoDataSet } from '../domain/types'
import type { SettingsSection } from './settingsSections'

type SettingsPageProps = {
  data: DemoDataSet
  managerId: string
  initialSection?: SettingsSection
  onDataChange: (updater: DemoDataUpdater) => void
  onBack: () => void
  onViewNewsPost: (postId: string) => void
}

export function SettingsPage({
  data,
  managerId,
  initialSection,
  onDataChange,
  onBack,
  onViewNewsPost,
}: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>(
    initialSection ?? 'options',
  )

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
          Administra la comunidad, las opciones, las inscripciones, los
          miembros, las publicaciones y las reglas del ranking desde un único
          lugar.
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
          aria-selected={activeSection === 'invitations'}
          onClick={() => setActiveSection('invitations')}
        >
          <QrCode aria-hidden="true" size={18} />
          Invitaciones
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'community'}
          onClick={() => setActiveSection('community')}
        >
          <Building2 aria-hidden="true" size={18} />
          Comunidad
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'communications'}
          onClick={() => setActiveSection('communications')}
        >
          <Megaphone aria-hidden="true" size={18} />
          Publicaciones
        </button>
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

      {activeSection === 'community' ? (
        <CommunitySettingsPanel
          data={data}
          managerId={managerId}
          onDataChange={onDataChange}
        />
      ) : activeSection === 'options' ? (
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
      ) : activeSection === 'invitations' ? (
        <InvitationManagementPanel communityId={data.community.id} />
      ) : activeSection === 'communications' ? (
        <CommunicationManagementPanel
          data={data}
          managerId={managerId}
          onDataChange={onDataChange}
          onViewPost={onViewNewsPost}
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
