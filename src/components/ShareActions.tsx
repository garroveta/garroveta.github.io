import { Check, Copy, MessageCircle } from 'lucide-react'
import { useState } from 'react'

import { getWhatsAppShareUrl } from '../data/whatsAppSharing'

type ShareActionsProps = {
  className?: string
  copyAriaLabel?: string
  copyButtonClassName?: string
  copiedLabel?: string
  copyErrorMessage?: string
  copyLabel?: string
  copySuccessMessage?: string
  copyText?: string
  disabled?: boolean
  feedbackClassName?: string
  hideLabels?: boolean
  onFeedback?: (message: string) => void
  shareAriaLabel?: string
  shareButtonClassName?: string
  shareErrorMessage?: string
  shareLabel?: string
  shareSuccessMessage?: string
  shareText: string
  showCopy?: boolean
  showFeedback?: boolean
  showShare?: boolean
}

const defaultMessages = {
  copyError: 'No se ha podido copiar el mensaje.',
  copySuccess: 'Mensaje copiado. Ya puedes pegarlo en WhatsApp.',
  shareError: 'No se ha podido abrir WhatsApp. Prueba a copiar el mensaje.',
  shareSuccess:
    'WhatsApp se ha abierto. Elige el grupo o contacto y pulsa enviar.',
}

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()

  if (!copied) {
    throw new Error('Clipboard unavailable')
  }
}

export function ShareActions({
  className = '',
  copyAriaLabel,
  copyButtonClassName,
  copiedLabel = 'Mensaje copiado',
  copyErrorMessage = defaultMessages.copyError,
  copyLabel = 'Copiar mensaje',
  copySuccessMessage = defaultMessages.copySuccess,
  copyText,
  disabled = false,
  feedbackClassName = '',
  hideLabels = false,
  onFeedback,
  shareAriaLabel,
  shareButtonClassName,
  shareErrorMessage = defaultMessages.shareError,
  shareLabel = 'Enviar por WhatsApp',
  shareSuccessMessage = defaultMessages.shareSuccess,
  shareText,
  showCopy = true,
  showFeedback = true,
  showShare = true,
}: ShareActionsProps) {
  const contentKey = `${shareText}\u0000${copyText ?? ''}`
  const [copiedContentKey, setCopiedContentKey] = useState<string>()
  const [feedbackState, setFeedbackState] = useState<{
    contentKey: string
    message: string
  }>()
  const copied = copiedContentKey === contentKey
  const feedback =
    feedbackState?.contentKey === contentKey ? feedbackState.message : ''

  const publishFeedback = (message: string) => {
    setFeedbackState({ contentKey, message })
    onFeedback?.(message)
  }

  const shareOnWhatsApp = () => {
    const opened = window.open(
      getWhatsAppShareUrl(shareText),
      '_blank',
      'noopener,noreferrer',
    )
    publishFeedback(opened ? shareSuccessMessage : shareErrorMessage)
  }

  const copyMessage = async () => {
    try {
      await copyToClipboard(copyText ?? shareText)
      setCopiedContentKey(contentKey)
      publishFeedback(copySuccessMessage)
    } catch {
      setCopiedContentKey(undefined)
      publishFeedback(copyErrorMessage)
    }
  }

  return (
    <div className={`share-actions ${className}`.trim()}>
      {showShare ? (
        <button
          aria-label={shareAriaLabel ?? shareLabel}
          className={shareButtonClassName}
          disabled={disabled || !shareText}
          title={hideLabels ? shareLabel : undefined}
          type="button"
          onClick={shareOnWhatsApp}
        >
          <MessageCircle aria-hidden="true" size={16} />
          {hideLabels ? null : shareLabel}
        </button>
      ) : null}
      {showCopy ? (
        <button
          aria-label={copyAriaLabel ?? copyLabel}
          className={copyButtonClassName}
          data-copied={copied ? 'true' : 'false'}
          disabled={disabled || !(copyText ?? shareText)}
          title={hideLabels ? copyLabel : undefined}
          type="button"
          onClick={() => void copyMessage()}
        >
          {copied ? (
            <Check aria-hidden="true" size={16} />
          ) : (
            <Copy aria-hidden="true" size={16} />
          )}
          {hideLabels ? null : copied ? copiedLabel : copyLabel}
        </button>
      ) : null}
      {showFeedback ? (
        <span className={feedbackClassName} aria-live="polite">
          {feedback}
        </span>
      ) : null}
    </div>
  )
}
