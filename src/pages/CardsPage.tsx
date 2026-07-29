import {
  Layers3,
  ListChecks,
  Search,
  ShoppingBag,
  UserRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  getMarketplaceListings,
  getMemberWantedCards,
  type MarketplaceListingItem,
  type WantedCardItem,
} from '../data/cardSelectors'
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

export function CardsPage({ data, currentMember }: CardsPageProps) {
  const [activeView, setActiveView] = useState<'market' | 'wanted'>('market')
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
