import type { CommunityBadgeSetting, CommunityBadgeSettings } from './types'

export type BadgeFamily =
  'attendance' | 'top4' | 'titles' | 'formats' | 'field' | 'season'

export type BadgeCounter =
  | 'played'
  | 'topFour'
  | 'topFourStreak'
  | 'titles'
  | 'formats'
  | 'titleFormats'
  | 'bigWins'

export type BadgeDefinition = {
  id: string
  name: string
  /** The Magic rule the name comes from, in Spanish. Not configurable. */
  reference: string
  family: BadgeFamily
  /** Counted results and threshold, absent when the closing decides the badge. */
  counter?: BadgeCounter
  target?: number
  /** Place to hold in the final ranking of a closed season. */
  finalRank?: number
}

/** A definition with the sentence describing its current threshold. */
export type ResolvedBadge = BadgeDefinition & { description: string }

/**
 * Named in the players' own words: a Magic player finishes in the Top 4, never
 * "on a podium". Kept short on purpose: a badge nobody can name is a badge
 * nobody wants, and
 * one that everybody holds is worth nothing. Thresholds are sized for two to
 * three MTG tournaments a week, around 65 counted events a season, played by
 * 25 to 50 ranked members. A community with another rhythm changes them here,
 * in one place.
 *
 * Names stay gender neutral: every badge is worn by any member.
 *
 * `reference` is the Spanish reminder text as printed on real cards
 * (in parentheses), pulled from current, non-token printings via the
 * Scryfall API — e.g. https://api.scryfall.com/cards/search?q=keyword:
 * vigilance+lang:es — and cross-checked across several recent cards per
 * keyword so a one-off variant reminder isn't mistaken for the norm.
 * Six badges have no such text because no single card carries it:
 * Ferocious, Delirium and Domain are ability words (Comprehensive Rules
 * 207.2c) whose effect is spelled out fresh on every card; Saga's
 * reminder embeds its own final chapter number, so no one card's wording
 * generalizes; the legend rule and the Monarch are background rules,
 * never printed as a single reminder. Their entries describe the rule in
 * plain prose instead (Comprehensive Rules 704.5j and 724). Paragon is
 * not an official term at all — no keyword, no ability word, nothing in
 * the Comprehensive Rules — and says so.
 */
export const SEASON_BADGES: BadgeDefinition[] = [
  {
    id: 'vigilance',
    name: 'Vigilance',
    reference: 'Vigilancia. (Esta criatura no se gira al atacar.)',
    family: 'attendance',
    counter: 'played',
    target: 6,
  },
  {
    id: 'persist',
    name: 'Persist',
    reference:
      'Persistir. (Cuando esta criatura muera, si no tenía contadores -1/-1 sobre ella, regrésala al campo de batalla bajo el control de su propietario con un contador -1/-1 sobre ella.)',
    family: 'attendance',
    counter: 'played',
    target: 15,
  },
  {
    id: 'saga',
    name: 'Saga',
    reference:
      'Saga: subtipo de encantamiento cuyas habilidades de capítulo actúan a lo largo de los turnos para contar una historia.',
    family: 'attendance',
    counter: 'played',
    target: 30,
  },
  {
    id: 'ferocious',
    name: 'Ferocious',
    reference:
      'Ferocidad: palabra de habilidad sin texto de reglas fijo; en sus cartas suele activarse si controlas una criatura con fuerza 4 o mayor.',
    family: 'top4',
    counter: 'topFour',
    target: 4,
  },
  {
    id: 'citys-blessing',
    name: "City's Blessing",
    reference:
      'Ascender. (Si controlas diez o más permanentes, obtienes la bendición de la ciudad durante el resto del juego.)',
    family: 'top4',
    counter: 'topFour',
    target: 10,
  },
  {
    id: 'prowess',
    name: 'Prowess',
    reference:
      'Destreza. (Siempre que lances un hechizo que no sea de criatura, esta criatura obtiene +1/+1 hasta el final del turno.)',
    family: 'top4',
    counter: 'topFourStreak',
    target: 3,
  },
  {
    id: 'storm',
    name: 'Storm',
    reference:
      'Tormenta. (Cuando lances este hechizo, cópialo por cada hechizo lanzado antes que él en este turno. Puedes elegir nuevos objetivos para las copias.)',
    family: 'top4',
    counter: 'topFourStreak',
    target: 6,
  },
  {
    id: 'deathtouch',
    name: 'Deathtouch',
    reference:
      'Toque mortal. (Cualquier cantidad de daño que esto haga a una criatura es suficiente para destruirla.)',
    family: 'titles',
    counter: 'titles',
    target: 3,
  },
  {
    id: 'annihilator',
    name: 'Annihilator',
    reference:
      'Aniquilador N. (Siempre que esta criatura ataque, el jugador defensor sacrifica N permanentes.)',
    family: 'titles',
    counter: 'titles',
    target: 6,
  },
  {
    id: 'legendary',
    name: 'Legendary',
    reference:
      'Legendario — regla de leyendas: si un jugador controla dos o más permanentes legendarios con el mismo nombre, todos salvo uno van al cementerio.',
    family: 'titles',
    counter: 'titles',
    target: 10,
  },
  {
    id: 'delirium',
    name: 'Delirium',
    reference:
      'Delirio: palabra de habilidad sin texto de reglas fijo; en sus cartas suele activarse con cuatro o más tipos de carta en tu cementerio.',
    family: 'formats',
    counter: 'formats',
    target: 4,
  },
  {
    id: 'domain',
    name: 'Domain',
    reference:
      'Dominio: palabra de habilidad sin texto de reglas fijo; en sus cartas suele contar los tipos de tierra básica que controlas.',
    family: 'formats',
    counter: 'formats',
    target: 5,
  },
  {
    id: 'changeling',
    name: 'Changeling',
    reference: 'Cambiaformas. (Esta carta es de todos los tipos de criatura.)',
    family: 'formats',
    counter: 'titleFormats',
    target: 2,
  },
  {
    id: 'melee',
    name: 'Melee',
    reference:
      'Reyerta — nombre oficial en español de Melee. (Siempre que esta criatura ataque, obtiene +1/+1 hasta el final del turno por cada oponente al que atacaste este combate.)',
    family: 'field',
    counter: 'bigWins',
    target: 1,
  },
  {
    id: 'paragon',
    name: 'Paragon',
    reference:
      'Paragon no aparece en las Reglas Completas: no es una habilidad ni una palabra de habilidad oficial, solo describe a las criaturas que refuerzan a las de su propio tipo.',
    family: 'season',
    finalRank: 3,
  },
  {
    id: 'monarch',
    name: 'Monarch',
    reference:
      'El Monarca: roba una carta al comienzo de su paso final; quien le inflige daño de combate le arrebata el título.',
    family: 'season',
    finalRank: 1,
  },
]

/**
 * A Top 4 only means something once it is not most of the room: a four player
 * draft or a six player evening says nothing about how well anyone finished.
 * Events below this size are left out of the Top 4 count entirely, so playing
 * one never breaks a streak either.
 */
export const RANKED_FIELD = 8

/** Field size from which winning an event says something on its own. */
export const CROWDED_FIELD = 24

function countOf(value: number, one: string, many: string) {
  return `${value} ${value === 1 ? one : many}`
}

/**
 * The sentence a badge shows is derived from its counter and its threshold, so
 * a manager who raises a target can never leave a description behind claiming
 * the old one.
 */
function describeBadge({ counter, target, finalRank }: BadgeDefinition) {
  if (finalRank !== undefined) {
    return finalRank === 1
      ? 'Acaba primero de la clasificación final'
      : `Acaba entre los ${finalRank} primeros de la clasificación final`
  }

  const value = target ?? 0

  switch (counter) {
    case 'played':
      return `Juega ${countOf(value, 'evento puntuable', 'eventos puntuables')}`
    case 'topFour':
      return `Termina ${countOf(value, 'vez', 'veces')} en el Top 4 (mínimo ${RANKED_FIELD} jugadores)`
    case 'topFourStreak':
      return `Termina ${value} ${value === 1 ? 'vez seguida' : 'veces seguidas'} en el Top 4`
    case 'titles':
      return `Gana ${countOf(value, 'evento puntuable', 'eventos puntuables')}`
    case 'formats':
      return `Puntúa en ${countOf(value, 'formato distinto', 'formatos distintos')}`
    case 'titleFormats':
      return `Gana eventos en ${countOf(value, 'formato distinto', 'formatos distintos')}`
    case 'bigWins':
      return `Gana ${value === 1 ? 'un evento' : `${value} eventos`} de ${CROWDED_FIELD} jugadores o más`
    default:
      return ''
  }
}

/** The catalogue as shipped, the starting point a community can adjust. */
export function getDefaultBadgeSettings(): CommunityBadgeSettings {
  return {
    badges: SEASON_BADGES.map(({ id, name, target }) =>
      target === undefined ? { id, name } : { id, name, target },
    ),
  }
}

/**
 * Merges the community settings over the catalogue shipped in code: a badge
 * added later appears on its own, and a setting left over from a badge that no
 * longer exists is ignored rather than resurrecting it.
 */
export function resolveSeasonBadges(
  settings?: CommunityBadgeSettings,
): ResolvedBadge[] {
  const overrides = new Map(
    (settings?.badges ?? []).map((badge) => [badge.id, badge]),
  )

  return SEASON_BADGES.map((definition) => {
    const override = overrides.get(definition.id)
    const resolved: BadgeDefinition = override
      ? {
          ...definition,
          name: override.name.trim() || definition.name,
          ...(definition.counter !== undefined && override.target !== undefined
            ? { target: override.target }
            : {}),
        }
      : definition

    return { ...resolved, description: describeBadge(resolved) }
  })
}

/**
 * The full list a season freezes: every badge with the name and threshold in
 * force, so a later change of settings — or of the code catalogue — can never
 * take back what the season handed out. Also the right way to initialize an
 * editable form: an empty override array means "use the defaults", and this
 * fills them in instead of leaving every field blank.
 */
export function snapshotBadgeSettings(
  settings?: CommunityBadgeSettings,
): CommunityBadgeSetting[] {
  return resolveSeasonBadges(settings).map(({ id, name, target }) =>
    target === undefined ? { id, name } : { id, name, target },
  )
}

const MAX_NAME_LENGTH = 40

/** Far above any sensible threshold, low enough to catch a typed mistake. */
const MAX_TARGET = 999

/**
 * A setting may only rename a badge and move its threshold. The counter stays
 * in code because it is logic, and the description is generated from the
 * threshold so it can never contradict it.
 */
export function isCommunityBadgeSettingsValid(
  settings: CommunityBadgeSettings,
) {
  const catalogue = new Map(SEASON_BADGES.map((badge) => [badge.id, badge]))
  const ids = settings.badges.map(({ id }) => id)

  return (
    new Set(ids).size === ids.length &&
    settings.badges.every(({ id, name, target }) => {
      const definition = catalogue.get(id)
      const trimmedName = name.trim()

      if (
        !definition ||
        trimmedName.length < 1 ||
        trimmedName.length > MAX_NAME_LENGTH
      ) {
        return false
      }

      return definition.counter === undefined
        ? target === undefined
        : target !== undefined &&
            Number.isInteger(target) &&
            target >= 1 &&
            target <= MAX_TARGET
    })
  )
}
