import { LayoutGrid, Table2 } from 'lucide-react'
import { useState } from 'react'

import type { MarketplaceListingItem } from '../data/cardSelectors'
import { MarketplaceListingGallery } from './MarketplaceListingGallery'
import { MarketplaceListingTable } from './MarketplaceListingTable'

const TABLE_PAGE_SIZE = 20
const GALLERY_PAGE_SIZES = {
  2: 12,
  4: 20,
} as const

type MarketplaceCatalogProps = {
  ariaLabel: string
  currentMemberId: string
  emptyMessage: string
  galleryAriaLabel: string
  items: MarketplaceListingItem[]
  onMemberSelect?: (memberId: string) => void
  onOpen: (item: MarketplaceListingItem) => void
  onPreview: (item: MarketplaceListingItem) => void
  ownerMode?: 'open' | 'status'
  paginationAriaLabel: string
  viewAriaLabel: string
}

export function MarketplaceCatalog({
  ariaLabel,
  currentMemberId,
  emptyMessage,
  galleryAriaLabel,
  items,
  onMemberSelect,
  onOpen,
  onPreview,
  ownerMode,
  paginationAriaLabel,
  viewAriaLabel,
}: MarketplaceCatalogProps) {
  const [display, setDisplay] = useState<'table' | 'gallery'>('table')
  const [galleryColumns, setGalleryColumns] = useState<2 | 4>(2)
  const [page, setPage] = useState(1)
  const pageSize =
    display === 'table' ? TABLE_PAGE_SIZE : GALLERY_PAGE_SIZES[galleryColumns]
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const activePage = Math.min(page, pageCount)
  const pageStart = (activePage - 1) * pageSize
  const visibleItems = items.slice(pageStart, pageStart + pageSize)

  return (
    <>
      <div
        className="market-display-switch"
        role="group"
        aria-label={viewAriaLabel}
      >
        <button
          type="button"
          aria-pressed={display === 'table'}
          onClick={() => {
            setDisplay('table')
            setPage(1)
          }}
        >
          <Table2 aria-hidden="true" size={16} />
          Tabla
        </button>
        <button
          type="button"
          aria-pressed={display === 'gallery'}
          onClick={() => {
            setDisplay('gallery')
            setPage(1)
          }}
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
            onClick={() => {
              setGalleryColumns(2)
              setPage(1)
            }}
          >
            2 por fila
          </button>
          <button
            type="button"
            aria-pressed={galleryColumns === 4}
            onClick={() => {
              setGalleryColumns(4)
              setPage(1)
            }}
          >
            4 por fila
          </button>
        </div>
      ) : null}

      {visibleItems.length > 0 ? (
        display === 'table' ? (
          <MarketplaceListingTable
            ariaLabel={ariaLabel}
            items={visibleItems}
            onMemberSelect={onMemberSelect}
            onOpen={onOpen}
            onPreview={onPreview}
          />
        ) : (
          <MarketplaceListingGallery
            ariaLabel={galleryAriaLabel}
            columns={galleryColumns}
            currentMemberId={currentMemberId}
            items={visibleItems}
            ownerMode={ownerMode}
            onMemberSelect={onMemberSelect}
            onOpen={onOpen}
            onPreview={onPreview}
          />
        )
      ) : (
        <p className="filtered-empty-state">{emptyMessage}</p>
      )}

      {visibleItems.length > 0 ? (
        <p className="scryfall-credit">
          Imágenes de cartas proporcionadas por{' '}
          <a href="https://scryfall.com" target="_blank" rel="noreferrer">
            Scryfall
          </a>
          .
        </p>
      ) : null}

      {items.length > 0 ? (
        <nav className="market-pagination" aria-label={paginationAriaLabel}>
          <p>
            {pageStart + 1}–{Math.min(pageStart + pageSize, items.length)} de{' '}
            {items.length}
          </p>
          {pageCount > 1 ? (
            <div>
              <button
                type="button"
                disabled={activePage === 1}
                onClick={() => setPage(activePage - 1)}
              >
                Anterior
              </button>
              <span>
                {activePage}/{pageCount}
              </span>
              <button
                type="button"
                disabled={activePage === pageCount}
                onClick={() => setPage(activePage + 1)}
              >
                Siguiente
              </button>
            </div>
          ) : null}
        </nav>
      ) : null}
    </>
  )
}
