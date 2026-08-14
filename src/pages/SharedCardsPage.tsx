import {
  ArrowLeft,
  Copy,
  LayoutGrid,
  Search,
  Share2,
  SlidersHorizontal,
  Table2,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { CardImagePreview } from '../components/CardImagePreview'
import { MarketplaceListingAction } from '../components/MarketplaceListingAction'
import { MarketplaceListingGallery } from '../components/MarketplaceListingGallery'
import { MarketplaceListingTable } from '../components/MarketplaceListingTable'
import { MarketplaceReservationSheet } from '../components/MarketplaceReservationSheet'
import {
  cancelMarketplaceReservation,
  reserveMarketplaceListing,
} from '../data/cardLifecycle'
import {
  cardConditionLabels as conditionLabels,
  cardLanguageLabels as languageLabels,
} from '../data/cardPresentation'
import { getMemberSharedListings } from '../data/cardSelectors'
import type { DemoDataUpdater } from '../data/demoRepository'
import type { Card, CommunityMember, DemoDataSet } from '../domain/types'

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
  const [display, setDisplay] = useState<'table' | 'gallery'>('table')
  const [galleryColumns, setGalleryColumns] = useState<2 | 4>(2)
  const [message, setMessage] = useState('')
  const [selectedListingId, setSelectedListingId] = useState<string>()
  const [selectedCardPreview, setSelectedCardPreview] = useState<{
    card: Card
    description: string
  }>()
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

      <div
        className="market-display-switch"
        role="group"
        aria-label="Vista de las cartas del miembro"
      >
        <button
          type="button"
          aria-pressed={display === 'table'}
          onClick={() => setDisplay('table')}
        >
          <Table2 aria-hidden="true" size={16} />
          Tabla
        </button>
        <button
          type="button"
          aria-pressed={display === 'gallery'}
          onClick={() => setDisplay('gallery')}
        >
          <LayoutGrid aria-hidden="true" size={16} />
          Imágenes
        </button>
      </div>

      {display === 'gallery' ? (
        <div
          className="market-gallery-density"
          role="group"
          aria-label="Cartas por línea"
        >
          <span>Densidad</span>
          <button
            type="button"
            aria-pressed={galleryColumns === 2}
            onClick={() => setGalleryColumns(2)}
          >
            2 por fila
          </button>
          <button
            type="button"
            aria-pressed={galleryColumns === 4}
            onClick={() => setGalleryColumns(4)}
          >
            4 por fila
          </button>
        </div>
      ) : null}

      {filteredListings.length > 0 ? (
        display === 'table' ? (
          <MarketplaceListingTable
            ariaLabel={`Cartas disponibles de ${seller.displayName}`}
            items={filteredListings}
            onPreview={(item) =>
              setSelectedCardPreview({
                card: item.card,
                description: `${item.card.setName} · Disponible por ${seller.displayName}`,
              })
            }
            renderAction={(item) => (
              <MarketplaceListingAction
                currentMemberId={currentMember.id}
                item={item}
                ownerMode="status"
                onOpen={() => setSelectedListingId(item.listing.id)}
              />
            )}
          />
        ) : (
          <MarketplaceListingGallery
            ariaLabel={`Galería de cartas de ${seller.displayName}`}
            columns={galleryColumns}
            currentMemberId={currentMember.id}
            items={filteredListings}
            ownerMode="status"
            onOpen={(item) => setSelectedListingId(item.listing.id)}
            onPreview={(item) =>
              setSelectedCardPreview({
                card: item.card,
                description: `${item.card.setName} · Disponible por ${seller.displayName}`,
              })
            }
          />
        )
      ) : null}

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
