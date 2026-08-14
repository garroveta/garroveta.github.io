import {
  ArrowLeft,
  Copy,
  Search,
  Share2,
  SlidersHorizontal,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { CardImagePreview } from '../components/CardImagePreview'
import { MarketplaceCatalog } from '../components/MarketplaceCatalog'
import { MarketplaceReservationSheet } from '../components/MarketplaceReservationSheet'
import {
  cardConditionLabels as conditionLabels,
  cardLanguageLabels as languageLabels,
} from '../data/cardPresentation'
import { getMemberSharedListings } from '../data/cardSelectors'
import type { DemoDataUpdater } from '../data/demoRepository'
import type { Card, CommunityMember, DemoDataSet } from '../domain/types'
import { useMarketplaceReservation } from '../hooks/useMarketplaceReservation'

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
  const [selectedCardPreview, setSelectedCardPreview] = useState<{
    card: Card
    description: string
  }>()
  const reservation = useMarketplaceReservation({
    cancellationMessageStyle: 'named',
    currentMember,
    data,
    onDataChange,
    onMessage: setMessage,
  })
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

      <MarketplaceCatalog
        ariaLabel={`Cartas disponibles de ${seller.displayName}`}
        currentMemberId={currentMember.id}
        emptyMessage="Ninguna carta coincide con estos filtros."
        galleryAriaLabel={`Galería de cartas de ${seller.displayName}`}
        items={filteredListings}
        ownerMode="status"
        onOpen={reservation.openReservation}
        onPreview={(item) =>
          setSelectedCardPreview({
            card: item.card,
            description: `${item.card.setName} · Disponible por ${seller.displayName}`,
          })
        }
        paginationAriaLabel={`Páginas de cartas de ${seller.displayName}`}
        viewAriaLabel="Vista de las cartas del miembro"
      />

      {reservation.selectedItem ? (
        <MarketplaceReservationSheet
          key={reservation.selectedItem.listing.id}
          item={reservation.selectedItem}
          currentMember={currentMember}
          onClose={reservation.closeReservation}
          onReserve={reservation.reserveSelected}
          onCancelReservation={reservation.cancelSelected}
        />
      ) : null}
      {selectedCardPreview ? (
        <CardImagePreview
          card={selectedCardPreview.card}
          description={selectedCardPreview.description}
          onClose={() => setSelectedCardPreview(undefined)}
        />
      ) : null}
    </div>
  )
}
