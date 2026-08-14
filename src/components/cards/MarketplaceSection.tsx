import { Search } from 'lucide-react'

import type { MarketplaceListingItem } from '../../data/cardSelectors'
import { MarketplaceCatalog } from '../MarketplaceCatalog'

type MarketplaceSectionProps = {
  currentMemberId: string
  hideOwnListings: boolean
  items: MarketplaceListingItem[]
  onHideOwnListingsChange: (hidden: boolean) => void
  onMemberSelect: (memberId: string) => void
  onOpen: (item: MarketplaceListingItem) => void
  onPreview: (item: MarketplaceListingItem) => void
  onQueryChange: (query: string) => void
  query: string
}

export function MarketplaceSection({
  currentMemberId,
  hideOwnListings,
  items,
  onHideOwnListingsChange,
  onMemberSelect,
  onOpen,
  onPreview,
  onQueryChange,
  query,
}: MarketplaceSectionProps) {
  return (
    <section className="cards-section" aria-labelledby="market-title">
      <div className="section-heading">
        <div>
          <span>Comunidad</span>
          <h2 id="market-title">Cartas disponibles</h2>
        </div>
        <p>{items.length} resultados</p>
      </div>

      <label className="card-search">
        <Search aria-hidden="true" size={17} />
        <span className="visually-hidden">Buscar una carta o miembro</span>
        <input
          type="search"
          placeholder="Buscar carta, edición o miembro"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>

      <label className="market-own-listings-filter">
        <input
          checked={hideOwnListings}
          type="checkbox"
          onChange={(event) => onHideOwnListingsChange(event.target.checked)}
        />
        Ocultar mis cartas
      </label>

      <MarketplaceCatalog
        ariaLabel="Ofertas de cartas disponibles"
        currentMemberId={currentMemberId}
        emptyMessage="No hay ofertas que coincidan con esta búsqueda."
        galleryAriaLabel="Galería de ofertas"
        items={items}
        onOpen={onOpen}
        onMemberSelect={onMemberSelect}
        onPreview={onPreview}
        paginationAriaLabel="Páginas de ofertas"
        viewAriaLabel="Vista de ofertas"
      />
    </section>
  )
}
