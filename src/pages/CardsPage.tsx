import {
  ArrowLeft,
  AlertCircle,
  AtSign,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  LayoutGrid,
  Layers3,
  ListChecks,
  LoaderCircle,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Share2,
  ShoppingBag,
  Sparkles,
  Table2,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import type { ChangeEvent, FormEvent } from 'react'
import { useMemo, useState } from 'react'

import { MarketplaceReservationSheet } from '../components/MarketplaceReservationSheet'
import { MarketplaceListingRow } from '../components/MarketplaceListingRow'
import {
  applyResolvedMarketplaceImport,
  applyResolvedWantedCardImport,
  type MarketplaceImportItemInput,
  publishMarketplaceListing,
  type MarketplaceListingInput,
  type WantedImportMode,
  type WantedImportItemInput,
  type WantedImportResult,
} from '../data/cardMutations'
import { parseCardList, type CardListSection } from '../data/cardListImport'
import { completeCardDeal } from '../data/cardDeals'
import {
  cardConditionLabels as conditionLabels,
  cardLanguageLabels as languageLabels,
} from '../data/cardPresentation'
import {
  assignListingToList,
  assignWantedCardToList,
  createPersonalCardList,
  renamePersonalCardList,
} from '../data/cardLists'
import {
  cancelMarketplaceReservation,
  markCardMatchSeen,
  reserveMarketplaceListing,
  updateMarketplaceListingDetails,
  updateMarketplaceListingStatus,
  updateWantedCardDetails,
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
import { getScryfallCardImage } from '../data/scryfallImages'
import {
  resolveCardImportItemsWithCatalog,
  type CardImportResolution,
} from '../data/scryfallClient'
import type {
  Card,
  CardCondition,
  CardDeal,
  CardLanguage,
  CommunityMember,
  DemoDataSet,
  MarketplaceListing,
  PersonalCardList,
} from '../domain/types'

type CardsPageProps = {
  data: DemoDataSet
  currentMember: CommunityMember
  initialView?: 'matches' | 'market' | 'wanted'
  onDataChange: (updater: DemoDataUpdater) => void
}

const cardLanguages = Object.keys(languageLabels) as CardLanguage[]
const cardConditions = Object.keys(conditionLabels) as CardCondition[]
const MARKET_TABLE_PAGE_SIZE = 20
const MY_LISTS_PAGE_SIZE = 10
const MARKET_GALLERY_PAGE_SIZES = {
  2: 12,
  4: 20,
} as const

const matchStatusLabels = {
  new: 'Nueva',
  seen: 'Vista',
  contacted: 'Contactado',
  completed: 'Completada',
}

const listingStatusLabels: Record<MarketplaceListing['status'], string> = {
  available: 'Publicada',
  reserved: 'Con reserva',
  completed: 'Retirada',
}

function MarketplaceTable({
  items,
  onOpen,
  onMemberSelect,
  onPreview,
}: {
  items: MarketplaceListingItem[]
  onOpen: (item: MarketplaceListingItem) => void
  onMemberSelect: (memberId: string) => void
  onPreview: (item: MarketplaceListingItem) => void
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
            <MarketplaceListingRow
              item={item}
              key={item.listing.id}
              variant="community-table"
              onMemberSelect={onMemberSelect}
              onOpen={onOpen}
              onPreview={onPreview}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MarketplaceGallery({
  items,
  columns,
  currentMemberId,
  onOpen,
  onMemberSelect,
  onPreview,
}: {
  items: MarketplaceListingItem[]
  columns: 2 | 4
  currentMemberId: string
  onOpen: (item: MarketplaceListingItem) => void
  onMemberSelect: (memberId: string) => void
  onPreview: (item: MarketplaceListingItem) => void
}) {
  return (
    <div
      className={`market-gallery market-gallery--${columns}`}
      aria-label="Galería de ofertas"
    >
      {items.map((item) => {
        const imageUrl = getScryfallCardImage(
          item.card.name,
          item.card.imageUri,
        )

        return (
          <article
            className="market-gallery-card"
            key={item.listing.id}
            tabIndex={0}
            aria-label={`Abrir oferta de ${item.card.name} de ${item.member.displayName}`}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest('button')) {
                return
              }
              onOpen(item)
            }}
            onKeyDown={(event) => {
              if (
                event.target === event.currentTarget &&
                (event.key === 'Enter' || event.key === ' ')
              ) {
                event.preventDefault()
                onOpen(item)
              }
            }}
          >
            <button
              className="market-gallery-card__image"
              type="button"
              aria-label={`Ampliar ${item.card.name}`}
              onClick={() => onPreview(item)}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={`${item.card.name}, imagen de Scryfall`}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span>{item.card.setCode}</span>
              )}
            </button>
            <span
              className="market-gallery-card__quantity"
              aria-label={`Cantidad ${item.listing.quantity}`}
            >
              ×{item.listing.quantity}
            </span>
            <div className="market-gallery-card__content">
              <div>
                <h3>{item.card.name}</h3>
                <p>
                  {item.card.setName} · #{item.card.collectorNumber}
                  {item.listing.finish === 'foil' ? ' · Foil' : ''}
                </p>
              </div>
              <dl>
                <div>
                  <dt>Idioma</dt>
                  <dd>{languageLabels[item.listing.language]}</dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>{conditionLabels[item.listing.condition]}</dd>
                </div>
                <div>
                  <dt>Cantidad</dt>
                  <dd>{item.listing.quantity}</dd>
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
              <div className="market-gallery-card__actions">
                <button
                  className="market-gallery-card__member"
                  type="button"
                  onClick={() => onMemberSelect(item.member.id)}
                >
                  <span className="member-initials" aria-hidden="true">
                    {item.member.initials}
                  </span>
                  <span>
                    <small>Disponible por</small>
                    <strong>{item.member.displayName}</strong>
                  </span>
                </button>
                <button
                  className="market-gallery-card__open"
                  type="button"
                  aria-label={`${item.member.id === currentMemberId ? 'Ver oferta de' : 'Reservar'} ${item.card.name} de ${item.member.displayName}`}
                  onClick={() => onOpen(item)}
                >
                  {item.member.id === currentMemberId ? (
                    <ChevronRight aria-hidden="true" size={13} />
                  ) : (
                    <ShoppingBag aria-hidden="true" size={12} />
                  )}
                  <span>
                    {item.member.id === currentMemberId ? 'Ver' : 'Reservar'}
                  </span>
                </button>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function CardImagePreview({
  card,
  description,
  onClose,
}: {
  card: Card
  description: string
  onClose: () => void
}) {
  const imageUrl = getScryfallCardImage(card.name, card.imageUri)

  return (
    <div
      className="card-image-preview"
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-image-preview-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="card-image-preview__panel">
        <button
          className="card-image-preview__close"
          type="button"
          aria-label="Cerrar imagen"
          onClick={onClose}
        >
          <X aria-hidden="true" size={20} />
        </button>
        {imageUrl ? (
          <img src={imageUrl} alt={`${card.name}, imagen ampliada`} />
        ) : null}
        <div>
          <h2 id="card-image-preview-title">{card.name}</h2>
          <p>{description}</p>
        </div>
      </div>
    </div>
  )
}

function WantedCardRow({
  item,
  lists,
  onDetailsChange,
  onPreview,
  onListChange,
  onStatusChange,
}: {
  item: WantedCardItem
  lists: PersonalCardList[]
  onDetailsChange: (details: {
    quantity: number
    acceptedLanguages: [CardLanguage]
    acceptedFinishes: [MarketplaceListing['finish']]
  }) => void
  onPreview: () => void
  onListChange: (listId?: string) => void
  onStatusChange: (status: WantedCardItem['wantedCard']['status']) => void
}) {
  const imageUrl = getScryfallCardImage(item.card.name, item.card.imageUri)
  const [draftQuantity, setDraftQuantity] = useState(item.wantedCard.quantity)
  const [draftLanguage, setDraftLanguage] = useState(
    item.wantedCard.acceptedLanguages[0],
  )
  const [draftFinish, setDraftFinish] = useState(
    item.wantedCard.acceptedFinishes[0],
  )

  return (
    <article className="wanted-card-row">
      <button
        className="my-list-card-preview"
        type="button"
        aria-label={`Ampliar ${item.card.name}`}
        onClick={onPreview}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" decoding="async" />
        ) : (
          <span>{item.card.setCode}</span>
        )}
      </button>
      <div>
        <h3>{item.card.name}</h3>
        <p>
          {item.wantedCard.quantity} buscada
          {item.wantedCard.quantity > 1 ? 's' : ''} ·{' '}
          {languageLabels[item.wantedCard.acceptedLanguages[0]]} ·{' '}
          {item.wantedCard.acceptedFinishes[0] === 'foil' ? 'Foil' : 'No foil'}
        </p>
        {item.wantedCard.notes ? <small>{item.wantedCard.notes}</small> : null}
      </div>
      <span
        className={`wanted-status wanted-status--${item.wantedCard.status}`}
      >
        {item.wantedCard.status === 'active' ? 'Publicada' : 'Retirada'}
      </span>
      <details className="card-row-menu">
        <summary aria-label={`Gestionar ${item.card.name}`}>
          <MoreHorizontal aria-hidden="true" size={17} />
        </summary>
        <div>
          <label>
            <span>Lista privada</span>
            <select
              aria-label={`Lista de ${item.card.name}`}
              value={item.wantedCard.cardListId ?? ''}
              onChange={(event) =>
                onListChange(event.target.value || undefined)
              }
            >
              <option value="">Sin lista</option>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </label>
          <div className="card-row-edit-grid card-row-edit-grid--wanted">
            <label>
              <span>Cantidad</span>
              <input
                aria-label={`Editar cantidad buscada de ${item.card.name}`}
                min={1}
                type="number"
                value={draftQuantity}
                onChange={(event) =>
                  setDraftQuantity(Number(event.target.value))
                }
              />
            </label>
            <label>
              <span>Idioma</span>
              <select
                aria-label={`Editar idioma de ${item.card.name}`}
                value={draftLanguage}
                onChange={(event) =>
                  setDraftLanguage(event.target.value as CardLanguage)
                }
              >
                {cardLanguages.map((language) => (
                  <option key={language} value={language}>
                    {languageLabels[language]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Acabado</span>
              <select
                aria-label={`Editar acabado de ${item.card.name}`}
                value={draftFinish}
                onChange={(event) =>
                  setDraftFinish(
                    event.target.value as MarketplaceListing['finish'],
                  )
                }
              >
                <option value="nonfoil">No foil</option>
                <option value="foil">Foil</option>
              </select>
            </label>
          </div>
          <button
            className="card-row-save"
            type="button"
            disabled={draftQuantity < 1}
            onClick={() =>
              onDetailsChange({
                quantity: draftQuantity,
                acceptedLanguages: [draftLanguage],
                acceptedFinishes: [draftFinish],
              })
            }
          >
            Guardar cambios
          </button>
          <div className="card-row-menu__actions card-row-menu__actions--listing">
            <button
              type="button"
              aria-label={
                item.wantedCard.status === 'active'
                  ? `Retirar búsqueda de ${item.card.name}`
                  : `Volver a publicar búsqueda de ${item.card.name}`
              }
              onClick={() =>
                onStatusChange(
                  item.wantedCard.status === 'active' ? 'paused' : 'active',
                )
              }
            >
              {item.wantedCard.status === 'active' ? (
                <X aria-hidden="true" size={14} />
              ) : (
                <Check aria-hidden="true" size={14} />
              )}
              {item.wantedCard.status === 'active'
                ? 'Retirar búsqueda'
                : 'Volver a publicar'}
            </button>
          </div>
        </div>
      </details>
    </article>
  )
}

function MemberListingRow({
  item,
  lists,
  onDetailsChange,
  onManageReservation,
  onPreview,
  onListChange,
  onStatusChange,
}: {
  item: MemberMarketplaceListingItem
  lists: PersonalCardList[]
  onDetailsChange: (details: {
    quantity: number
    language: CardLanguage
    condition: CardCondition
    finish: MarketplaceListing['finish']
    priceEur?: number
  }) => void
  onManageReservation: () => void
  onPreview: () => void
  onListChange: (listId?: string) => void
  onStatusChange: (status: MarketplaceListing['status']) => void
}) {
  const imageUrl = getScryfallCardImage(item.card.name, item.card.imageUri)
  const reservedQuantity = item.listing.reservedQuantity ?? 0
  const availableQuantity = Math.max(
    0,
    item.listing.quantity - reservedQuantity,
  )
  const minimumQuantity = Math.max(1, reservedQuantity)
  const [draftQuantity, setDraftQuantity] = useState(item.listing.quantity)
  const [draftLanguage, setDraftLanguage] = useState(item.listing.language)
  const [draftCondition, setDraftCondition] = useState(item.listing.condition)
  const [draftFinish, setDraftFinish] = useState(item.listing.finish)
  const [draftPrice, setDraftPrice] = useState(
    item.listing.priceEur?.toString() ?? '',
  )

  return (
    <article className="member-listing-row">
      <button
        className="my-list-card-preview"
        type="button"
        aria-label={`Ampliar ${item.card.name}`}
        onClick={onPreview}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" decoding="async" />
        ) : (
          <span>{item.card.setCode}</span>
        )}
      </button>
      <div>
        <h3>{item.card.name}</h3>
        <p>
          {item.listing.status === 'reserved'
            ? `${availableQuantity} disponibles · ${reservedQuantity} reservadas`
            : `${item.listing.quantity} ${item.listing.quantity > 1 ? 'unidades' : 'unidad'}`}{' '}
          · {languageLabels[item.listing.language]}
        </p>
      </div>
      <span className={`listing-status listing-status--${item.listing.status}`}>
        {listingStatusLabels[item.listing.status]}
      </span>
      <details className="card-row-menu">
        <summary aria-label={`Gestionar ${item.card.name}`}>
          <MoreHorizontal aria-hidden="true" size={17} />
        </summary>
        <div>
          <label>
            <span>Lista privada</span>
            <select
              aria-label={`Lista de ${item.card.name}`}
              value={item.listing.cardListId ?? ''}
              onChange={(event) =>
                onListChange(event.target.value || undefined)
              }
            >
              <option value="">Sin lista</option>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </label>
          <div className="card-row-edit-grid">
            <label>
              <span>Cantidad</span>
              <input
                aria-label={`Editar cantidad de ${item.card.name}`}
                min={minimumQuantity}
                type="number"
                value={draftQuantity}
                onChange={(event) =>
                  setDraftQuantity(Number(event.target.value))
                }
              />
            </label>
            <label>
              <span>Idioma</span>
              <select
                aria-label={`Editar idioma de ${item.card.name}`}
                value={draftLanguage}
                onChange={(event) =>
                  setDraftLanguage(event.target.value as CardLanguage)
                }
              >
                {cardLanguages.map((language) => (
                  <option key={language} value={language}>
                    {languageLabels[language]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Estado</span>
              <select
                aria-label={`Editar estado de ${item.card.name}`}
                value={draftCondition}
                onChange={(event) =>
                  setDraftCondition(event.target.value as CardCondition)
                }
              >
                {cardConditions.map((condition) => (
                  <option key={condition} value={condition}>
                    {conditionLabels[condition]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Acabado</span>
              <select
                aria-label={`Editar acabado de ${item.card.name}`}
                value={draftFinish}
                onChange={(event) =>
                  setDraftFinish(
                    event.target.value as MarketplaceListing['finish'],
                  )
                }
              >
                <option value="nonfoil">No foil</option>
                <option value="foil">Foil</option>
              </select>
            </label>
            <label>
              <span>Precio €</span>
              <input
                aria-label={`Editar precio de ${item.card.name}`}
                min={0}
                step="0.01"
                type="number"
                value={draftPrice}
                onChange={(event) => setDraftPrice(event.target.value)}
              />
            </label>
          </div>
          <button
            className="card-row-save"
            type="button"
            disabled={draftQuantity < minimumQuantity}
            onClick={() =>
              onDetailsChange({
                quantity: draftQuantity,
                language: draftLanguage,
                condition: draftCondition,
                finish: draftFinish,
                priceEur: draftPrice ? Number(draftPrice) : undefined,
              })
            }
          >
            Guardar cambios
          </button>
          {reservedQuantity > 0 ? (
            <p className="card-row-reservation-note">
              {reservedQuantity}{' '}
              {reservedQuantity > 1 ? 'cartas reservadas' : 'carta reservada'}.
              La cantidad total no puede ser inferior a esta reserva.
            </p>
          ) : null}
          <div className="card-row-menu__actions card-row-menu__actions--listing">
            {item.listing.status === 'reserved' ? (
              <button
                type="button"
                aria-label={`Gestionar reserva de ${item.card.name}`}
                onClick={onManageReservation}
              >
                <ListChecks aria-hidden="true" size={14} />
                Gestionar reserva
              </button>
            ) : item.listing.status === 'completed' ? (
              <button
                type="button"
                aria-label={`Volver a publicar ${item.card.name}`}
                onClick={() => onStatusChange('available')}
              >
                <Check aria-hidden="true" size={14} /> Volver a publicar
              </button>
            ) : (
              <button
                type="button"
                aria-label={`Retirar oferta de ${item.card.name}`}
                onClick={() => onStatusChange('completed')}
              >
                <X aria-hidden="true" size={14} /> Retirar oferta
              </button>
            )}
          </div>
        </div>
      </details>
    </article>
  )
}

type MemberReservationItem = {
  listing: MarketplaceListing
  card: Card
  otherMember?: CommunityMember
  direction: 'reserved_by_me' | 'reserved_from_me'
}

function ReservationCardRow({
  item,
  onCancel,
  onPreview,
}: {
  item: MemberReservationItem
  onCancel: () => void
  onPreview: () => void
}) {
  const imageUrl = getScryfallCardImage(item.card.name, item.card.imageUri)
  const reservedByCurrentMember = item.direction === 'reserved_by_me'

  return (
    <article className="reservation-card-row">
      <button
        className="my-list-card-preview"
        type="button"
        aria-label={`Ampliar ${item.card.name}`}
        onClick={onPreview}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" decoding="async" />
        ) : (
          <span>{item.card.setCode}</span>
        )}
      </button>
      <div>
        <h3>{item.card.name}</h3>
        <p>
          {reservedByCurrentMember ? 'De' : 'Reservada por'}{' '}
          {item.otherMember?.displayName ?? 'otro miembro'} ·{' '}
          {item.listing.reservedQuantity ?? item.listing.quantity} ud. ·{' '}
          {languageLabels[item.listing.language]}
        </p>
      </div>
      <div className="reservation-card-row__actions">
        <span className="reservation-direction">
          {reservedByCurrentMember ? 'Para ti' : 'Tu oferta'}
        </span>
        <button type="button" onClick={onCancel}>
          <X aria-hidden="true" size={13} />
          {reservedByCurrentMember ? 'Cancelar reserva' : 'Liberar carta'}
        </button>
      </div>
    </article>
  )
}

function PersonalListManager({
  lists,
  kind,
  selectedListId,
  onCreate,
  onRename,
  onSelect,
}: {
  lists: PersonalCardList[]
  kind: PersonalCardList['kind']
  selectedListId: string
  onCreate: (name: string) => void
  onRename: (listId: string, name: string) => void
  onSelect: (listId: string) => void
}) {
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingListId, setEditingListId] = useState('')
  const [editingName, setEditingName] = useState('')

  return (
    <div className="personal-list-manager">
      <div className="personal-list-tabs" aria-label="Mis listas privadas">
        <button
          type="button"
          aria-pressed={!selectedListId}
          onClick={() => onSelect('')}
        >
          Todas
        </button>
        <button
          type="button"
          aria-pressed={selectedListId === 'unassigned'}
          onClick={() => onSelect('unassigned')}
        >
          Sin lista
        </button>
        {lists.map((list) => (
          <span key={list.id}>
            <button
              type="button"
              aria-pressed={selectedListId === list.id}
              onClick={() => onSelect(list.id)}
            >
              {list.name}
            </button>
            <button
              type="button"
              aria-label={`Renombrar ${list.name}`}
              onClick={() => {
                setEditingListId(list.id)
                setEditingName(list.name)
              }}
            >
              <Pencil aria-hidden="true" size={12} />
            </button>
          </span>
        ))}
        <button
          className="personal-list-tabs__add"
          type="button"
          onClick={() => setIsCreating(true)}
        >
          <Plus aria-hidden="true" size={13} /> Nueva
        </button>
      </div>

      {isCreating || editingListId ? (
        <form
          className="personal-list-editor"
          aria-label={editingListId ? 'Renombrar lista' : 'Crear lista'}
          onSubmit={(event) => {
            event.preventDefault()
            if (editingListId) {
              onRename(editingListId, editingName)
              setEditingListId('')
              setEditingName('')
            } else {
              onCreate(newName)
              setNewName('')
              setIsCreating(false)
            }
          }}
        >
          <label>
            <span className="visually-hidden">Nombre de la lista</span>
            <input
              autoFocus
              required
              maxLength={40}
              placeholder={
                kind === 'wanted' ? 'Ej. Pauper' : 'Ej. Carpeta de venta'
              }
              value={editingListId ? editingName : newName}
              onChange={(event) =>
                editingListId
                  ? setEditingName(event.target.value)
                  : setNewName(event.target.value)
              }
            />
          </label>
          <button type="submit">Guardar</button>
          <button
            type="button"
            aria-label="Cancelar edición de lista"
            onClick={() => {
              setIsCreating(false)
              setEditingListId('')
            }}
          >
            <X aria-hidden="true" size={14} />
          </button>
        </form>
      ) : null}

      <p className="personal-list-privacy">
        Tus listas son privadas. Los demás miembros solo ven las cartas, no el
        nombre de la lista.
      </p>
    </div>
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
  onPreview,
  onSelect,
}: {
  items: MemberCardMatchItem[]
  grouping: MatchGrouping
  onPreview: (item: MemberCardMatchItem) => void
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
        {isCardGroup ? (
          <button
            className="match-card-preview"
            type="button"
            aria-label={`Ampliar ${firstItem.card.name}`}
            onClick={() => onPreview(firstItem)}
          >
            <img
              src={getScryfallCardImage(
                firstItem.card.name,
                firstItem.card.imageUri,
              )}
              alt=""
              loading="lazy"
              decoding="async"
            />
          </button>
        ) : (
          <span className="member-initials" aria-hidden="true">
            {firstItem.seller.initials}
          </span>
        )}
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
          const imageUrl = getScryfallCardImage(
            item.card.name,
            item.card.imageUri,
          )

          return (
            <button
              className="compact-match-row"
              type="button"
              key={item.match.id}
              aria-label={`Ver coincidencia de ${item.card.name} con ${item.seller.displayName}`}
              onClick={() => onSelect(item.match.id)}
            >
              {isCardGroup ? (
                <span className="member-initials" aria-hidden="true">
                  {item.seller.initials}
                </span>
              ) : imageUrl ? (
                <img
                  className="compact-match-row__card-image"
                  src={imageUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="card-set-symbol" aria-hidden="true">
                  {item.card.setCode}
                </span>
              )}
              <span className="compact-match-row__identity">
                <strong>{primaryLabel}</strong>
                <small>
                  {matchStatusLabels[item.match.status]} ·{' '}
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
  currentMember,
  onBack,
  onCancelReservation,
  onComplete,
  onReserve,
}: {
  item: MemberCardMatchItem
  deal?: CardDeal
  currentMember: CommunityMember
  onBack: () => void
  onCancelReservation: (quantity: number) => void
  onComplete: () => void
  onReserve: (quantity: number) => void
}) {
  const [isCardPreviewOpen, setIsCardPreviewOpen] = useState(false)
  const [isReservationSheetOpen, setIsReservationSheetOpen] = useState(false)
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
          <button
            className="match-detail__card-preview"
            type="button"
            aria-label={`Ampliar ${item.card.name}`}
            onClick={() => setIsCardPreviewOpen(true)}
          >
            {getScryfallCardImage(item.card.name, item.card.imageUri) ? (
              <img
                src={getScryfallCardImage(item.card.name, item.card.imageUri)}
                alt=""
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span>{item.card.setCode}</span>
            )}
          </button>
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
              <p>Operación realizada con {item.seller.displayName}.</p>
            </div>
          </section>
        ) : (
          <div className="deal-actions">
            {item.listing.status === 'available' ? (
              <button
                className="secondary-button"
                type="button"
                onClick={() => setIsReservationSheetOpen(true)}
              >
                Reservar carta
              </button>
            ) : item.listing.reservedByMemberId === item.match.buyerMemberId ? (
              <button
                className="secondary-button reservation-cancel-button"
                type="button"
                onClick={() => setIsReservationSheetOpen(true)}
              >
                Cancelar reserva
              </button>
            ) : (
              <p className="match-reservation-unavailable">
                Esta carta está reservada por otro miembro.
              </p>
            )}
            <button
              className="primary-button"
              type="button"
              onClick={onComplete}
            >
              Marcar operación realizada
            </button>
          </div>
        )}
      </article>

      {isCardPreviewOpen ? (
        <CardImagePreview
          card={item.card}
          description={`${item.card.setName} · #${item.card.collectorNumber} · Disponible por ${item.seller.displayName}`}
          onClose={() => setIsCardPreviewOpen(false)}
        />
      ) : null}

      {isReservationSheetOpen ? (
        <MarketplaceReservationSheet
          item={{
            listing: item.listing,
            card: item.card,
            member: item.seller,
          }}
          currentMember={currentMember}
          onClose={() => setIsReservationSheetOpen(false)}
          onReserve={onReserve}
          onCancelReservation={onCancelReservation}
        />
      ) : null}
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
  const [priceEur, setPriceEur] = useState('')
  const offerLists = data.cardLists.filter(
    ({ memberId: ownerId, kind }) => ownerId === memberId && kind === 'offers',
  )
  const [cardListId, setCardListId] = useState(offerLists[0]?.id ?? '')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const input: MarketplaceListingInput = {
      memberId,
      cardId,
      cardListId: cardListId || undefined,
      quantity,
      language,
      condition,
      finish,
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
          <span>Lista privada</span>
          <select
            value={cardListId}
            onChange={(event) => setCardListId(event.target.value)}
          >
            <option value="">Sin lista</option>
            {offerLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </label>
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
  onImported: (
    result: WantedImportResult & { destination: 'wanted' | 'offers' },
  ) => void
}) {
  const [destination, setDestination] = useState<'wanted' | 'offers'>('wanted')
  const [rawList, setRawList] = useState('')
  const [fileName, setFileName] = useState('')
  const [resolutions, setResolutions] = useState<CardImportResolution[]>()
  const [isResolving, setIsResolving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [mode, setMode] = useState<WantedImportMode>('update')
  const [matchAllPrintings, setMatchAllPrintings] = useState(true)
  const wantedLists = data.cardLists.filter(
    ({ memberId: ownerId, kind }) => ownerId === memberId && kind === 'wanted',
  )
  const offerLists = data.cardLists.filter(
    ({ memberId: ownerId, kind }) => ownerId === memberId && kind === 'offers',
  )
  const [wantedCardListId, setWantedCardListId] = useState(
    wantedLists[0]?.id ?? '',
  )
  const [offerCardListId, setOfferCardListId] = useState(
    offerLists[0]?.id ?? '',
  )
  const [offerInputs, setOfferInputs] = useState<MarketplaceImportItemInput[]>(
    [],
  )
  const [wantedInputs, setWantedInputs] = useState<WantedImportItemInput[]>([])
  const [includedSections, setIncludedSections] = useState<CardListSection[]>([
    'main',
    'sideboard',
    'commander',
    'companion',
  ])
  const parsedList = useMemo(() => parseCardList(rawList), [rawList])
  const sectionCounts = useMemo(() => {
    const counts = new Map<CardListSection, number>()
    parsedList.items.forEach((item) =>
      counts.set(item.section, (counts.get(item.section) ?? 0) + item.quantity),
    )
    return counts
  }, [parsedList.items])
  const resolvedCount =
    resolutions?.filter(({ status }) => status === 'resolved').length ?? 0
  const unresolvedCount = (resolutions?.length ?? 0) - resolvedCount

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setRawList(await file.text())
    setFileName(file.name)
    setResolutions(undefined)
    setErrorMessage('')
  }

  const handleAnalyze = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (parsedList.items.length === 0) {
      setErrorMessage('No se ha encontrado ninguna línea de carta válida.')
      return
    }

    setIsResolving(true)
    setErrorMessage('')

    try {
      const resolved = await resolveCardImportItemsWithCatalog(
        parsedList.items,
        data.cards,
      )
      setResolutions(resolved)
      setOfferInputs(
        resolved.map((resolution) => ({
          resolution,
          quantity: resolution.item.quantity,
          language: 'es',
          condition: 'near_mint',
          finish: 'nonfoil',
        })),
      )
      setWantedInputs(
        resolved.map((resolution) => ({
          resolution,
          quantity: resolution.item.quantity,
          acceptedLanguages: ['es'],
          acceptedFinishes: ['nonfoil'],
        })),
      )
    } catch {
      setErrorMessage(
        'No se ha podido consultar Scryfall. Comprueba la conexión e inténtalo de nuevo.',
      )
    } finally {
      setIsResolving(false)
    }
  }

  const handleImport = () => {
    if (!resolutions) {
      return
    }

    const result =
      destination === 'offers'
        ? applyResolvedMarketplaceImport(
            data,
            memberId,
            offerInputs,
            includedSections,
            offerCardListId || undefined,
          )
        : applyResolvedWantedCardImport(
            data,
            memberId,
            resolutions,
            mode,
            includedSections,
            matchAllPrintings,
            undefined,
            wantedCardListId || undefined,
            wantedInputs,
          )
    const unknownLines = resolutions
      .filter(
        ({ status, item }) =>
          status === 'unresolved' && includedSections.includes(item.section),
      )
      .map(({ item }) => item.rawLine)

    onDataChange(result.data)
    onImported({ ...result, unknownLines, destination })
  }

  const sectionLabels: Record<CardListSection, string> = {
    main: 'Lista principal',
    sideboard: 'Sideboard',
    maybeboard: 'Maybeboard',
    commander: 'Commander',
    companion: 'Companion',
  }

  return (
    <form
      className="card-composer card-import-composer"
      aria-label="Importar lista de cartas"
      onSubmit={handleAnalyze}
    >
      <ComposerHeading title="Importar una lista" onClose={onClose} />

      <div
        className="import-destination-switch"
        role="group"
        aria-label="Importar como"
      >
        <button
          type="button"
          aria-pressed={destination === 'wanted'}
          onClick={() => setDestination('wanted')}
        >
          Buscadas
        </button>
        <button
          type="button"
          aria-pressed={destination === 'offers'}
          onClick={() => setDestination('offers')}
        >
          Ofertas
        </button>
      </div>

      {!resolutions ? (
        <>
          <label className="card-import-file">
            <FileText aria-hidden="true" size={22} />
            <span>
              <strong>{fileName || 'Seleccionar un archivo'}</strong>
              <small>TXT de Moxfield o ManaBox, CSV de ManaBox</small>
            </span>
            <input
              accept=".txt,.csv,text/plain,text/csv"
              type="file"
              onChange={handleFileChange}
            />
          </label>

          <div className="import-separator">
            <span>o pegar el contenido</span>
          </div>

          <label className="form-field">
            <span>Lista de cartas</span>
            <textarea
              required
              rows={9}
              placeholder={
                "4 Adventurer's Inn (FIN) 271\n2 Bushwhack (FDN) 215\n\nSIDEBOARD:\n2 Vines of Vastwood"
              }
              value={rawList}
              onChange={(event) => {
                setRawList(event.target.value)
                setFileName('')
                setErrorMessage('')
              }}
            />
          </label>

          <p className="import-help">
            Se aceptan listas simples y mazos. La cantidad, la edición y el
            número de colección son opcionales.
          </p>

          {parsedList.items.length > 0 ? (
            <p className="import-detection" role="status">
              <CheckCircle2 aria-hidden="true" size={16} />
              {parsedList.items.length} líneas detectadas ·{' '}
              {parsedList.items.reduce((sum, item) => sum + item.quantity, 0)}{' '}
              cartas
              {parsedList.source === 'manabox_csv' ? ' · CSV ManaBox' : ''}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="import-error" role="alert">
              <AlertCircle aria-hidden="true" size={17} /> {errorMessage}
            </p>
          ) : null}

          <div className="composer-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              disabled={isResolving || parsedList.items.length === 0}
              type="submit"
            >
              {isResolving ? (
                <>
                  <LoaderCircle className="spin" aria-hidden="true" size={17} />{' '}
                  Comprobando…
                </>
              ) : (
                'Analizar lista'
              )}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="import-summary" aria-live="polite">
            <div>
              <strong>{resolvedCount}</strong>
              <span>reconocidas</span>
            </div>
            <div className={unresolvedCount ? 'has-warning' : ''}>
              <strong>{unresolvedCount}</strong>
              <span>por revisar</span>
            </div>
            <div>
              <strong>
                {parsedList.items.reduce((sum, item) => sum + item.quantity, 0)}
              </strong>
              <span>cartas</span>
            </div>
          </div>

          {sectionCounts.size > 1 ? (
            <fieldset className="import-options">
              <legend>Secciones a importar</legend>
              <div className="import-section-options">
                {[...sectionCounts].map(([section, count]) => (
                  <label key={section}>
                    <input
                      checked={includedSections.includes(section)}
                      type="checkbox"
                      onChange={(event) =>
                        setIncludedSections((current) =>
                          event.target.checked
                            ? [...current, section]
                            : current.filter((value) => value !== section),
                        )
                      }
                    />
                    <span>{sectionLabels[section]}</span>
                    <small>{count}</small>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {destination === 'offers' ? (
            <div
              className="offer-import-preview"
              aria-label="Editar ofertas importadas"
            >
              {offerInputs.map((input, index) => (
                <div
                  className="offer-import-row"
                  key={`${input.resolution.item.lineNumber}-${input.resolution.item.rawLine}`}
                >
                  <div className="offer-import-row__identity">
                    <span
                      className={
                        input.resolution.status === 'resolved'
                          ? 'is-resolved'
                          : 'is-unresolved'
                      }
                      aria-hidden="true"
                    >
                      {input.resolution.status === 'resolved' ? '✓' : '!'}
                    </span>
                    <span>
                      <strong>
                        {input.resolution.card?.name ??
                          input.resolution.item.name}
                      </strong>
                      <small>
                        {input.resolution.card
                          ? `${input.resolution.card.setCode} #${input.resolution.card.collectorNumber}`
                          : 'No encontrada en Scryfall'}
                      </small>
                    </span>
                  </div>
                  <div className="offer-import-row__fields">
                    <label>
                      <span>Cant.</span>
                      <input
                        aria-label={`Cantidad de ${input.resolution.item.name}`}
                        min={1}
                        type="number"
                        value={input.quantity}
                        onChange={(event) =>
                          setOfferInputs((current) =>
                            current.map((candidate, candidateIndex) =>
                              candidateIndex === index
                                ? {
                                    ...candidate,
                                    quantity: Number(event.target.value),
                                  }
                                : candidate,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      <span>Idioma</span>
                      <select
                        aria-label={`Idioma de ${input.resolution.item.name}`}
                        value={input.language}
                        onChange={(event) =>
                          setOfferInputs((current) =>
                            current.map((candidate, candidateIndex) =>
                              candidateIndex === index
                                ? {
                                    ...candidate,
                                    language: event.target
                                      .value as CardLanguage,
                                  }
                                : candidate,
                            ),
                          )
                        }
                      >
                        {cardLanguages.map((language) => (
                          <option key={language} value={language}>
                            {languageLabels[language]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Estado</span>
                      <select
                        aria-label={`Estado de ${input.resolution.item.name}`}
                        value={input.condition}
                        onChange={(event) =>
                          setOfferInputs((current) =>
                            current.map((candidate, candidateIndex) =>
                              candidateIndex === index
                                ? {
                                    ...candidate,
                                    condition: event.target
                                      .value as CardCondition,
                                  }
                                : candidate,
                            ),
                          )
                        }
                      >
                        {cardConditions.map((condition) => (
                          <option key={condition} value={condition}>
                            {conditionLabels[condition]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Acabado</span>
                      <select
                        aria-label={`Acabado de ${input.resolution.item.name}`}
                        value={input.finish}
                        onChange={(event) =>
                          setOfferInputs((current) =>
                            current.map((candidate, candidateIndex) =>
                              candidateIndex === index
                                ? {
                                    ...candidate,
                                    finish: event.target
                                      .value as MarketplaceListing['finish'],
                                  }
                                : candidate,
                            ),
                          )
                        }
                      >
                        <option value="nonfoil">No foil</option>
                        <option value="foil">Foil</option>
                      </select>
                    </label>
                    <label>
                      <span>Precio €</span>
                      <input
                        aria-label={`Precio de ${input.resolution.item.name}`}
                        min={0}
                        step="0.01"
                        type="number"
                        value={input.priceEur ?? ''}
                        onChange={(event) =>
                          setOfferInputs((current) =>
                            current.map((candidate, candidateIndex) =>
                              candidateIndex === index
                                ? {
                                    ...candidate,
                                    priceEur: event.target.value
                                      ? Number(event.target.value)
                                      : undefined,
                                  }
                                : candidate,
                            ),
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="wanted-import-preview"
              aria-label="Editar búsquedas importadas"
            >
              {wantedInputs.map((input, index) => (
                <div
                  className="wanted-import-row"
                  key={`${input.resolution.item.lineNumber}-${input.resolution.item.rawLine}`}
                >
                  <div className="wanted-import-row__identity">
                    <span
                      className={
                        input.resolution.status === 'resolved'
                          ? 'is-resolved'
                          : 'is-unresolved'
                      }
                      aria-hidden="true"
                    >
                      {input.resolution.status === 'resolved' ? '✓' : '!'}
                    </span>
                    <span>
                      <strong>
                        {input.resolution.card?.name ??
                          input.resolution.item.name}
                      </strong>
                      <small>
                        {input.resolution.card
                          ? `${input.resolution.card.setCode} #${input.resolution.card.collectorNumber}`
                          : 'No encontrada en Scryfall'}
                      </small>
                    </span>
                  </div>
                  <div className="wanted-import-row__fields">
                    <label>
                      <span>Cant.</span>
                      <input
                        aria-label={`Cantidad buscada de ${input.resolution.item.name}`}
                        min={1}
                        type="number"
                        value={input.quantity}
                        onChange={(event) =>
                          setWantedInputs((current) =>
                            current.map((candidate, candidateIndex) =>
                              candidateIndex === index
                                ? {
                                    ...candidate,
                                    quantity: Number(event.target.value),
                                  }
                                : candidate,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      <span>Idioma</span>
                      <select
                        aria-label={`Idioma para ${input.resolution.item.name}`}
                        value={input.acceptedLanguages[0]}
                        onChange={(event) =>
                          setWantedInputs((current) =>
                            current.map((candidate, candidateIndex) =>
                              candidateIndex === index
                                ? {
                                    ...candidate,
                                    acceptedLanguages: [
                                      event.target.value as CardLanguage,
                                    ],
                                  }
                                : candidate,
                            ),
                          )
                        }
                      >
                        {cardLanguages.map((language) => (
                          <option key={language} value={language}>
                            {languageLabels[language]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Acabado</span>
                      <select
                        aria-label={`Acabado para ${input.resolution.item.name}`}
                        value={input.acceptedFinishes[0]}
                        onChange={(event) =>
                          setWantedInputs((current) =>
                            current.map((candidate, candidateIndex) =>
                              candidateIndex === index
                                ? {
                                    ...candidate,
                                    acceptedFinishes: [
                                      event.target
                                        .value as MarketplaceListing['finish'],
                                    ],
                                  }
                                : candidate,
                            ),
                          )
                        }
                      >
                        <option value="nonfoil">No foil</option>
                        <option value="foil">Foil</option>
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}

          {destination === 'wanted' ? (
            <fieldset className="import-options">
              <legend>Cómo actualizar mi lista</legend>
              <div className="import-mode-options">
                <label>
                  <input
                    checked={mode === 'update'}
                    name="import-mode"
                    type="radio"
                    onChange={() => setMode('update')}
                  />
                  <span>
                    <strong>Actualizar</strong>
                    <small>Reemplaza las cantidades importadas.</small>
                  </span>
                </label>
                <label>
                  <input
                    checked={mode === 'add'}
                    name="import-mode"
                    type="radio"
                    onChange={() => setMode('add')}
                  />
                  <span>
                    <strong>Añadir</strong>
                    <small>Suma las nuevas cantidades.</small>
                  </span>
                </label>
                <label>
                  <input
                    checked={mode === 'sync'}
                    name="import-mode"
                    type="radio"
                    onChange={() => setMode('sync')}
                  />
                  <span>
                    <strong>Sincronizar</strong>
                    <small>Pausa también las búsquedas ausentes.</small>
                  </span>
                </label>
              </div>
            </fieldset>
          ) : null}

          <label className="form-field">
            <span>Guardar en mi lista privada</span>
            <select
              value={
                destination === 'wanted' ? wantedCardListId : offerCardListId
              }
              onChange={(event) =>
                destination === 'wanted'
                  ? setWantedCardListId(event.target.value)
                  : setOfferCardListId(event.target.value)
              }
            >
              <option value="">Sin lista</option>
              {(destination === 'wanted' ? wantedLists : offerLists).map(
                (list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ),
              )}
            </select>
          </label>

          {destination === 'wanted' ? (
            <label className="import-printing-option">
              <input
                checked={matchAllPrintings}
                type="checkbox"
                onChange={(event) => setMatchAllPrintings(event.target.checked)}
              />
              <span>
                <strong>Aceptar cualquier edición</strong>
                <small>
                  Recomendado para encontrar más ofertas compatibles.
                </small>
              </span>
            </label>
          ) : null}

          {errorMessage ? (
            <p className="import-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className="composer-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => setResolutions(undefined)}
            >
              Volver
            </button>
            <button
              className="primary-button"
              disabled={resolvedCount === 0 || includedSections.length === 0}
              type="button"
              onClick={handleImport}
            >
              {destination === 'wanted'
                ? 'Importar búsquedas'
                : 'Publicar ofertas'}
            </button>
          </div>
        </>
      )}
    </form>
  )
}

export function CardsPage({
  data,
  currentMember,
  initialView = 'matches',
  onDataChange,
}: CardsPageProps) {
  const [activeView, setActiveView] = useState<'matches' | 'market' | 'wanted'>(
    initialView,
  )
  const [activeComposer, setActiveComposer] = useState<
    'listing' | 'import' | undefined
  >()
  const [selectedMatchId, setSelectedMatchId] = useState<string>()
  const [matchGrouping, setMatchGrouping] = useState<MatchGrouping>('card')
  const [marketPage, setMarketPage] = useState(1)
  const [marketDisplay, setMarketDisplay] = useState<'table' | 'gallery'>(
    'table',
  )
  const [marketGalleryColumns, setMarketGalleryColumns] = useState<2 | 4>(2)
  const [myListsView, setMyListsView] = useState<
    'wanted' | 'offers' | 'reserved'
  >('wanted')
  const [myListsQuery, setMyListsQuery] = useState('')
  const [myListsPage, setMyListsPage] = useState(1)
  const [selectedPersonalListId, setSelectedPersonalListId] = useState('')
  const [selectedCardPreview, setSelectedCardPreview] = useState<{
    card: Card
    description: string
  }>()
  const [selectedMarketplaceListingId, setSelectedMarketplaceListingId] =
    useState<string>()
  const [actionMessage, setActionMessage] = useState('')
  const [query, setQuery] = useState('')
  const [hideOwnListings, setHideOwnListings] = useState(true)
  const listings = getMarketplaceListings(data)
  const selectedMarketplaceItem = useMemo<
    MarketplaceListingItem | undefined
  >(() => {
    const listing = data.listings.find(
      ({ id }) => id === selectedMarketplaceListingId,
    )
    const card = listing
      ? data.cards.find(({ id }) => id === listing.cardId)
      : undefined
    const member = listing
      ? data.members.find(({ id }) => id === listing.memberId)
      : undefined

    return listing && card && member ? { listing, card, member } : undefined
  }, [data.cards, data.listings, data.members, selectedMarketplaceListingId])
  const wantedCards = getMemberWantedCards(data, currentMember.id)
  const memberListings = getMemberMarketplaceListings(data, currentMember.id)
  const wantedPersonalLists = data.cardLists.filter(
    ({ memberId, kind }) => memberId === currentMember.id && kind === 'wanted',
  )
  const offerPersonalLists = data.cardLists.filter(
    ({ memberId, kind }) => memberId === currentMember.id && kind === 'offers',
  )
  const activePersonalLists =
    myListsView === 'wanted' ? wantedPersonalLists : offerPersonalLists
  const reservations = useMemo<MemberReservationItem[]>(
    () =>
      data.listings
        .filter(
          ({ memberId, reservedByMemberId, status }) =>
            status === 'reserved' &&
            (memberId === currentMember.id ||
              reservedByMemberId === currentMember.id),
        )
        .flatMap((listing) => {
          const card = data.cards.find(({ id }) => id === listing.cardId)
          const reservedByCurrentMember =
            listing.reservedByMemberId === currentMember.id
          const otherMemberId = reservedByCurrentMember
            ? listing.memberId
            : listing.reservedByMemberId
          const otherMember = data.members.find(
            ({ id }) => id === otherMemberId,
          )

          return card
            ? [
                {
                  listing,
                  card,
                  otherMember,
                  direction: reservedByCurrentMember
                    ? ('reserved_by_me' as const)
                    : ('reserved_from_me' as const),
                },
              ]
            : []
        })
        .sort(
          (first, second) =>
            new Date(
              second.listing.reservedAt ?? second.listing.createdAt,
            ).getTime() -
            new Date(
              first.listing.reservedAt ?? first.listing.createdAt,
            ).getTime(),
        ),
    [currentMember.id, data.cards, data.listings, data.members],
  )
  const matches = getMemberCardMatches(data, currentMember.id)
  const groupedMatches = groupCardMatches(matches, matchGrouping)
  const selectedMatch = matches.find(
    ({ match }) => match.id === selectedMatchId,
  )
  const selectedDeal = selectedMatchId
    ? data.cardDeals.find(({ matchId }) => matchId === selectedMatchId)
    : undefined
  const normalizedQuery = query.trim().toLocaleLowerCase('es')
  const filteredListings = useMemo(
    () =>
      listings.filter(
        ({ card, member }) =>
          (!hideOwnListings || member.id !== currentMember.id) &&
          (!normalizedQuery ||
            card.name.toLocaleLowerCase('es').includes(normalizedQuery) ||
            card.setName.toLocaleLowerCase('es').includes(normalizedQuery) ||
            member.displayName
              .toLocaleLowerCase('es')
              .includes(normalizedQuery)),
      ),
    [currentMember.id, hideOwnListings, listings, normalizedQuery],
  )
  const marketPageSize =
    marketDisplay === 'table'
      ? MARKET_TABLE_PAGE_SIZE
      : MARKET_GALLERY_PAGE_SIZES[marketGalleryColumns]
  const marketPageCount = Math.max(
    1,
    Math.ceil(filteredListings.length / marketPageSize),
  )
  const activeMarketPage = Math.min(marketPage, marketPageCount)
  const marketPageStart = (activeMarketPage - 1) * marketPageSize
  const visibleListings = filteredListings.slice(
    marketPageStart,
    marketPageStart + marketPageSize,
  )
  const normalizedMyListsQuery = myListsQuery.trim().toLocaleLowerCase('es')
  const filteredMemberListings = memberListings.filter(
    ({ card, listing }) =>
      (!selectedPersonalListId ||
        (selectedPersonalListId === 'unassigned'
          ? !listing.cardListId
          : listing.cardListId === selectedPersonalListId)) &&
      (!normalizedMyListsQuery ||
        card.name.toLocaleLowerCase('es').includes(normalizedMyListsQuery) ||
        card.setName.toLocaleLowerCase('es').includes(normalizedMyListsQuery)),
  )
  const filteredWantedCards = wantedCards.filter(
    ({ card, wantedCard }) =>
      (!selectedPersonalListId ||
        (selectedPersonalListId === 'unassigned'
          ? !wantedCard.cardListId
          : wantedCard.cardListId === selectedPersonalListId)) &&
      (!normalizedMyListsQuery ||
        card.name.toLocaleLowerCase('es').includes(normalizedMyListsQuery) ||
        card.setName.toLocaleLowerCase('es').includes(normalizedMyListsQuery)),
  )
  const filteredReservations = reservations.filter(
    ({ card, otherMember }) =>
      !normalizedMyListsQuery ||
      card.name.toLocaleLowerCase('es').includes(normalizedMyListsQuery) ||
      card.setName.toLocaleLowerCase('es').includes(normalizedMyListsQuery) ||
      otherMember?.displayName
        .toLocaleLowerCase('es')
        .includes(normalizedMyListsQuery),
  )
  const activeMyListItems =
    myListsView === 'offers'
      ? filteredMemberListings
      : myListsView === 'reserved'
        ? filteredReservations
        : filteredWantedCards
  const myListsPageCount = Math.max(
    1,
    Math.ceil(activeMyListItems.length / MY_LISTS_PAGE_SIZE),
  )
  const activeMyListsPage = Math.min(myListsPage, myListsPageCount)
  const myListsPageStart = (activeMyListsPage - 1) * MY_LISTS_PAGE_SIZE
  const visibleMemberListings = filteredMemberListings.slice(
    myListsPageStart,
    myListsPageStart + MY_LISTS_PAGE_SIZE,
  )
  const visibleWantedCards = filteredWantedCards.slice(
    myListsPageStart,
    myListsPageStart + MY_LISTS_PAGE_SIZE,
  )
  const visibleReservations = filteredReservations.slice(
    myListsPageStart,
    myListsPageStart + MY_LISTS_PAGE_SIZE,
  )

  if (selectedMatch) {
    return (
      <MatchDetail
        deal={selectedDeal}
        item={selectedMatch}
        currentMember={currentMember}
        onBack={() => setSelectedMatchId(undefined)}
        onCancelReservation={(quantity) =>
          onDataChange((currentData) =>
            cancelMarketplaceReservation(
              currentData,
              selectedMatch.listing.id,
              currentMember.id,
              quantity,
            ),
          )
        }
        onComplete={() =>
          onDataChange((currentData) =>
            completeCardDeal(
              currentData,
              selectedMatch.match.id,
              currentMember.id,
            ),
          )
        }
        onReserve={(quantity) =>
          onDataChange((currentData) =>
            reserveMarketplaceListing(
              currentData,
              selectedMatch.listing.id,
              currentMember.id,
              undefined,
              quantity,
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
          Mercado MTG de la comunidad
        </span>
        <h1>Cartas</h1>
        <p>
          Por ahora, esta sección está dedicada exclusivamente a cartas de
          Magic: The Gathering. Encuentra ofertas y búsquedas sin rebuscar entre
          fotos y mensajes antiguos.
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
          <span>
            {wantedCards.length + memberListings.length + reservations.length}
          </span>
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
            const isOfferImport = result.destination === 'offers'
            setActiveView('wanted')
            setMyListsView(isOfferImport ? 'offers' : 'wanted')
            setSelectedPersonalListId('')
            setActionMessage(
              result.imported.length > 0
                ? `${result.imported.length} ${isOfferImport ? 'ofertas publicadas' : 'búsquedas importadas'}.${
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
                  onPreview={(item) =>
                    setSelectedCardPreview({
                      card: item.card,
                      description: `${item.card.setName} · Disponible por ${item.seller.displayName}`,
                    })
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

          <label className="market-own-listings-filter">
            <input
              checked={hideOwnListings}
              type="checkbox"
              onChange={(event) => {
                setHideOwnListings(event.target.checked)
                setMarketPage(1)
              }}
            />
            Ocultar mis cartas
          </label>

          <div
            className="market-display-switch"
            role="group"
            aria-label="Vista de ofertas"
          >
            <button
              type="button"
              aria-pressed={marketDisplay === 'table'}
              onClick={() => {
                setMarketDisplay('table')
                setMarketPage(1)
              }}
            >
              <Table2 aria-hidden="true" size={16} />
              Tabla
            </button>
            <button
              type="button"
              aria-pressed={marketDisplay === 'gallery'}
              onClick={() => {
                setMarketDisplay('gallery')
                setMarketPage(1)
              }}
            >
              <LayoutGrid aria-hidden="true" size={16} />
              Imágenes
            </button>
          </div>

          {marketDisplay === 'gallery' ? (
            <div
              className="market-gallery-density"
              role="group"
              aria-label="Cartas por línea"
            >
              <span>Densidad</span>
              <button
                type="button"
                aria-pressed={marketGalleryColumns === 2}
                onClick={() => {
                  setMarketGalleryColumns(2)
                  setMarketPage(1)
                }}
              >
                2 por fila
              </button>
              <button
                type="button"
                aria-pressed={marketGalleryColumns === 4}
                onClick={() => {
                  setMarketGalleryColumns(4)
                  setMarketPage(1)
                }}
              >
                4 por fila
              </button>
            </div>
          ) : null}

          {visibleListings.length > 0 ? (
            marketDisplay === 'table' ? (
              <MarketplaceTable
                items={visibleListings}
                onOpen={(item) =>
                  setSelectedMarketplaceListingId(item.listing.id)
                }
                onMemberSelect={(memberId) => {
                  window.location.hash = `cartas?member=${memberId}`
                }}
                onPreview={(item) =>
                  setSelectedCardPreview({
                    card: item.card,
                    description: `${item.card.setName} · Disponible por ${item.member.displayName}`,
                  })
                }
              />
            ) : (
              <MarketplaceGallery
                items={visibleListings}
                columns={marketGalleryColumns}
                currentMemberId={currentMember.id}
                onOpen={(item) =>
                  setSelectedMarketplaceListingId(item.listing.id)
                }
                onMemberSelect={(memberId) => {
                  window.location.hash = `cartas?member=${memberId}`
                }}
                onPreview={(item) =>
                  setSelectedCardPreview({
                    card: item.card,
                    description: `${item.card.setName} · Disponible por ${item.member.displayName}`,
                  })
                }
              />
            )
          ) : (
            <p className="filtered-empty-state">
              No hay ofertas que coincidan con esta búsqueda.
            </p>
          )}

          {visibleListings.length > 0 ? (
            <p className="scryfall-credit">
              Imágenes de cartas proporcionadas por{' '}
              <a href="https://scryfall.com" target="_blank" rel="noreferrer">
                Scryfall
              </a>
              .
            </p>
          ) : null}

          {filteredListings.length > 0 ? (
            <nav className="market-pagination" aria-label="Páginas de ofertas">
              <p>
                {marketPageStart + 1}–
                {Math.min(
                  marketPageStart + marketPageSize,
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
        <section className="cards-section" aria-labelledby="my-lists-title">
          <div className="section-heading">
            <div>
              <span>Tu colección</span>
              <h2 id="my-lists-title">Mis listas</h2>
            </div>
            <p>
              {memberListings.length + wantedCards.length + reservations.length}{' '}
              elementos
            </p>
          </div>

          <div
            className="my-lists-switch"
            role="group"
            aria-label="Tipo de lista"
          >
            <button
              type="button"
              aria-pressed={myListsView === 'wanted'}
              onClick={() => {
                setMyListsView('wanted')
                setMyListsPage(1)
                setSelectedPersonalListId('')
              }}
            >
              Buscadas <span>{wantedCards.length}</span>
            </button>
            <button
              type="button"
              aria-pressed={myListsView === 'offers'}
              onClick={() => {
                setMyListsView('offers')
                setMyListsPage(1)
                setSelectedPersonalListId('')
              }}
            >
              Mis ofertas <span>{memberListings.length}</span>
            </button>
            <button
              type="button"
              aria-pressed={myListsView === 'reserved'}
              onClick={() => {
                setMyListsView('reserved')
                setMyListsPage(1)
                setSelectedPersonalListId('')
              }}
            >
              Reservadas <span>{reservations.length}</span>
            </button>
          </div>

          {myListsView !== 'reserved' ? (
            <PersonalListManager
              lists={activePersonalLists}
              kind={myListsView}
              selectedListId={selectedPersonalListId}
              onSelect={(listId) => {
                setSelectedPersonalListId(listId)
                setMyListsPage(1)
              }}
              onCreate={(name) => {
                const result = createPersonalCardList(
                  data,
                  currentMember.id,
                  name,
                  myListsView,
                )
                onDataChange(result.data)
                if (result.list) {
                  setSelectedPersonalListId(result.list.id)
                  setMyListsPage(1)
                  setActionMessage(`Lista «${result.list.name}» creada.`)
                }
              }}
              onRename={(listId, name) => {
                onDataChange((currentData) =>
                  renamePersonalCardList(
                    currentData,
                    currentMember.id,
                    listId,
                    name,
                  ),
                )
                setActionMessage('El nombre de la lista se ha actualizado.')
              }}
            />
          ) : null}

          {myListsView === 'offers' ? (
            <button
              className="share-my-cards-button"
              type="button"
              onClick={() => {
                window.location.hash = `cartas?member=${currentMember.id}`
              }}
            >
              <Share2 aria-hidden="true" size={16} />
              Ver y compartir mi página de cartas
            </button>
          ) : null}

          <label className="card-search my-lists-search">
            <Search aria-hidden="true" size={17} />
            <span className="visually-hidden">Buscar en mis listas</span>
            <input
              type="search"
              placeholder="Buscar en mis listas"
              value={myListsQuery}
              onChange={(event) => {
                setMyListsQuery(event.target.value)
                setMyListsPage(1)
              }}
            />
          </label>

          {myListsView === 'reserved' ? (
            <>
              <div className="compact-list-heading">
                <h2>Cartas reservadas</h2>
                <span>{filteredReservations.length} pendientes</span>
              </div>
              {visibleReservations.length > 0 ? (
                <div className="reservation-card-list">
                  {visibleReservations.map((item) => (
                    <ReservationCardRow
                      item={item}
                      key={item.listing.id}
                      onCancel={() =>
                        setSelectedMarketplaceListingId(item.listing.id)
                      }
                      onPreview={() =>
                        setSelectedCardPreview({
                          card: item.card,
                          description:
                            item.direction === 'reserved_by_me'
                              ? `Reservada para ti · ${item.otherMember?.displayName ?? 'otro miembro'}`
                              : `Tu oferta · Reservada por ${item.otherMember?.displayName ?? 'otro miembro'}`,
                        })
                      }
                    />
                  ))}
                </div>
              ) : (
                <p className="filtered-empty-state">
                  No tienes ninguna carta reservada pendiente.
                </p>
              )}
            </>
          ) : myListsView === 'offers' ? (
            <>
              <div className="compact-list-heading">
                <h2>Mis ofertas</h2>
                <span>{filteredMemberListings.length} publicadas</span>
              </div>
              {visibleMemberListings.length > 0 ? (
                <div className="member-listing-list">
                  {visibleMemberListings.map((item) => (
                    <MemberListingRow
                      item={item}
                      lists={offerPersonalLists}
                      key={item.listing.id}
                      onDetailsChange={(details) => {
                        onDataChange((currentData) =>
                          updateMarketplaceListingDetails(
                            currentData,
                            item.listing.id,
                            currentMember.id,
                            details,
                          ),
                        )
                        setActionMessage('La oferta se ha actualizado.')
                      }}
                      onManageReservation={() =>
                        setSelectedMarketplaceListingId(item.listing.id)
                      }
                      onPreview={() =>
                        setSelectedCardPreview({
                          card: item.card,
                          description: `${item.card.setName} · Tu oferta`,
                        })
                      }
                      onListChange={(listId) => {
                        onDataChange((currentData) =>
                          assignListingToList(
                            currentData,
                            currentMember.id,
                            item.listing.id,
                            listId,
                          ),
                        )
                        setActionMessage('La oferta se ha movido de lista.')
                      }}
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
                          status === 'available'
                            ? 'La oferta se ha vuelto a publicar.'
                            : 'La oferta se ha retirado.',
                        )
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="filtered-empty-state">
                  No hay ofertas que coincidan con esta búsqueda.
                </p>
              )}
            </>
          ) : (
            <>
              <div className="compact-list-heading">
                <h2 id="wanted-title">Cartas buscadas</h2>
                <span>{filteredWantedCards.length} activas</span>
              </div>
              {visibleWantedCards.length > 0 ? (
                <div className="wanted-list">
                  {visibleWantedCards.map((item) => (
                    <WantedCardRow
                      item={item}
                      lists={wantedPersonalLists}
                      key={item.wantedCard.id}
                      onDetailsChange={(details) => {
                        onDataChange((currentData) =>
                          updateWantedCardDetails(
                            currentData,
                            item.wantedCard.id,
                            currentMember.id,
                            details,
                          ),
                        )
                        setActionMessage('La búsqueda se ha actualizado.')
                      }}
                      onPreview={() =>
                        setSelectedCardPreview({
                          card: item.card,
                          description: `${item.card.setName} · En tu lista de búsqueda`,
                        })
                      }
                      onListChange={(listId) => {
                        onDataChange((currentData) =>
                          assignWantedCardToList(
                            currentData,
                            currentMember.id,
                            item.wantedCard.id,
                            listId,
                          ),
                        )
                        setActionMessage('La búsqueda se ha movido de lista.')
                      }}
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
                            ? 'La búsqueda se ha retirado.'
                            : status === 'active'
                              ? 'La búsqueda se ha vuelto a publicar.'
                              : 'La carta se ha marcado como encontrada.',
                        )
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="filtered-empty-state">
                  No hay búsquedas que coincidan con este filtro.
                </p>
              )}
            </>
          )}

          {activeMyListItems.length > 0 ? (
            <nav
              className="market-pagination"
              aria-label="Páginas de mis listas"
            >
              <p>
                {myListsPageStart + 1}–
                {Math.min(
                  myListsPageStart + MY_LISTS_PAGE_SIZE,
                  activeMyListItems.length,
                )}{' '}
                de {activeMyListItems.length}
              </p>
              {myListsPageCount > 1 ? (
                <div>
                  <button
                    type="button"
                    disabled={activeMyListsPage === 1}
                    onClick={() => setMyListsPage(activeMyListsPage - 1)}
                  >
                    Anterior
                  </button>
                  <span>
                    {activeMyListsPage}/{myListsPageCount}
                  </span>
                  <button
                    type="button"
                    disabled={activeMyListsPage === myListsPageCount}
                    onClick={() => setMyListsPage(activeMyListsPage + 1)}
                  >
                    Siguiente
                  </button>
                </div>
              ) : null}
            </nav>
          ) : null}

          <p className="scryfall-credit">
            Imágenes de cartas proporcionadas por{' '}
            <a href="https://scryfall.com" target="_blank" rel="noreferrer">
              Scryfall
            </a>
            .
          </p>

          <p className="cards-privacy-note">
            <UserRound aria-hidden="true" size={15} />
            La comunidad ve las cartas publicadas o buscadas, pero tus nombres
            de listas y tu organización permanecen privados.
          </p>
        </section>
      )}
      {selectedMarketplaceItem ? (
        <MarketplaceReservationSheet
          key={selectedMarketplaceItem.listing.id}
          item={selectedMarketplaceItem}
          currentMember={currentMember}
          onClose={() => setSelectedMarketplaceListingId(undefined)}
          onMemberSelect={(memberId) => {
            setSelectedMarketplaceListingId(undefined)
            window.location.hash = `cartas?member=${memberId}`
          }}
          onPreview={() =>
            setSelectedCardPreview({
              card: selectedMarketplaceItem.card,
              description: `${selectedMarketplaceItem.card.setName} · Disponible por ${selectedMarketplaceItem.member.displayName}`,
            })
          }
          onReserve={(quantity) => {
            onDataChange((currentData) =>
              reserveMarketplaceListing(
                currentData,
                selectedMarketplaceItem.listing.id,
                currentMember.id,
                undefined,
                quantity,
              ),
            )
            setActionMessage(
              `${quantity} ${quantity > 1 ? 'cartas reservadas' : 'carta reservada'} a tu nombre.`,
            )
          }}
          onCancelReservation={(quantity) => {
            const remainingQuantity =
              (selectedMarketplaceItem.listing.reservedQuantity ?? 1) - quantity
            const isOwnedOffer =
              selectedMarketplaceItem.listing.memberId === currentMember.id
            onDataChange((currentData) =>
              cancelMarketplaceReservation(
                currentData,
                selectedMarketplaceItem.listing.id,
                currentMember.id,
                quantity,
              ),
            )
            setActionMessage(
              remainingQuantity > 0
                ? `Queda ${remainingQuantity} ${remainingQuantity > 1 ? 'cartas reservadas' : 'carta reservada'}.`
                : isOwnedOffer
                  ? 'La carta vuelve a estar disponible.'
                  : 'La reserva se ha cancelado.',
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
