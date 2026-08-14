import type { CardMatch } from '../domain/types'

export const matchStatusLabels: Record<CardMatch['status'], string> = {
  new: 'Nueva',
  seen: 'Vista',
  contacted: 'Contactado',
  completed: 'Completada',
}
