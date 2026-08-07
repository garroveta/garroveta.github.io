import {
  ArrowLeft,
  AtSign,
  CheckCircle2,
  ChevronRight,
  Layers3,
  ListChecks,
  Mail,
  MessageCircle,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'

import {
  importWantedCards,
  publishMarketplaceListing,
  type MarketplaceListingInput,
  type WantedImportResult,
} from '../data/cardMutations'
import { completeCardDeal } from '../data/cardDeals'
import {
  markCardMatchSeen,
  updateMarketplaceListingStatus,
  updateWantedCardStatus,
} from '../data/cardLifecycle'
import {
  getMarketplaceListings,
  getMemberCardMatches,
  getMemberMarketplaceListings,
  getMemberWantedCards,
  type MemberCardMatchItem,
  type MemberMarketplaceListingItem,
  type MarketplaceListingItem,
  type WantedCardItem,
} from '../data/cardSelectors'
import type { DemoDataUpdater } from '../data/demoRepository'
import type {
  CardCondition,
  CardDeal,
  CardLanguage,
  CommunityMember,
  DemoDataSet,
  MarketplaceListing,
} from '../domain/types'

type CardsPageProps = {
  data: DemoDataSet
  currentMember: CommunityMember
  onDataChange: (updater: DemoDataUpdater) => void
}

const languageLabels: Record<CardLanguage, string> = {
  es: 'Español',
  en: 'Inglés',
  fr: 'Francés',
  de: 'Alemán',
  it: 'Italiano',
  pt: 'Portugués',
  jp: 'Japonés',
}

const conditionLabels: Record<CardCondition, string> = {
  mint: 'Mint',
  near_mint: 'Near Mint',
  excellent: 'Excellent',
  good: 'Good',
}

const offerTypeLabels: Record<MarketplaceListing['offerType'], string> = {
  sale: 'Venta',
  trade: 'Intercambio',
  sale_or_trade: 'Venta o intercambio',
}

const cardLanguages = Object.keys(languageLabels) as CardLanguage[]
const cardConditions = Object.keys(conditionLabels) as CardCondition[]
const offerTypes = Object.keys(
  offerTypeLabels,
) as MarketplaceListing['offerType'][]
const MARKET_PAGE_SIZE = 20

const matchStatusLabels = {
  new: 'Nueva',
  seen: 'Vista',
  contacted: 'Contactado',
  completed: 'Completada',
}

const listingStatusLabels: Record<MarketplaceListing['status'], string> = {
  available: 'Disponible',
  reserved: 'Reservada',
  completed: 'Cerrada',
}

function MarketplaceTable({
  items,
  onMemberSelect,
}: {
  items: MarketplaceListingItem[]
  onMemberSelect: (memberId: string) => void
}) {
  return (
    <div className="market-table-wrap">
      <table
        className="market-table"
        aria-label="Ofertas de cartas disponibles"
      >
        <thead>
          <tr>
            <th scope="col">Carta</th>
            <th scope="col">Miembro</th>
            <th className="market-table__wide" scope="col">
              Oferta
            </th>
            <th className="market-table__wide" scope="col">
              Idioma
            </th>
            <th className="market-table__wide" scope="col">
              Estado
            </th>
            <th scope="col">
              <abbr title="Cantidad">Cant.</abbr>
            </th>
            <th scope="col">Precio</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.listing.id}>
              <td>
                <div className="market-table__card">
                  <span className="card-set-symbol" aria-hidden="true">
                    {item.card.setCode}
                  </span>
                  <span>
                    <strong>{item.card.name}</strong>
                    <small>
                      {item.card.setName} · #{item.card.collectorNumber}
                      {item.listing.finish === 'foil' ? ' · Foil' : ''}
                    </small>
                    <small className="market-table__mobile-meta">
                      {offerTypeLabels[item.listing.offerType]} ·{' '}
                      {languageLabels[item.listing.language]} ·{' '}
                      {conditionLabels[item.listing.condition]}
                    </small>
                  </span>
                </div>
              </td>
              <td>
                <button
                  className="market-table__member"
                  type="button"
                  aria-label={`Ver cartas de ${item.member.displayName}`}
                  onClick={() => onMemberSelect(item.member.id)}
                >
                  <span className="member-initials" aria-hidden="true">
                    {item.member.initials}
                  </span>
                  <span>{item.member.displayName}</span>
                </button>
              </td>
              <td className="market-table__wide">
                {offerTypeLabels[item.listing.offerType]}
              </td>
              <td className="market-table__wide">
                {languageLabels[item.listing.language]}
              </td>
              <td className="market-table__wide">
                {conditionLabels[item.listing.condition]}
              </td>
              <td className="market-table__quantity">
                {item.listing.quantity}
              </td>
              <td className="market-table__price">
                {item.listing.priceEur
                  ? `${item.listing.priceEur.toFixed(2)} €`
                  : 'A convenir'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function WantedCardRow({
  item,
  onStatusChange,
}: {
  item: WantedCardItem
  onStatusChange: (status: WantedCardItem['wantedCard']['status']) => void
}) {
  return (
    <article className="wanted-card-row">
      <span className="card-set-symbol" aria-hidden="true">
        {item.card.setCode}
      </span>
      <div>
        <h3>{item.card.name}</h3>
        <p>
          {item.wantedCard.quantity} buscada
          {item.wantedCard.quantity > 1 ? 's' : ''} ·{' '}
          {item.wantedCard.acceptedLanguages
            .map((language) => languageLabels[language])
            .join(', ')}
        </p>
        {item.wantedCard.notes ? <small>{item.wantedCard.notes}</small> : null}
      </div>
      <span
        className={`wanted-status wanted-status--${item.wantedCard.status}`}
      >
        {item.wantedCard.status === 'active' ? 'Activa' : 'En pausa'}
      </span>
      <div className="list-management-actions">
        <button
          type="button"
          onClick={() =>
            onStatusChange(
              item.wantedCard.status === 'active' ? 'paused' : 'active',
            )
          }
        >
          {item.wantedCard.status === 'active'
            ? 'Pausar búsqueda'
            : 'Reactivar búsqueda'}
        </button>
        <button type="button" onClick={() => onStatusChange('fulfilled')}>
          <CheckCircle2 aria-hidden="true" size={14} />
          Marcar encontrada
        </button>
      </div>
    </article>
  )
}

function MemberListingRow({
  item,
  onStatusChange,
}: {
  item: MemberMarketplaceListingItem
  onStatusChange: (status: MarketplaceListing['status']) => void
}) {
  return (
    <article className="member-listing-row">
      <span className="card-set-symbol" aria-hidden="true">
        {item.card.setCode}
      </span>
      <div>
        <h3>{item.card.name}</h3>
        <p>
          {item.listing.quantity} · {offerTypeLabels[item.listing.offerType]} ·{' '}
          {languageLabels[item.listing.language]}
        </p>
      </div>
      <span className={`listing-status listing-status--${item.listing.status}`}>
        {listingStatusLabels[item.listing.status]}
      </span>
      {item.listing.status !== 'completed' ? (
        <div className="list-management-actions">
          <button
            type="button"
            onClick={() =>
              onStatusChange(
                item.listing.status === 'available' ? 'reserved' : 'available',
              )
            }
          >
            {item.listing.status === 'available'
              ? 'Marcar reservada'
              : 'Reactivar oferta'}
          </button>
          <button type="button" onClick={() => onStatusChange('completed')}>
            <CheckCircle2 aria-hidden="true" size={14} />
            Cerrar oferta
          </button>
        </div>
      ) : null}
    </article>
  )
}

type MatchGrouping = 'card' | 'member'

function groupCardMatches(
  matches: MemberCardMatchItem[],
  grouping: MatchGrouping,
) {
  const groups = new Map<string, MemberCardMatchItem[]>()

  for (const item of matches) {
    const key = grouping === 'card' ? item.card.id : item.seller.id
    const group = groups.get(key) ?? []
    group.push(item)
    groups.set(key, group)
  }

  return [...groups.values()]
}

function MatchGroupCard({
  items,
  grouping,
  onSelect,
}: {
  items: MemberCardMatchItem[]
  grouping: MatchGrouping
  onSelect: (matchId: string) => void
}) {
  const firstItem = items[0]

  if (!firstItem) {
    return null
  }

  const isCardGroup = grouping === 'card'

  return (
    <article className="match-group-card">
      <header className="match-group-card__header">
        <span
          className={isCardGroup ? 'card-set-symbol' : 'member-initials'}
          aria-hidden="true"
        >
          {isCardGroup ? firstItem.card.setCode : firstItem.seller.initials}
        </span>
        <div>
          <h3>
            {isCardGroup ? firstItem.card.name : firstItem.seller.displayName}
          </h3>
          <p>
            {isCardGroup
              ? `${firstItem.card.setName} · #${firstItem.card.collectorNumber}`
              : `${items.length} ${items.length === 1 ? 'carta buscada disponible' : 'cartas buscadas disponibles'}`}
          </p>
        </div>
        <strong className="match-group-card__count">
          {items.length}{' '}
          {isCardGroup
            ? items.length === 1
              ? 'miembro'
              : 'miembros'
            : items.length === 1
              ? 'carta'
              : 'cartas'}
        </strong>
      </header>

      <div className="match-group-card__list">
        {items.map((item) => {
          const primaryLabel = isCardGroup
            ? item.seller.displayName
            : item.card.name
          const symbol = isCardGroup ? item.seller.initials : item.card.setCode

          return (
            <button
              className="compact-match-row"
              type="button"
              key={item.match.id}
              aria-label={`Ver coincidencia de ${item.card.name} con ${item.seller.displayName}`}
              onClick={() => onSelect(item.match.id)}
            >
              <span
                className={isCardGroup ? 'member-initials' : 'card-set-symbol'}
                aria-hidden="true"
              >
                {symbol}
              </span>
              <span className="compact-match-row__identity">
                <strong>{primaryLabel}</strong>
                <small>
                  {matchStatusLabels[item.match.status]} ·{' '}
                  {offerTypeLabels[item.listing.offerType]} ·{' '}
                  {languageLabels[item.listing.language]} ·{' '}
                  {conditionLabels[item.listing.condition]}
                </small>
              </span>
              <span className="compact-match-row__score">
                {item.match.score}%
              </span>
              <ChevronRight aria-hidden="true" size={16} />
            </button>
          )
        })}
      </div>
    </article>
  )
}

function MatchDetail({
  item,
  deal,
  onBack,
  onComplete,
}: {
  item: MemberCardMatchItem
  deal?: CardDeal
  onBack: () => void
  onComplete: (type: CardDeal['type']) => void
}) {
  const contactIcons = {
    whatsapp: MessageCircle,
    email: Mail,
    discord: AtSign,
  }

  return (
    <div className="page">
      <button className="back-button" type="button" onClick={onBack}>
        <ArrowLeft aria-hidden="true" size={18} />
        Volver a las coincidencias
      </button>

      <article className="match-detail">
        <div className="card-match__topline">
          <span className={`match-status match-status--${item.match.status}`}>
            <Sparkles aria-hidden="true" size={13} />
            {matchStatusLabels[item.match.status]}
          </span>
          <strong>{item.match.score}% compatible</strong>
        </div>

        <div className="match-detail__card">
          <span aria-hidden="true">{item.card.setCode}</span>
          <div>
            <p>Estás buscando</p>
            <h1>{item.card.name}</h1>
            <small>
              {item.card.setName} · #{item.card.collectorNumber}
            </small>
          </div>
        </div>

        <p className="card-match__reason">{item.match.reason}</p>

        <dl className="market-card__facts">
          <div>
            <dt>Operación</dt>
            <dd>{offerTypeLabels[item.listing.offerType]}</dd>
          </div>
          <div>
            <dt>Idioma</dt>
            <dd>{languageLabels[item.listing.language]}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>{conditionLabels[item.listing.condition]}</dd>
          </div>
          <div>
            <dt>Precio</dt>
            <dd>
              {item.listing.priceEur
                ? `${item.listing.priceEur.toFixed(2)} €`
                : 'A convenir'}
            </dd>
          </div>
        </dl>

        <section className="match-contact" aria-labelledby="seller-title">
          <div className="match-contact__identity">
            <span className="member-initials" aria-hidden="true">
              {item.seller.initials}
            </span>
            <div>
              <small>Miembro que ofrece la carta</small>
              <h2 id="seller-title">{item.seller.displayName}</h2>
            </div>
          </div>

          <div className="contact-methods">
            {item.seller.contactMethods.map((contactMethod) => {
              const ContactIcon = contactIcons[contactMethod.kind]

              return (
                <div key={`${contactMethod.kind}-${contactMethod.value}`}>
                  <ContactIcon aria-hidden="true" size={18} />
                  <span>
                    <small>{contactMethod.label}</small>
                    <strong>{contactMethod.value}</strong>
                  </span>
                </div>
              )
            })}
          </div>

          <p>
            Estos datos solo se muestran porque existe una coincidencia entre
            vuestras listas.
          </p>
        </section>

        {deal ? (
          <section className="completed-deal" aria-live="polite">
            <CheckCircle2 aria-hidden="true" size={22} />
            <div>
              <strong>Operación registrada</strong>
              <p>
                {deal.type === 'trade'
                  ? 'Intercambio realizado'
                  : 'Venta realizada'}{' '}
                con {item.seller.displayName}.
              </p>
            </div>
          </section>
        ) : (
          <div className="deal-actions">
            {item.listing.offerType !== 'sale' ? (
              <button
                className="primary-button"
                type="button"
                onClick={() => onComplete('trade')}
              >
                Marcar intercambio realizado
              </button>
            ) : null}
            {item.listing.offerType !== 'trade' ? (
              <button
                className="primary-button"
                type="button"
                onClick={() => onComplete('sale')}
              >
                Marcar venta realizada
              </button>
            ) : null}
          </div>
        )}
      </article>
    </div>
  )
}

function ComposerHeading({
  title,
  onClose,
}: {
  title: string
  onClose: () => void
}) {
  return (
    <div className="card-composer__heading">
      <div>
        <span>Datos guardados localmente</span>
        <h2>{title}</h2>
      </div>
      <button type="button" aria-label="Cerrar formulario" onClick={onClose}>
        <X aria-hidden="true" size={18} />
      </button>
    </div>
  )
}

function ListingComposer({
  data,
  memberId,
  onClose,
  onDataChange,
  onPublished,
}: {
  data: DemoDataSet
  memberId: string
  onClose: () => void
  onDataChange: (updater: DemoDataUpdater) => void
  onPublished: () => void
}) {
  const [cardId, setCardId] = useState(data.cards[0]?.id ?? '')
  const [quantity, setQuantity] = useState(1)
  const [language, setLanguage] = useState<CardLanguage>('es')
  const [condition, setCondition] = useState<CardCondition>('near_mint')
  const [finish, setFinish] = useState<MarketplaceListing['finish']>('nonfoil')
  const [offerType, setOfferType] =
    useState<MarketplaceListing['offerType']>('trade')
  const [priceEur, setPriceEur] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const input: MarketplaceListingInput = {
      memberId,
      cardId,
      quantity,
      language,
      condition,
      finish,
      offerType,
      priceEur: priceEur ? Number(priceEur) : undefined,
    }
    onDataChange((currentData) => publishMarketplaceListing(currentData, input))
    onPublished()
  }

  return (
    <form
      className="card-composer"
      aria-label="Publicar una carta"
      onSubmit={handleSubmit}
    >
      <ComposerHeading title="Publicar una carta" onClose={onClose} />

      <label className="form-field">
        <span>Carta</span>
        <select
          value={cardId}
          onChange={(event) => setCardId(event.target.value)}
        >
          {data.cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.name} · {card.setCode}
            </option>
          ))}
        </select>
      </label>

      <div className="card-form-grid">
        <label className="form-field">
          <span>Cantidad</span>
          <input
            required
            min={1}
            type="number"
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
          />
        </label>
        <label className="form-field">
          <span>Idioma</span>
          <select
            value={language}
            onChange={(event) =>
              setLanguage(event.target.value as CardLanguage)
            }
          >
            {cardLanguages.map((cardLanguage) => (
              <option key={cardLanguage} value={cardLanguage}>
                {languageLabels[cardLanguage]}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Estado</span>
          <select
            value={condition}
            onChange={(event) =>
              setCondition(event.target.value as CardCondition)
            }
          >
            {cardConditions.map((cardCondition) => (
              <option key={cardCondition} value={cardCondition}>
                {conditionLabels[cardCondition]}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Acabado</span>
          <select
            value={finish}
            onChange={(event) =>
              setFinish(event.target.value as MarketplaceListing['finish'])
            }
          >
            <option value="nonfoil">No foil</option>
            <option value="foil">Foil</option>
          </select>
        </label>
        <label className="form-field">
          <span>Operación</span>
          <select
            value={offerType}
            onChange={(event) =>
              setOfferType(
                event.target.value as MarketplaceListing['offerType'],
              )
            }
          >
            {offerTypes.map((type) => (
              <option key={type} value={type}>
                {offerTypeLabels[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Precio opcional (€)</span>
          <input
            min={0}
            step="0.01"
            type="number"
            value={priceEur}
            onChange={(event) => setPriceEur(event.target.value)}
          />
        </label>
      </div>

      <div className="composer-actions">
        <button className="secondary-button" type="button" onClick={onClose}>
          Cancelar
        </button>
        <button className="primary-button" type="submit">
          Publicar oferta
        </button>
      </div>
    </form>
  )
}

function WantedImportComposer({
  data,
  memberId,
  onClose,
  onDataChange,
  onImported,
}: {
  data: DemoDataSet
  memberId: string
  onClose: () => void
  onDataChange: (updater: DemoDataUpdater) => void
  onImported: (result: WantedImportResult) => void
}) {
  const [rawList, setRawList] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = importWantedCards(data, memberId, rawList)
    onDataChange(result.data)
    onImported(result)
  }

  return (
    <form
      className="card-composer"
      aria-label="Importar lista de búsquedas"
      onSubmit={handleSubmit}
    >
      <ComposerHeading title="Importar una lista" onClose={onClose} />

      <label className="form-field">
        <span>Una carta por línea</span>
        <textarea
          required
          rows={7}
          placeholder={'2x Sol Ring\nRhystic Study\nEsper Sentinel x3'}
          value={rawList}
          onChange={(event) => setRawList(event.target.value)}
        />
      </label>

      <p className="import-help">
        El prototipo reconoce nombres exactos del catálogo de demostración. Las
        búsquedas importadas aceptan español o inglés y acabado no foil.
      </p>

      <div className="composer-actions">
        <button className="secondary-button" type="button" onClick={onClose}>
          Cancelar
        </button>
        <button className="primary-button" type="submit">
          Importar búsquedas
        </button>
      </div>
    </form>
  )
}

export function CardsPage({
  data,
  currentMember,
  onDataChange,
}: CardsPageProps) {
  const [activeView, setActiveView] = useState<'matches' | 'market' | 'wanted'>(
    'matches',
  )
  const [activeComposer, setActiveComposer] = useState<
    'listing' | 'import' | undefined
  >()
  const [selectedMatchId, setSelectedMatchId] = useState<string>()
  const [matchGrouping, setMatchGrouping] = useState<MatchGrouping>('card')
  const [marketPage, setMarketPage] = useState(1)
  const [selectedMarketplaceMemberId, setSelectedMarketplaceMemberId] =
    useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [query, setQuery] = useState('')
  const listings = getMarketplaceListings(data)
  const wantedCards = getMemberWantedCards(data, currentMember.id)
  const memberListings = getMemberMarketplaceListings(data, currentMember.id)
  const matches = getMemberCardMatches(data, currentMember.id)
  const groupedMatches = groupCardMatches(matches, matchGrouping)
  const selectedMatch = matches.find(
    ({ match }) => match.id === selectedMatchId,
  )
  const selectedDeal = selectedMatchId
    ? data.cardDeals.find(({ matchId }) => matchId === selectedMatchId)
    : undefined
  const normalizedQuery = query.trim().toLocaleLowerCase('es')
  const selectedMarketplaceMember = data.members.find(
    ({ id }) => id === selectedMarketplaceMemberId,
  )
  const filteredListings = useMemo(
    () =>
      listings.filter(
        ({ card, member }) =>
          (!selectedMarketplaceMemberId ||
            member.id === selectedMarketplaceMemberId) &&
          (!normalizedQuery ||
            card.name.toLocaleLowerCase('es').includes(normalizedQuery) ||
            card.setName.toLocaleLowerCase('es').includes(normalizedQuery) ||
            member.displayName
              .toLocaleLowerCase('es')
              .includes(normalizedQuery)),
      ),
    [listings, normalizedQuery, selectedMarketplaceMemberId],
  )
  const marketPageCount = Math.max(
    1,
    Math.ceil(filteredListings.length / MARKET_PAGE_SIZE),
  )
  const activeMarketPage = Math.min(marketPage, marketPageCount)
  const marketPageStart = (activeMarketPage - 1) * MARKET_PAGE_SIZE
  const visibleListings = filteredListings.slice(
    marketPageStart,
    marketPageStart + MARKET_PAGE_SIZE,
  )

  if (selectedMatch) {
    return (
      <MatchDetail
        deal={selectedDeal}
        item={selectedMatch}
        onBack={() => setSelectedMatchId(undefined)}
        onComplete={(type) =>
          onDataChange((currentData) =>
            completeCardDeal(
              currentData,
              selectedMatch.match.id,
              currentMember.id,
              type,
            ),
          )
        }
      />
    )
  }

  return (
    <div className="page">
      <header className="page-heading">
        <span className="page-eyebrow">
          <Layers3 aria-hidden="true" size={14} />
          Mercado de la comunidad
        </span>
        <h1>Cartas</h1>
        <p>
          Encuentra ofertas persistentes y consulta las cartas que estás
          buscando, sin rebuscar entre fotos y mensajes antiguos.
        </p>
      </header>

      <div className="card-view-tabs" aria-label="Secciones de cartas">
        <button
          type="button"
          aria-pressed={activeView === 'matches'}
          onClick={() => setActiveView('matches')}
        >
          <Sparkles aria-hidden="true" size={17} />
          Coincidencias
          <span>{matches.length}</span>
        </button>
        <button
          type="button"
          aria-pressed={activeView === 'market'}
          onClick={() => setActiveView('market')}
        >
          <ShoppingBag aria-hidden="true" size={17} />
          Ofertas
          <span>{listings.length}</span>
        </button>
        <button
          type="button"
          aria-pressed={activeView === 'wanted'}
          onClick={() => setActiveView('wanted')}
        >
          <ListChecks aria-hidden="true" size={17} />
          Mis listas
          <span>{wantedCards.length + memberListings.length}</span>
        </button>
      </div>

      <div className="card-actions">
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            setActionMessage('')
            setActiveComposer('listing')
          }}
        >
          <Plus aria-hidden="true" size={16} />
          Publicar carta
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            setActionMessage('')
            setActiveComposer('import')
          }}
        >
          <Upload aria-hidden="true" size={16} />
          Importar lista
        </button>
      </div>

      {activeComposer === 'listing' ? (
        <ListingComposer
          data={data}
          memberId={currentMember.id}
          onClose={() => setActiveComposer(undefined)}
          onDataChange={onDataChange}
          onPublished={() => {
            setActiveComposer(undefined)
            setActiveView('market')
            setActionMessage('Tu carta ya aparece en las ofertas.')
          }}
        />
      ) : activeComposer === 'import' ? (
        <WantedImportComposer
          data={data}
          memberId={currentMember.id}
          onClose={() => setActiveComposer(undefined)}
          onDataChange={onDataChange}
          onImported={(result) => {
            setActiveComposer(undefined)
            setActiveView('wanted')
            setActionMessage(
              result.imported.length > 0
                ? `${result.imported.length} búsquedas importadas.${
                    result.unknownLines.length > 0
                      ? ` No reconocidas: ${result.unknownLines.join(', ')}.`
                      : ''
                  }`
                : 'No se ha reconocido ninguna carta.',
            )
          }}
        />
      ) : null}

      <p className="action-message card-action-message" aria-live="polite">
        {actionMessage}
      </p>

      {activeView === 'matches' ? (
        <section className="cards-section" aria-labelledby="matches-title">
          <div className="section-heading">
            <div>
              <span>Cruce automático</span>
              <h2 id="matches-title">Tus coincidencias</h2>
            </div>
            <p>{matches.length} ofertas compatibles</p>
          </div>

          <div className="match-grouping-control">
            <span>Organizar</span>
            <div role="group" aria-label="Organizar coincidencias">
              <button
                type="button"
                aria-pressed={matchGrouping === 'card'}
                onClick={() => setMatchGrouping('card')}
              >
                Por carta
              </button>
              <button
                type="button"
                aria-pressed={matchGrouping === 'member'}
                onClick={() => setMatchGrouping('member')}
              >
                Por miembro
              </button>
            </div>
          </div>

          <div className="match-group-grid">
            {matches.length > 0 ? (
              groupedMatches.map((items) => (
                <MatchGroupCard
                  items={items}
                  grouping={matchGrouping}
                  key={
                    matchGrouping === 'card'
                      ? items[0]?.card.id
                      : items[0]?.seller.id
                  }
                  onSelect={(matchId) => {
                    setSelectedMatchId(matchId)
                    onDataChange((currentData) =>
                      markCardMatchSeen(currentData, matchId, currentMember.id),
                    )
                  }}
                />
              ))
            ) : (
              <p className="filtered-empty-state">
                Aún no hay ofertas compatibles con tus búsquedas.
              </p>
            )}
          </div>
        </section>
      ) : activeView === 'market' ? (
        <section className="cards-section" aria-labelledby="market-title">
          <div className="section-heading">
            <div>
              <span>Comunidad</span>
              <h2 id="market-title">Cartas disponibles</h2>
            </div>
            <p>{filteredListings.length} resultados</p>
          </div>

          <label className="card-search">
            <Search aria-hidden="true" size={17} />
            <span className="visually-hidden">Buscar una carta o miembro</span>
            <input
              type="search"
              placeholder="Buscar carta, edición o miembro"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setMarketPage(1)
              }}
            />
          </label>

          {selectedMarketplaceMember ? (
            <div className="market-member-filter" role="status">
              <span>
                Cartas disponibles de{' '}
                <strong>{selectedMarketplaceMember.displayName}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedMarketplaceMemberId('')
                  setMarketPage(1)
                }}
              >
                Ver todos
              </button>
            </div>
          ) : null}

          {visibleListings.length > 0 ? (
            <MarketplaceTable
              items={visibleListings}
              onMemberSelect={(memberId) => {
                setSelectedMarketplaceMemberId(memberId)
                setMarketPage(1)
              }}
            />
          ) : (
            <p className="filtered-empty-state">
              No hay ofertas que coincidan con esta búsqueda.
            </p>
          )}

          {filteredListings.length > 0 ? (
            <nav className="market-pagination" aria-label="Páginas de ofertas">
              <p>
                {marketPageStart + 1}–
                {Math.min(
                  marketPageStart + MARKET_PAGE_SIZE,
                  filteredListings.length,
                )}{' '}
                de {filteredListings.length}
              </p>
              {marketPageCount > 1 ? (
                <div>
                  <button
                    type="button"
                    disabled={activeMarketPage === 1}
                    onClick={() => setMarketPage(activeMarketPage - 1)}
                  >
                    Anterior
                  </button>
                  <span>
                    {activeMarketPage}/{marketPageCount}
                  </span>
                  <button
                    type="button"
                    disabled={activeMarketPage === marketPageCount}
                    onClick={() => setMarketPage(activeMarketPage + 1)}
                  >
                    Siguiente
                  </button>
                </div>
              ) : null}
            </nav>
          ) : null}
        </section>
      ) : (
        <section className="cards-section" aria-labelledby="wanted-title">
          <div className="section-heading">
            <div>
              <span>Tus anuncios</span>
              <h2>Mis ofertas</h2>
            </div>
            <p>{memberListings.length} publicadas</p>
          </div>

          {memberListings.length > 0 ? (
            <div className="member-listing-list">
              {memberListings.map((item) => (
                <MemberListingRow
                  item={item}
                  key={item.listing.id}
                  onStatusChange={(status) => {
                    onDataChange((currentData) =>
                      updateMarketplaceListingStatus(
                        currentData,
                        item.listing.id,
                        currentMember.id,
                        status,
                      ),
                    )
                    setActionMessage(
                      status === 'reserved'
                        ? 'La oferta está reservada.'
                        : status === 'available'
                          ? 'La oferta vuelve a estar disponible.'
                          : 'La oferta se ha cerrado.',
                    )
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="filtered-empty-state">
              Todavía no has publicado ninguna oferta.
            </p>
          )}

          <div className="section-heading">
            <div>
              <span>Tu lista</span>
              <h2 id="wanted-title">Cartas buscadas</h2>
            </div>
            <p>{wantedCards.length} activas</p>
          </div>

          <div className="wanted-list">
            {wantedCards.map((item) => (
              <WantedCardRow
                item={item}
                key={item.wantedCard.id}
                onStatusChange={(status) => {
                  onDataChange((currentData) =>
                    updateWantedCardStatus(
                      currentData,
                      item.wantedCard.id,
                      currentMember.id,
                      status,
                    ),
                  )
                  setActionMessage(
                    status === 'paused'
                      ? 'La búsqueda está en pausa.'
                      : status === 'active'
                        ? 'La búsqueda vuelve a estar activa.'
                        : 'La carta se ha marcado como encontrada.',
                  )
                }}
              />
            ))}
          </div>

          <p className="cards-privacy-note">
            <UserRound aria-hidden="true" size={15} />
            Solo los miembros validados de CRC Delorean pueden consultar estas
            listas.
          </p>
        </section>
      )}
    </div>
  )
}
