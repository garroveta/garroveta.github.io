import { CheckCircle2, ClipboardCopy, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { CommunityEventWriteInput } from '../api/communityEvents'
import { isCommunityOptionActive } from '../data/communityOptions'
import {
  buildWeeklyEventAiPrompt,
  nextWeekMonday,
  parseWeeklyEventImport,
  type WeeklyEventPreview,
} from '../data/weeklyEventImport'
import type { CommunityEvent, DemoDataSet } from '../domain/types'
import { addCalendarDays } from '../utils/madridEventTime'
import { EVENT_TYPE_LABELS } from '../data/registrationSettings'

type WeeklyEventImportPanelProps = {
  data: DemoDataSet
  onClose: () => void
  onCreateEvent: (input: CommunityEventWriteInput) => Promise<CommunityEvent>
}

export function WeeklyEventImportPanel({
  data,
  onClose,
  onCreateEvent,
}: WeeklyEventImportPanelProps) {
  const [weekStart, setWeekStart] = useState(nextWeekMonday)
  const [source, setSource] = useState('')
  const [preview, setPreview] = useState<WeeklyEventPreview>()
  const [createdIndexes, setCreatedIndexes] = useState<number[]>([])
  const [feedback, setFeedback] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const importableCount =
    preview?.rows.filter((row) => !row.duplicate).length ?? 0

  async function copyInstructions() {
    try {
      await navigator.clipboard.writeText(
        buildWeeklyEventAiPrompt(data, weekStart),
      )
      setFeedback('Instrucciones copiadas. Pégalas en tu asistente de IA.')
    } catch {
      setFeedback(
        'No se han podido copiar. Revisa el permiso del portapapeles.',
      )
    }
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = parseWeeklyEventImport(source, data)
    setPreview(result)
    setCreatedIndexes([])
    setFeedback(
      result.errors.length
        ? 'Corrige el JSON en tu asistente y vuelve a revisarlo. No se ha creado ningún evento.'
        : `Semana revisada: ${result.rows.length} eventos, ${result.rows.filter((row) => row.duplicate).length} duplicados.`,
    )
  }

  async function confirm() {
    if (!preview || preview.errors.length || !importableCount || isSaving)
      return
    const updated = parseWeeklyEventImport(source, data)
    if (
      updated.errors.length ||
      updated.weekStart !== preview.weekStart ||
      updated.rows.length !== preview.rows.length
    ) {
      setPreview(updated)
      setFeedback(
        'Los datos han cambiado. Revisa de nuevo la semana antes de crearla.',
      )
      return
    }

    setIsSaving(true)
    setFeedback('Creando eventos…')
    const completed = new Set(createdIndexes)

    for (const [index, row] of updated.rows.entries()) {
      if (row.duplicate || completed.has(index)) continue
      try {
        await onCreateEvent(row.input)
        completed.add(index)
        setCreatedIndexes([...completed])
      } catch {
        setFeedback(
          `Se han creado ${completed.size} eventos. Ha fallado «${row.title}»; los restantes no se han creado. Puedes volver a intentarlo.`,
        )
        setIsSaving(false)
        return
      }
    }

    setFeedback(
      `${completed.size} eventos creados. Comprueba la agenda antes de generar o compartir el cartel semanal.`,
    )
    setIsSaving(false)
  }

  return (
    <div className="weekly-event-import" aria-labelledby="weekly-import-title">
      <div className="weekly-event-import__heading">
        <div>
          <span>Planificación semanal</span>
          <h3 id="weekly-import-title">Crear una semana con tu IA</h3>
          <p>
            La aplicación revisa los datos; la imagen del calendario no crea
            eventos por sí sola.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar importación semanal"
          disabled={isSaving}
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>

      <div className="weekly-event-import__step">
        <label className="form-field">
          <span>Lunes de la nueva semana</span>
          <input
            type="date"
            value={weekStart}
            disabled={isSaving}
            onChange={(event) => {
              const chosen = event.target.value
              if (!chosen) return
              const weekday = new Date(`${chosen}T12:00:00Z`).getUTCDay()
              setWeekStart(
                addCalendarDays(chosen, -(weekday === 0 ? 6 : weekday - 1)),
              )
            }}
          />
        </label>
        <button
          className="secondary-button"
          type="button"
          onClick={copyInstructions}
        >
          <ClipboardCopy aria-hidden="true" size={17} />
          Copiar instrucciones para la IA
        </button>
        <p>
          Incluyen las últimas cuatro semanas con eventos publicados y las
          opciones activas de la comunidad. Ajusta la propuesta con tu IA antes
          de pedirle el JSON final.
        </p>
      </div>

      <form className="weekly-event-import__step" onSubmit={review}>
        <label className="form-field">
          <span>JSON de la semana aprobada</span>
          <textarea
            value={source}
            onChange={(event) => {
              setSource(event.target.value)
              setPreview(undefined)
              setCreatedIndexes([])
              setFeedback('')
            }}
            placeholder='{"weekStart":"2026-09-21","events":[...]}'
            rows={5}
            required
            disabled={isSaving}
          />
        </label>
        <button className="secondary-button" type="submit" disabled={isSaving}>
          Revisar semana
        </button>
      </form>

      {preview ? (
        <section
          className="weekly-event-import__preview"
          aria-label="Vista previa de la semana"
        >
          <h4>Semana del {preview.weekStart || '—'}</h4>
          {preview.errors.length ? (
            <ul className="weekly-event-import__errors">
              {preview.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : (
            <>
              <ul className="weekly-event-import__rows">
                {preview.rows.map((row, index) => {
                  const game = data.games.find(
                    (item) =>
                      item.id === row.input.gameId &&
                      isCommunityOptionActive(item),
                  )
                  const format = data.competitionFormats.find(
                    (item) => item.id === row.input.formatId,
                  )
                  const created = createdIndexes.includes(index)
                  return (
                    <li key={`${row.input.startsAt}-${index}`}>
                      <time dateTime={row.input.startsAt}>
                        {row.date.slice(5)} · {row.time}–
                        {row.input.endsAt?.slice(11, 16)}
                      </time>
                      <span>
                        <strong>{row.title}</strong>
                        <small>
                          {game?.shortName ?? row.input.gameId} ·{' '}
                          {format?.shortName ??
                            EVENT_TYPE_LABELS[row.input.type]}{' '}
                          ·{' '}
                          {row.input.registrationEnabled
                            ? `${row.input.capacity} plazas`
                            : 'Sin inscripciones'}
                          {row.input.countsForCommunityRanking
                            ? ' · Ranking'
                            : ''}
                        </small>
                      </span>
                      <em>
                        {created ? (
                          <>
                            <CheckCircle2 aria-hidden="true" size={14} /> Creado
                          </>
                        ) : row.duplicate ? (
                          'Ya existe'
                        ) : (
                          'Nuevo'
                        )}
                      </em>
                      <details>
                        <summary>Ver descripción y opciones</summary>
                        <p>{row.input.description}</p>
                        <p>
                          {EVENT_TYPE_LABELS[row.input.type]}
                          {row.input.registrationEnabled &&
                          row.input.waitlistEnabled
                            ? ' · Lista de espera'
                            : ''}
                          {row.input.countsForCommunityRanking
                            ? ' · Ranking comunitario'
                            : ''}
                          {row.input.competitionEventKindId
                            ? ` · Serie: ${data.competitionEventKinds.find((item) => item.id === row.input.competitionEventKindId)?.name}`
                            : ''}
                        </p>
                        {row.input.imageUri ? (
                          <p>Cartel: {row.input.imageUri}</p>
                        ) : null}
                      </details>
                    </li>
                  )
                })}
              </ul>
              <p>
                Los duplicados (mismo nombre y comienzo) se omiten. No se
                modifican los eventos existentes.
              </p>
              {importableCount > createdIndexes.length ? (
                <button
                  className="primary-button"
                  type="button"
                  onClick={confirm}
                  disabled={isSaving}
                >
                  {isSaving
                    ? 'Creando…'
                    : `Crear ${importableCount - createdIndexes.length} ${importableCount - createdIndexes.length === 1 ? 'evento' : 'eventos'}`}
                </button>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {feedback ? (
        <p className="weekly-event-import__feedback" role="status">
          {feedback}
        </p>
      ) : null}
    </div>
  )
}
