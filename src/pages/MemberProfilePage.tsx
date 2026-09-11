import { ArrowLeft } from 'lucide-react'

import { MemberSeasonPanel } from '../components/MemberSeasonPanel'
import { SeasonBadgesPanel } from '../components/SeasonBadgesPanel'
import { ShareActions } from '../components/ShareActions'
import { formatMemberProfileForWhatsApp } from '../data/memberSharing'
import { getMemberSeasonBadges } from '../data/rankingBadges'
import { getMemberSeasonSummary } from '../data/rankingMemberSeason'
import type {
  CommunityMember,
  CommunityRole,
  DemoDataSet,
} from '../domain/types'

const roleLabels: Record<CommunityRole, string> = {
  player: 'Jugador',
  manager: 'Gerente',
  moderator: 'Moderador',
}

const joinedFormatter = new Intl.DateTimeFormat('es-ES', {
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Madrid',
})

type MemberProfilePageProps = {
  data: DemoDataSet
  member: CommunityMember
  onBack: () => void
}

export function MemberProfilePage({
  data,
  member,
  onBack,
}: MemberProfilePageProps) {
  const season =
    data.rankingSeasons.find(({ status }) => status === 'active') ??
    data.rankingSeasons.find(({ status }) => status !== 'upcoming')
  const summary = season
    ? getMemberSeasonSummary(data, member.id, {
        gameId: 'game-mtg',
        seasonId: season.id,
      })
    : undefined
  const badges = season
    ? getMemberSeasonBadges(data, member.id, {
        gameId: 'game-mtg',
        seasonId: season.id,
      })
    : undefined
  const games = data.games.filter(({ id }) =>
    member.favoriteGameIds.includes(id),
  )
  const tags = data.tags.filter(({ id }) => member.tagIds.includes(id))
  const profileUrl = new URL(window.location.href)
  profileUrl.hash = `miembro?id=${encodeURIComponent(member.id)}`
  const shareText =
    season && badges
      ? formatMemberProfileForWhatsApp({
          badges,
          communityName: data.community.name,
          member,
          profileUrl: profileUrl.toString(),
          season,
          summary,
        })
      : ''

  return (
    <div className="page member-profile-page">
      <button className="back-button" type="button" onClick={onBack}>
        <ArrowLeft aria-hidden="true" size={17} />
        Volver
      </button>

      <header className="member-profile" aria-labelledby="member-profile-name">
        <span className="profile-avatar" aria-hidden="true">
          {member.initials}
        </span>
        <div>
          <span>{roleLabels[member.role]}</span>
          <h1 id="member-profile-name">{member.displayName}</h1>
          <p>
            En la comunidad desde{' '}
            {joinedFormatter.format(new Date(member.joinedAt))}
          </p>
        </div>
      </header>

      {shareText ? (
        <ShareActions
          className="member-profile__share"
          copiedLabel="Ficha copiada"
          copyLabel="Copiar ficha"
          copySuccessMessage="Ficha copiada. Ya puedes pegarla en WhatsApp."
          shareLabel="Compartir ficha"
          shareText={shareText}
        />
      ) : null}

      {games.length > 0 || tags.length > 0 ? (
        <ul className="member-profile__interests" aria-label="Intereses">
          {games.map((game) => (
            <li key={game.id}>{game.shortName}</li>
          ))}
          {tags.map((tag) => (
            <li key={tag.id}>{tag.name}</li>
          ))}
        </ul>
      ) : null}

      {summary ? (
        <MemberSeasonPanel
          perspective="other"
          summary={summary}
          title="Su temporada"
        />
      ) : null}

      <SeasonBadgesPanel data={data} memberId={member.id} perspective="other" />
    </div>
  )
}
