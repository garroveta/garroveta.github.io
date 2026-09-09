import {
  AlertCircle,
  ArrowLeft,
  Check,
  Lock,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react'
import { useId, useState } from 'react'

import {
  cardConditionLabels,
  cardLanguageLabels,
  formatMarketplacePrice,
} from '../../data/cardPresentation'
import type {
  MarketplaceSyncConflict,
  MarketplaceSyncConflictChoice,
  MarketplaceSyncLine,
  MarketplaceSyncPlan,
} from '../../data/cardSync'
import type { Card, MarketplaceListing } from '../../domain/types'
import { QuantityField } from '../QuantityField'

const VISIBLE_ROWS = 8

const protectionLabels: Record<string, string> = {
  reserved: 'Reservada por otro miembro',
  completed: 'Ya vendida',
  unresolved_line: 'La línea del archivo no se ha reconocido',
}

function variantLabel(
  language: MarketplaceListing['language'],
  condition: MarketplaceListing['condition'],
  finish: MarketplaceListing['finish'],
) {
  return `${cardLanguageLabels[language]} · ${cardConditionLabels[condition]} · ${
    finish === 'foil' ? 'Foil' : 'No foil'
  }`
}

function cardNameOf(cards: Card[], listing: MarketplaceListing) {
  return cards.find(({ id }) => id === listing.cardId)?.name ?? 'Carta'
}

function SyncGroup({
  icon,
  rows,
  title,
}: {
  icon: React.ReactNode
  rows: Array<{ key: string; name: string; detail: string }>
  title: string
}) {
  const listId = useId()
  const [isExpanded, setIsExpanded] = useState(false)

  if (rows.length === 0) {
    return null
  }

  const hiddenCount = rows.length - VISIBLE_ROWS
  const visibleRows = isExpanded ? rows : rows.slice(0, VISIBLE_ROWS)

  return (
    <section className="sync-group" aria-label={`${title}: ${rows.length}`}>
      <h4>
        {icon}
        {title} <span>{rows.length}</span>
      </h4>
      <ul className={isExpanded ? 'is-expanded' : undefined} id={listId}>
        {visibleRows.map(({ key, name, detail }) => (
          <li key={key}>
            <strong>{name}</strong>
            <small>{detail}</small>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 ? (
        <button
          aria-controls={listId}
          aria-expanded={isExpanded}
          className="sync-group__more"
          type="button"
          onClick={() => setIsExpanded((expanded) => !expanded)}
        >
          {isExpanded ? 'Ver menos' : `Ver las ${hiddenCount} restantes`}
        </button>
      ) : null}
    </section>
  )
}

function ConflictRow({
  conflict,
  onResolve,
}: {
  conflict: MarketplaceSyncConflict
  onResolve: (choice: MarketplaceSyncConflictChoice) => void
}) {
  const { line, listings, reason } = conflict
  const [listingId, setListingId] = useState(listings[0]?.id ?? '')
  const [quantity, setQuantity] = useState(line.quantity)
  const [price, setPrice] = useState(line.priceEur?.toString() ?? '')

  return (
    <article className="sync-conflict">
      <header>
        <strong>{line.cardName}</strong>
        <small>
          {variantLabel(line.language, line.condition, line.finish)}
        </small>
        <p>
          {reason === 'duplicate_listings'
            ? `Tienes ${listings.length} ofertas que corresponden a esta línea. Elige cuál conservar: las demás se retirarán.`
            : `El archivo indica varios precios para esta carta (${line.candidatePrices
                .map((candidate) => formatMarketplacePrice(candidate))
                .join(', ')}). Confirma cuál se aplica.`}
        </p>
      </header>

      {listings.length > 0 ? (
        <fieldset className="sync-conflict__choices">
          <legend>Oferta que se conserva</legend>
          {listings.map((listing) => (
            <label key={listing.id}>
              <input
                checked={listingId === listing.id}
                name={`sync-conflict-${line.key}`}
                type="radio"
                value={listing.id}
                onChange={() => setListingId(listing.id)}
              />
              <span>
                {listing.quantity}{' '}
                {listing.quantity > 1 ? 'unidades' : 'unidad'} ·{' '}
                {formatMarketplacePrice(listing.priceEur)}
                {listing.status === 'withdrawn' ? ' · retirada' : ''}
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}

      <div className="sync-conflict__fields">
        <label>
          <span>Cantidad</span>
          <QuantityField
            ariaLabel={`Cantidad conservada de ${line.cardName}`}
            value={quantity}
            onChange={setQuantity}
          />
        </label>
        <label>
          <span>Precio €</span>
          <input
            aria-label={`Precio conservado de ${line.cardName}`}
            min={0}
            step="0.01"
            type="number"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </label>
      </div>

      <div className="sync-conflict__actions">
        <button
          className="secondary-button"
          type="button"
          onClick={() => onResolve({ kind: 'skip' })}
        >
          No tocar nada
        </button>
        <button
          className="primary-button"
          type="button"
          onClick={() =>
            onResolve({
              kind: 'apply',
              listingId: listingId || undefined,
              quantity,
              priceEur: price ? Number(price) : undefined,
            })
          }
        >
          <Check aria-hidden="true" size={15} /> Confirmar
        </button>
      </div>
    </article>
  )
}

export type MarketplaceSyncPreviewProps = {
  cards: Card[]
  isApplying?: boolean
  listName: string
  plan: MarketplaceSyncPlan
  onApply: () => void
  onBack: () => void
  onResolveAll: (kind: 'keep_first' | 'skip') => void
  onResolveConflict: (
    lineKey: string,
    choice: MarketplaceSyncConflictChoice,
  ) => void
}

export function MarketplaceSyncPreview({
  cards,
  isApplying = false,
  listName,
  plan,
  onApply,
  onBack,
  onResolveAll,
  onResolveConflict,
}: MarketplaceSyncPreviewProps) {
  const hasConflicts = plan.conflicts.length > 0
  const changeCount =
    plan.added.length + plan.updated.length + plan.withdrawn.length
  const lineDetail = (line: MarketplaceSyncLine) =>
    `${line.quantity} × ${variantLabel(line.language, line.condition, line.finish)} · ${formatMarketplacePrice(line.priceEur)}`

  return (
    <div className="sync-preview" aria-label="Cambios de la sincronización">
      <div className="sync-preview__heading">
        <h3>Cambios en «{listName}»</h3>
        <p>
          {changeCount === 0
            ? 'Nada que cambiar: tu lista ya coincide con el archivo.'
            : `${changeCount} ${changeCount > 1 ? 'cambios' : 'cambio'} · ${plan.unchanged} sin cambios`}
        </p>
      </div>

      {hasConflicts ? (
        <section
          className="sync-conflicts"
          aria-label="Conflictos por resolver"
        >
          <div className="sync-conflicts__heading">
            <h4>
              <AlertCircle aria-hidden="true" size={16} />
              {plan.conflicts.length}{' '}
              {plan.conflicts.length > 1
                ? 'conflictos por resolver'
                : 'conflicto por resolver'}
            </h4>
            <p>
              No se puede aplicar nada mientras queden conflictos sin confirmar.
            </p>
          </div>
          <div className="sync-conflicts__bulk">
            <button type="button" onClick={() => onResolveAll('keep_first')}>
              Conservar la primera y retirar las demás
            </button>
            <button type="button" onClick={() => onResolveAll('skip')}>
              No tocar ninguna
            </button>
          </div>
          {plan.conflicts.map((conflict) => (
            <ConflictRow
              conflict={conflict}
              key={conflict.line.key}
              onResolve={(choice) =>
                onResolveConflict(conflict.line.key, choice)
              }
            />
          ))}
        </section>
      ) : null}

      <SyncGroup
        icon={<Plus aria-hidden="true" size={15} />}
        title="Se publican"
        rows={plan.added.map((line) => ({
          key: line.key,
          name: line.cardName,
          detail: lineDetail(line),
        }))}
      />

      <SyncGroup
        icon={<RefreshCw aria-hidden="true" size={15} />}
        title="Se actualizan"
        rows={plan.updated.map((update) => ({
          key: update.listing.id,
          name: update.line.cardName,
          detail: [
            update.republished ? 'Se vuelve a publicar' : undefined,
            update.quantity
              ? `Cantidad ${update.quantity.from} → ${update.quantity.to}`
              : undefined,
            update.price
              ? `Precio ${formatMarketplacePrice(update.price.from)} → ${formatMarketplacePrice(update.price.to)}`
              : undefined,
          ]
            .filter(Boolean)
            .join(' · '),
        }))}
      />

      <SyncGroup
        icon={<X aria-hidden="true" size={15} />}
        title="Se retiran"
        rows={plan.withdrawn.map((listing) => ({
          key: listing.id,
          name: cardNameOf(cards, listing),
          detail: `${listing.quantity} × ${variantLabel(listing.language, listing.condition, listing.finish)} · ya no está en el archivo`,
        }))}
      />

      <SyncGroup
        icon={<Lock aria-hidden="true" size={15} />}
        title="No se tocan"
        rows={plan.protectedListings.map(({ listing, reason }) => ({
          key: listing.id,
          name: cardNameOf(cards, listing),
          detail: protectionLabels[reason] ?? reason,
        }))}
      />

      <SyncGroup
        icon={<AlertCircle aria-hidden="true" size={15} />}
        title="Líneas no reconocidas"
        rows={plan.unresolvedLines.map((resolution) => ({
          key: `${resolution.item.lineNumber}-${resolution.item.rawLine}`,
          name: resolution.item.name,
          detail: `Línea ${resolution.item.lineNumber} · no encontrada en Scryfall`,
        }))}
      />

      <div className="composer-actions">
        <button className="secondary-button" type="button" onClick={onBack}>
          <ArrowLeft aria-hidden="true" size={15} /> Volver
        </button>
        <button
          className="primary-button"
          disabled={hasConflicts || isApplying || changeCount === 0}
          type="button"
          onClick={onApply}
        >
          Aplicar los cambios
        </button>
      </div>
    </div>
  )
}
