export type EntityId = string
export type ISODateTime = string

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type OpeningHours = {
  day: Weekday
  opensAt?: string
  closesAt?: string
  closesNextDay?: boolean
}

export type Community = {
  id: EntityId
  name: string
  city: string
  address?: string
  contactEmail?: string
  contactPhone?: string
  websiteUrl?: string
  instagramUrl?: string
  facebookUrl?: string
  logoUrl?: string
  memberCount: number
  accessPolicy: 'approval_required'
  suggestedTagIds: EntityId[]
  openingHours: OpeningHours[]
}

export type CommunityTag = {
  id: EntityId
  communityId: EntityId
  name: string
  kind: 'interest' | 'communication'
  color: string
  isActive?: boolean
}

export type GameCategory = 'card_game' | 'miniatures' | 'role_playing_game'

export type CommunityGame = {
  id: EntityId
  communityId: EntityId
  name: string
  shortName: string
  category: GameCategory
  color: string
  isActive?: boolean
}

export type CompetitionFormat = {
  id: EntityId
  gameId: EntityId
  name: string
  shortName: string
  color: string
  isActive?: boolean
}

export type CompetitionEventKind = {
  id: EntityId
  name: string
  shortName: string
  isActive?: boolean
}

export type CommunityRankingPoints = {
  first: number
  second: number
  third: number
  fourth: number
  fifth: number
  sixthToTenth: number
  participation: number
}

export type CommunityBadgeSetting = {
  id: EntityId
  name: string
  /** Absent for the badges the final ranking decides. */
  target?: number
}

export type CommunityBadgeSettings = {
  badges: CommunityBadgeSetting[]
}

export type CommunityRankingSettings = {
  points: CommunityRankingPoints
  defaultPeriodMonths: 3 | 6 | 12
  defaultLimit: 10 | 'all'
}

type CommunityRankingSeasonBase = {
  id: EntityId
  communityId: EntityId
  name: string
  startsOn: string
  endsOn: string
  points: CommunityRankingPoints
  /** Frozen with the season; absent means the community settings still apply. */
  badges?: CommunityBadgeSetting[]
}

export type CommunityRankingSeason =
  | (CommunityRankingSeasonBase & {
      status: 'upcoming' | 'active'
      eligibleMemberIds?: never
    })
  | (CommunityRankingSeasonBase & {
      status: 'closed'
      eligibleMemberIds: EntityId[]
    })

export type EventRegistrationRule = {
  eventType: EventType
  enabledByDefault: boolean
  defaultCapacity: number
  waitlistEnabled: boolean
}

export type CommunityRegistrationSettings = {
  rules: EventRegistrationRule[]
}

export type CommunityRole = 'player' | 'manager' | 'moderator'

export type ContactMethod = {
  kind: 'whatsapp' | 'email' | 'discord'
  label: string
  value: string
}

export type CommunityMember = {
  id: EntityId
  communityId: EntityId
  displayName: string
  initials: string
  role: CommunityRole
  status: 'approved' | 'pending' | 'suspended'
  tagIds: EntityId[]
  favoriteGameIds: EntityId[]
  contactMethods: ContactMethod[]
  joinedAt: ISODateTime
}

export type EventRegistrationSummary = {
  confirmed: number
  waitlisted: number
  attended?: number
}

export type EventType =
  'tournament' | 'league' | 'draft' | 'casual' | 'workshop' | 'launch'

export type CommunityEvent = {
  id: EntityId
  communityId: EntityId
  gameId?: EntityId
  formatId?: EntityId
  competitionEventKindId?: EntityId
  countsForCommunityRanking?: boolean
  listedInAgenda?: boolean
  type: EventType
  title: string
  description: string
  imageUri?: string
  startsAt: ISODateTime
  endsAt?: ISODateTime
  registrationEnabled?: boolean
  waitlistEnabled?: boolean
  capacity: number
  status: 'scheduled' | 'full' | 'completed'
  tagIds: EntityId[]
  createdByMemberId: EntityId
  registrationSummary: EventRegistrationSummary
}

export type EventStandingEntry = {
  rank: number
  memberId?: EntityId
  displayName: string
  eventPoints: number
  wins: number
  losses: number
  draws: number
  opponentMatchWinPercentage: number
  gameWinPercentage: number
  opponentGameWinPercentage: number
}

export type EventStanding = {
  id: EntityId
  eventId: EntityId
  /** Persisted for shared data; omitted only by legacy local prototype results. */
  rankingSeasonId?: EntityId
  entries: EventStandingEntry[]
  source?: {
    kind: 'eventlink_html'
    storeId?: string
    externalEventId?: string
    roundNumber?: number
    importedAt: ISODateTime
  }
}

export type EventRegistration = {
  id: EntityId
  eventId: EntityId
  memberId: EntityId
  status: 'confirmed' | 'waitlisted' | 'attended' | 'cancelled'
  registeredAt: ISODateTime
}

export type NewsPostType =
  'news' | 'promotion' | 'arrival' | 'urgent' | 'poll' | 'rule'

export type NewsPost = {
  id: EntityId
  communityId: EntityId
  authorMemberId: EntityId
  authorDisplayName?: string
  type: NewsPostType
  title: string
  excerpt: string
  content: string
  publishedAt: ISODateTime
  /** Absent means it never expires; both bounds are read filters, not jobs. */
  expiresAt?: ISODateTime
  tagIds: EntityId[]
  pinned: boolean
}

export type Card = {
  id: EntityId
  name: string
  setName: string
  setCode: string
  collectorNumber: string
  scryfallId?: string
  oracleId?: string
  imageUri?: string
}

export type CardLanguage =
  | 'es'
  | 'en'
  | 'fr'
  | 'de'
  | 'it'
  | 'pt'
  | 'jp'
  /** Any other printed language, kept as one bucket rather than mislabelled. */
  | 'other'
/** The seven Cardmarket grades, from best to worst. */
export type CardCondition =
  | 'mint'
  | 'near_mint'
  | 'excellent'
  | 'good'
  | 'light_played'
  | 'played'
  | 'poor'

export type MarketplaceListing = {
  id: EntityId
  communityId: EntityId
  memberId: EntityId
  cardId: EntityId
  /** Private organisation for the owner; never exposed in community views. */
  cardListId?: EntityId
  quantity: number
  language: CardLanguage
  condition: CardCondition
  finish: 'nonfoil' | 'foil'
  /** @deprecated Legacy demo field kept for locally persisted prototypes. */
  offerType: 'sale' | 'trade' | 'sale_or_trade'
  priceEur?: number
  /** `withdrawn` is reversible; `completed` records a closed deal. */
  status: 'available' | 'reserved' | 'completed' | 'withdrawn'
  reservedByMemberId?: EntityId
  /** Quantity held by the reserving member in this prototype reservation. */
  reservedQuantity?: number
  reservedAt?: ISODateTime
  createdAt: ISODateTime
}

export type WantedCard = {
  id: EntityId
  communityId: EntityId
  memberId: EntityId
  cardId: EntityId
  /** Private organisation for the owner; never exposed in community views. */
  cardListId?: EntityId
  quantity: number
  /** One line represents one precise language variant. */
  acceptedLanguages: [CardLanguage]
  /** One line represents one precise finish variant. */
  acceptedFinishes: ['nonfoil' | 'foil']
  oracleId?: string
  requestedScryfallId?: string
  matchAllPrintings?: boolean
  importSection?:
    'main' | 'sideboard' | 'maybeboard' | 'commander' | 'companion'
  notes?: string
  status: 'active' | 'paused' | 'fulfilled'
  createdAt: ISODateTime
}

export type PersonalCardList = {
  id: EntityId
  communityId: EntityId
  memberId: EntityId
  name: string
  kind: 'wanted' | 'offers'
  createdAt: ISODateTime
}

export type CardMatch = {
  id: EntityId
  communityId: EntityId
  wantedCardId: EntityId
  listingId: EntityId
  buyerMemberId: EntityId
  sellerMemberId: EntityId
  score: number
  reason: string
  status: 'new' | 'seen' | 'contacted' | 'completed'
  createdAt: ISODateTime
}

export type CardDeal = {
  id: EntityId
  communityId: EntityId
  matchId: EntityId
  wantedCardId: EntityId
  listingId: EntityId
  buyerMemberId: EntityId
  sellerMemberId: EntityId
  type: 'sale'
  completedAt: ISODateTime
}

export type DemoDataSet = {
  currentMemberId: EntityId
  community: Community
  games: CommunityGame[]
  competitionFormats: CompetitionFormat[]
  competitionEventKinds: CompetitionEventKind[]
  rankingSettings: CommunityRankingSettings
  badgeSettings: CommunityBadgeSettings
  rankingSeasons: CommunityRankingSeason[]
  registrationSettings: CommunityRegistrationSettings
  tags: CommunityTag[]
  members: CommunityMember[]
  events: CommunityEvent[]
  eventStandings: EventStanding[]
  registrations: EventRegistration[]
  newsPosts: NewsPost[]
  cards: Card[]
  cardLists: PersonalCardList[]
  listings: MarketplaceListing[]
  wantedCards: WantedCard[]
  cardMatches: CardMatch[]
  cardDeals: CardDeal[]
}
