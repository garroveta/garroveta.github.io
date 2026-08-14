import type { CardCondition, CardLanguage } from '../domain/types'

export const cardLanguageLabels: Record<CardLanguage, string> = {
  es: 'Español',
  en: 'Inglés',
  fr: 'Francés',
  de: 'Alemán',
  it: 'Italiano',
  pt: 'Portugués',
  jp: 'Japonés',
}

export const cardConditionLabels: Record<CardCondition, string> = {
  mint: 'Mint',
  near_mint: 'Near Mint',
  excellent: 'Excellent',
  good: 'Good',
}

export function formatMarketplacePrice(priceEur?: number) {
  return priceEur ? `${priceEur.toFixed(2)} €` : 'A convenir'
}
