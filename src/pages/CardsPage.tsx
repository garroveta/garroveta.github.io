import {
  ArrowLeft,
  AlertCircle,
  AtSign,
  Check,
  CheckCircle2,
  FileText,
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
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import type { ChangeEvent, FormEvent } from 'react'
import { useMemo, useState } from 'react'

import { CardImagePreview } from '../components/CardImagePreview'
import { MarketplaceReservationSheet } from '../components/MarketplaceReservationSheet'
import { MarketplaceSection } from '../components/cards/MarketplaceSection'
import {
  MatchesSection,
  type MatchGrouping,
} from '../components/cards/MatchesSection'
import {
  applyResolvedMarketplaceImport,
  applyResolvedWantedCardImport,
  addWantedCard,
  type MarketplaceImportItemInput,
  publishMarketplaceListing,
  type WantedImportMode,
  type WantedImportItemInput,
  type WantedImportResult,
} from '../data/cardMutations'
import { parseCardList, type CardListSection } from '../data/cardListImport'
import { completeCardDeal } from '../data/cardDeals'
import { matchStatusLabels } from '../data/cardMatchPresentation'
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
import { useMarketplaceReservation } from '../hooks/useMarketplaceReservation'

type CardsPageProps = {
  data: DemoDataSet
  currentMember: CommunityMember
  initialView?: 'matches' | 'market' | 'wanted'
  onDataChange: (updater: DemoDataUpdater) => void
}

const cardLanguages = Object.keys(languageLabels) as CardLanguage[]
const cardConditions = Object.keys(conditionLabels) as CardCondition[]
const MY_LISTS_PAGE_SIZE = 10

const listingStatusLabels: Record<MarketplaceListing['status'], string> = {
  available: 'Publicada',
  reserved: 'Con reserva',
  completed: 'Retirada',
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

function CardComposer({
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
  const [destination, setDestination] = useState<'offer' | 'wanted'>('offer')
  const [cardId, setCardId] = useState('')
  const [cardQuery, setCardQuery] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [language, setLanguage] = useState<CardLanguage>('es')
  const [condition, setCondition] = useState<CardCondition>('near_mint')
  const [finish, setFinish] = useState<MarketplaceListing['finish']>('nonfoil')
  const [priceEur, setPriceEur] = useState('')
  const offerLists = data.cardLists.filter(
    ({ memberId: ownerId, kind }) => ownerId === memberId && kind === 'offers',
  )
  const [cardListId, setCardListId] = useState(offerLists[0]?.id ?? '')
  const wantedLists = data.cardLists.filter(
    ({ memberId: ownerId, kind }) => ownerId === memberId && kind === 'wanted',
  )
  const selectedCard = data.cards.find(({ id }) => id === cardId)
  const normalizedCardQuery = cardQuery.trim().toLocaleLowerCase('es')
  const suggestedCards = data.cards
    .filter(
      (card) =>
        normalizedCardQuery &&
        (card.name.toLocaleLowerCase('es').includes(normalizedCardQuery) ||
          card.setName.toLocaleLowerCase('es').includes(normalizedCardQuery) ||
          card.setCode.toLocaleLowerCase('es').includes(normalizedCardQuery) ||
          card.collectorNumber.includes(cardQuery.trim())),
    )
    .slice(0, 6)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!cardId) {
      return
    }
    onDataChange((currentData) =>
      destination === 'offer'
        ? publishMarketplaceListing(currentData, {
            memberId,
            cardId,
            cardListId: cardListId || undefined,
            quantity,
            language,
            condition,
            finish,
            priceEur: priceEur ? Number(priceEur) : undefined,
          })
        : addWantedCard(currentData, {
            memberId,
            cardId,
            cardListId: cardListId || undefined,
            quantity,
            acceptedLanguage: language,
            acceptedFinish: finish,
          }),
    )
    onPublished()
  }

  return (
    <form
      className="card-composer"
      aria-label="Añadir una carta"
      onSubmit={handleSubmit}
    >
      <ComposerHeading title="Añadir una carta" onClose={onClose} />

      <div
        className="import-destination-switch"
        role="group"
        aria-label="Tipo de carta"
      >
        <button
          type="button"
          aria-pressed={destination === 'wanted'}
          onClick={() => {
            setDestination('wanted')
            setCardListId(wantedLists[0]?.id ?? '')
          }}
        >
          Busco esta carta
        </button>
        <button
          type="button"
          aria-pressed={destination === 'offer'}
          onClick={() => {
            setDestination('offer')
            setCardListId(offerLists[0]?.id ?? '')
          }}
        >
          Ofrezco esta carta
        </button>
      </div>

      <label className="form-field">
        <span>Buscar una carta</span>
        <input
          type="search"
          placeholder="Nombre, edición o número"
          value={cardQuery}
          onChange={(event) => setCardQuery(event.target.value)}
        />
      </label>

      <div
        className="card-search-suggestions"
        aria-label="Resultados de búsqueda"
      >
        {suggestedCards.map((card) => (
          <button
            key={card.id}
            className={card.id === cardId ? 'is-selected' : undefined}
            type="button"
            onClick={() => {
              setCardId(card.id)
              setCardQuery('')
            }}
          >
            <strong>{card.name}</strong>
            <span>
              {card.setName} · {card.setCode} #{card.collectorNumber}
            </span>
          </button>
        ))}
        {normalizedCardQuery && suggestedCards.length === 0 ? (
          <p>No se ha encontrado ninguna carta en el catálogo.</p>
        ) : null}
      </div>

      {selectedCard ? (
        <p className="card-composer__selection">
          Seleccionada: <strong>{selectedCard.name}</strong> ·{' '}
          {selectedCard.setCode} #{selectedCard.collectorNumber}
        </p>
      ) : null}

      <div className="card-form-grid">
        <label className="form-field">
          <span>Lista privada</span>
          <select
            value={cardListId}
            onChange={(event) => setCardListId(event.target.value)}
          >
            <option value="">Sin lista</option>
            {(destination === 'offer' ? offerLists : wantedLists).map(
              (list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ),
            )}
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
        {destination === 'offer' ? (
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
        ) : null}
        {destination === 'offer' ? (
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
        ) : null}
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
        <button className="primary-button" disabled={!cardId} type="submit">
          {destination === 'offer'
            ? 'Publicar oferta'
            : 'Añadir a mis búsquedas'}
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
  const [actionMessage, setActionMessage] = useState('')
  const [query, setQuery] = useState('')
  const [hideOwnListings, setHideOwnListings] = useState(true)
  const listings = getMarketplaceListings(data)
  const reservation = useMarketplaceReservation({
    currentMember,
    data,
    onDataChange,
    onMessage: setActionMessage,
  })
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
          Mercado de cartas MTG
        </span>
        <h1>Cartas</h1>
        <p>Busca, publica y reserva cartas de la comunidad.</p>
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
          Añadir carta
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
        <CardComposer
          data={data}
          memberId={currentMember.id}
          onClose={() => setActiveComposer(undefined)}
          onDataChange={onDataChange}
          onPublished={() => {
            setActiveComposer(undefined)
            setActiveView('market')
            setActionMessage('La carta se ha añadido a tus listas.')
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
        <MatchesSection
          grouping={matchGrouping}
          matches={matches}
          onGroupingChange={setMatchGrouping}
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
      ) : activeView === 'market' ? (
        <MarketplaceSection
          currentMemberId={currentMember.id}
          hideOwnListings={hideOwnListings}
          items={filteredListings}
          query={query}
          onHideOwnListingsChange={setHideOwnListings}
          onMemberSelect={(memberId) => {
            window.location.hash = `cartas?member=${memberId}`
          }}
          onOpen={reservation.openReservation}
          onPreview={(item) =>
            setSelectedCardPreview({
              card: item.card,
              description: `${item.card.setName} · Disponible por ${item.member.displayName}`,
            })
          }
          onQueryChange={setQuery}
        />
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
                      onCancel={() => reservation.openReservation(item)}
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
                        reservation.openReservation(item)
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
      {reservation.selectedItem ? (
        <MarketplaceReservationSheet
          key={reservation.selectedItem.listing.id}
          item={reservation.selectedItem}
          currentMember={currentMember}
          onClose={reservation.closeReservation}
          onMemberSelect={(memberId) => {
            reservation.closeReservation()
            window.location.hash = `cartas?member=${memberId}`
          }}
          onPreview={() =>
            setSelectedCardPreview({
              card: reservation.selectedItem!.card,
              description: `${reservation.selectedItem!.card.setName} · Disponible por ${reservation.selectedItem!.member.displayName}`,
            })
          }
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
