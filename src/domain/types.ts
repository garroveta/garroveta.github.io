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
  memberCount: number
  accessPolicy: 'approval_required'
  suggestedTagIds: EntityId[]
  openingHours: OpeningHours[]
}

export type CommunityTag = {
  id: EntityId
  communityId: EntityId
  name: string
  kind: 'format' | 'interest' | 'communication'
  color: string
}

export type GameCategory = 'card_game' | 'miniatures' | 'role_playing_game'

export type CommunityGame = {
  id: EntityId
  communityId: EntityId
  name: string
  shortName: string
  category: GameCategory
  color: string
}

export type CompetitionFormat = {
  id: EntityId
  gameId: EntityId
  name: string
  shortName: string
  color: string
}

export type CompetitionEventKind = {
  id: EntityId
  name: string
  shortName: string
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
  status: 'approved' | 'pending'
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
  startsAt: ISODateTime
  endsAt: ISODateTime
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
  entries: EventStandingEntry[]
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
  type: NewsPostType
  title: string
  excerpt: string
  content: string
  publishedAt: ISODateTime
  tagIds: EntityId[]
  pinned: boolean
}

export type Card = {
  id: EntityId
  name: string
  setName: string
  setCode: string
  collectorNumber: string
}

export type CardLanguage = 'es' | 'en' | 'fr' | 'de' | 'it' | 'pt' | 'jp'
export type CardCondition = 'mint' | 'near_mint' | 'excellent' | 'good'

export type MarketplaceListing = {
  id: EntityId
  communityId: EntityId
  memberId: EntityId
  cardId: EntityId
  quantity: number
  language: CardLanguage
  condition: CardCondition
  finish: 'nonfoil' | 'foil'
  offerType: 'sale' | 'trade' | 'sale_or_trade'
  priceEur?: number
  status: 'available' | 'reserved' | 'completed'
  createdAt: ISODateTime
}

export type WantedCard = {
  id: EntityId
  communityId: EntityId
  memberId: EntityId
  cardId: EntityId
  quantity: number
  acceptedLanguages: CardLanguage[]
  acceptedFinishes: Array<'nonfoil' | 'foil'>
  notes?: string
  status: 'active' | 'paused' | 'fulfilled'
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
  type: 'sale' | 'trade'
  completedAt: ISODateTime
}

export type DemoDataSet = {
  currentMemberId: EntityId
  community: Community
  games: CommunityGame[]
  competitionFormats: CompetitionFormat[]
  competitionEventKinds: CompetitionEventKind[]
  tags: CommunityTag[]
  members: CommunityMember[]
  events: CommunityEvent[]
  eventStandings: EventStanding[]
  registrations: EventRegistration[]
  newsPosts: NewsPost[]
  cards: Card[]
  listings: MarketplaceListing[]
  wantedCards: WantedCard[]
  cardMatches: CardMatch[]
  cardDeals: CardDeal[]
}

export type DemoDataSummary = {
  members: number
  events: number
  newsPosts: number
  cardMatches: number
}
