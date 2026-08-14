import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Search,
  Share2,
  ShoppingBag,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { MarketplaceReservationSheet } from '../components/MarketplaceReservationSheet'
import {
  cancelMarketplaceReservation,
  reserveMarketplaceListing,
} from '../data/cardLifecycle'
import { getMemberSharedListings } from '../data/cardSelectors'
import type { DemoDataUpdater } from '../data/demoRepository'
import { getScryfallCardImage } from '../data/scryfallImages'
import type {
  CardCondition,
  CardLanguage,
  CommunityMember,
  DemoDataSet,
} from '../domain/types'

type SharedCardsPageProps = {
  data: DemoDataSet
  currentMember: CommunityMember
  sellerId: string
  initialSetCode?: string
  initialLanguage?: string
  initialCondition?: string
  onBack: () => void
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

export function SharedCardsPage({
  data,
  currentMember,
  sellerId,
  initialSetCode = '',
  initialLanguage = '',
  initialCondition = '',
  onBack,
  onDataChange,
}: SharedCardsPageProps) {
  const seller = data.members.find(({ id }) => id === sellerId)
  const sharedListings = getMemberSharedListings(data, sellerId)
  const [query, setQuery] = useState('')
  const [setCode, setSetCode] = useState(initialSetCode)
  const [language, setLanguage] = useState(initialLanguage)
  const [condition, setCondition] = useState(initialCondition)
  const [message, setMessage] = useState('')
  const [selectedListingId, setSelectedListingId] = useState<string>()
  const setOptions = useMemo(
    () =>
      [
        ...new Map(
          sharedListings.map(({ card }) => [card.setCode, card.setName]),
        ),
      ].sort(([first], [second]) => first.localeCompare(second)),
    [sharedListings],
  )
  const normalizedQuery = query.trim().toLocaleLowerCase('es')
  const selectedListing = sharedListings.find(
    ({ listing }) => listing.id === selectedListingId,
  )
  const filteredListings = sharedListings.filter(
    ({ card, listing }) =>
      (!normalizedQuery ||
        card.name.toLocaleLowerCase('es').includes(normalizedQuery)) &&
      (!setCode || card.setCode === setCode) &&
      (!language || listing.language === language) &&
      (!condition || listing.condition === condition),
  )
  const filterParams = new URLSearchParams()

  if (setCode) filterParams.set('set', setCode)
  if (language) filterParams.set('lang', language)
  if (condition) filterParams.set('condition', condition)

  const shareUrl = `${window.location.origin}${window.location.pathname}#cartas?member=${sellerId}${filterParams.size ? `&${filterParams.toString()}` : ''}`

  if (!seller) {
    return (
      <div className="page shared-cards-page">
        <button className="back-button" type="button" onClick={onBack}>
          <ArrowLeft aria-hidden="true" size={18} /> Volver a las cartas
        </button>
        <p className="filtered-empty-state">Este miembro no está disponible.</p>
      </div>
    )
  }

  const isOwner = seller.id === currentMember.id

  return (
    <div className="page shared-cards-page">
      <button className="back-button" type="button" onClick={onBack}>
        <ArrowLeft aria-hidden="true" size={18} /> Volver a las cartas
      </button>

      <header className="shared-cards-header">
        <span className="member-initials" aria-hidden="true">
          {seller.initials}
        </span>
        <div>
          <span>{isOwner ? 'Tu página compartida' : 'Cartas disponibles'}</span>
          <h1>{seller.displayName}</h1>
          <p>{sharedListings.length} cartas publicadas en Garroveta</p>
        </div>
      </header>

      <section
        className="shared-card-filters"
        aria-label="Filtros de la página compartida"
      >
        <div className="shared-card-filters__heading">
          <SlidersHorizontal aria-hidden="true" size={16} />
          <strong>Filtrar las cartas</strong>
        </div>
        <label className="card-search">
          <Search aria-hidden="true" size={17} />
          <span className="visually-hidden">Buscar una carta</span>
          <input
            type="search"
            placeholder="Buscar una carta"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="shared-card-filter-grid">
          <label>
            <span>Edición</span>
            <select
              aria-label="Edición"
              value={setCode}
              onChange={(event) => setSetCode(event.target.value)}
            >
              <option value="">Todas</option>
              {setOptions.map(([code, name]) => (
                <option key={code} value={code}>
                  {code} · {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Idioma</span>
            <select
              aria-label="Idioma de la página compartida"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              <option value="">Todos</option>
              {Object.entries(languageLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Estado</span>
            <select
              aria-label="Estado de la página compartida"
              value={condition}
              onChange={(event) => setCondition(event.target.value)}
            >
              <option value="">Todos</option>
              {Object.entries(conditionLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isOwner ? (
          <div className="share-page-action">
            <Share2 aria-hidden="true" size={17} />
            <span>
              <strong>Compartir esta selección</strong>
              <small>El enlace conserva los filtros activos.</small>
            </span>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard?.writeText(shareUrl)
                setMessage('Enlace copiado.')
              }}
            >
              <Copy aria-hidden="true" size={14} /> Copiar enlace
            </button>
          </div>
        ) : null}
      </section>

      <p className="action-message" aria-live="polite">
        {message}
      </p>

      <div className="shared-cards-heading">
        <h2>Cartas</h2>
        <span>{filteredListings.length} resultados</span>
      </div>

      <div className="shared-card-list">
        {filteredListings.map(({ card, listing }) => {
          const reservedByCurrentMember =
            listing.reservedByMemberId === currentMember.id
          const imageUrl = getScryfallCardImage(card.name, card.imageUri)

          return (
            <article className="shared-card-row" key={listing.id}>
              {imageUrl ? (
                <img src={imageUrl} alt="" loading="lazy" />
              ) : (
                <span className="card-set-symbol">{card.setCode}</span>
              )}
              <div className="shared-card-row__body">
                <h3>{card.name}</h3>
                <p>
                  {card.setName} · {card.setCode} #{card.collectorNumber}
                </p>
                <dl className="shared-card-row__facts">
                  <div>
                    <dt>Cantidad</dt>
                    <dd>{listing.quantity}</dd>
                  </div>
                  <div>
                    <dt>Precio</dt>
                    <dd>
                      {listing.priceEur
                        ? `${listing.priceEur.toFixed(2)} €`
                        : 'A convenir'}
                    </dd>
                  </div>
                  <div>
                    <dt>Idioma</dt>
                    <dd>{languageLabels[listing.language]}</dd>
                  </div>
                  <div>
                    <dt>Estado</dt>
                    <dd>{conditionLabels[listing.condition]}</dd>
                  </div>
                </dl>
              </div>
              <div className="shared-card-row__actions">
                {isOwner ? (
                  <span
                    className={`listing-status listing-status--${listing.status}`}
                  >
                    {listing.status === 'reserved' ? 'Reservada' : 'Disponible'}
                  </span>
                ) : listing.status === 'available' ? (
                  <button
                    aria-label="Reservar"
                    className="shared-card-reserve"
                    title="Reservar"
                    type="button"
                    onClick={() => setSelectedListingId(listing.id)}
                  >
                    <ShoppingBag aria-hidden="true" size={14} />
                  </button>
                ) : reservedByCurrentMember ? (
                  <button
                    aria-label="Cancelar reserva"
                    className="shared-card-cancel"
                    title="Cancelar reserva"
                    type="button"
                    onClick={() => setSelectedListingId(listing.id)}
                  >
                    <X aria-hidden="true" size={14} />
                  </button>
                ) : (
                  <span className="shared-card-reserved">
                    <CheckCircle2 aria-hidden="true" size={14} />
                    Reservada
                  </span>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {filteredListings.length === 0 ? (
        <p className="filtered-empty-state">
          Ninguna carta coincide con estos filtros.
        </p>
      ) : null}

      {selectedListing ? (
        <MarketplaceReservationSheet
          key={selectedListing.listing.id}
          item={selectedListing}
          currentMember={currentMember}
          onClose={() => setSelectedListingId(undefined)}
          onReserve={(quantity) => {
            onDataChange((currentData) =>
              reserveMarketplaceListing(
                currentData,
                selectedListing.listing.id,
                currentMember.id,
                undefined,
                quantity,
              ),
            )
            setMessage(
              `${quantity} ${quantity > 1 ? 'cartas reservadas' : 'carta reservada'} a tu nombre.`,
            )
          }}
          onCancelReservation={(quantity) => {
            const remainingQuantity =
              (selectedListing.listing.reservedQuantity ?? 1) - quantity
            onDataChange((currentData) =>
              cancelMarketplaceReservation(
                currentData,
                selectedListing.listing.id,
                currentMember.id,
                quantity,
              ),
            )
            setMessage(
              remainingQuantity > 0
                ? `Queda ${remainingQuantity} ${remainingQuantity > 1 ? 'cartas reservadas' : 'carta reservada'} de ${selectedListing.card.name}.`
                : `La reserva de ${selectedListing.card.name} se ha cancelado.`,
            )
          }}
        />
      ) : null}
    </div>
  )
}
