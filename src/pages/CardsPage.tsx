import {
  Layers3,
  ListChecks,
  Plus,
  Search,
  ShoppingBag,
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
import {
  getMarketplaceListings,
  getMemberWantedCards,
  type MarketplaceListingItem,
  type WantedCardItem,
} from '../data/cardSelectors'
import type { DemoDataUpdater } from '../data/demoRepository'
import type {
  CardCondition,
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

function MarketplaceCard({ item }: { item: MarketplaceListingItem }) {
  return (
    <article className="market-card">
      <div className="card-identity">
        <span aria-hidden="true">{item.card.setCode}</span>
        <div>
          <h3>{item.card.name}</h3>
          <p>
            {item.card.setName} · #{item.card.collectorNumber}
          </p>
        </div>
      </div>

      <div className="market-card__badges">
        <span>{offerTypeLabels[item.listing.offerType]}</span>
        {item.listing.finish === 'foil' ? <span>Foil</span> : null}
      </div>

      <dl className="market-card__facts">
        <div>
          <dt>Cantidad</dt>
          <dd>{item.listing.quantity}</dd>
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

      <footer>
        <span className="member-initials" aria-hidden="true">
          {item.member.initials}
        </span>
        <span>
          <small>Publicado por</small>
          <strong>{item.member.displayName}</strong>
        </span>
      </footer>
    </article>
  )
}

function WantedCardRow({ item }: { item: WantedCardItem }) {
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
    </article>
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
  const [activeView, setActiveView] = useState<'market' | 'wanted'>('market')
  const [activeComposer, setActiveComposer] = useState<
    'listing' | 'import' | undefined
  >()
  const [actionMessage, setActionMessage] = useState('')
  const [query, setQuery] = useState('')
  const listings = getMarketplaceListings(data)
  const wantedCards = getMemberWantedCards(data, currentMember.id)
  const normalizedQuery = query.trim().toLocaleLowerCase('es')
  const filteredListings = useMemo(
    () =>
      listings.filter(
        ({ card, member }) =>
          !normalizedQuery ||
          card.name.toLocaleLowerCase('es').includes(normalizedQuery) ||
          card.setName.toLocaleLowerCase('es').includes(normalizedQuery) ||
          member.displayName.toLocaleLowerCase('es').includes(normalizedQuery),
      ),
    [listings, normalizedQuery],
  )

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
          Mis búsquedas
          <span>{wantedCards.length}</span>
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

      {activeView === 'market' ? (
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
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className="market-grid">
            {filteredListings.map((item) => (
              <MarketplaceCard item={item} key={item.listing.id} />
            ))}
          </div>
        </section>
      ) : (
        <section className="cards-section" aria-labelledby="wanted-title">
          <div className="section-heading">
            <div>
              <span>Tu lista</span>
              <h2 id="wanted-title">Cartas buscadas</h2>
            </div>
            <p>{wantedCards.length} activas</p>
          </div>

          <div className="wanted-list">
            {wantedCards.map((item) => (
              <WantedCardRow item={item} key={item.wantedCard.id} />
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
