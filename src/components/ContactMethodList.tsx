import { AtSign, Mail, MessageCircle } from 'lucide-react'

import type { ContactMethod } from '../domain/types'

const contactIcons = {
  whatsapp: MessageCircle,
  email: Mail,
  discord: AtSign,
}

/**
 * A WhatsApp contact is free text — some members write "ask in the group" —
 * so it only becomes a link when it clearly is a phone number.
 */
function contactHref({ kind, value }: ContactMethod) {
  if (kind === 'email') {
    return `mailto:${value}`
  }

  if (kind === 'whatsapp') {
    const digits = value.replace(/[\s().-]/g, '')

    return /^\+?\d{7,15}$/.test(digits)
      ? `https://wa.me/${digits.replace(/^\+/, '')}`
      : undefined
  }

  return undefined
}

type ContactMethodListProps = {
  contactMethods: ContactMethod[]
  emptyMessage?: string
}

/** The same contact card wherever a member's details are shown. */
export function ContactMethodList({
  contactMethods,
  emptyMessage = 'Este miembro no ha indicado ninguna forma de contacto.',
}: ContactMethodListProps) {
  return (
    <div className="contact-methods">
      {contactMethods.map((contactMethod) => {
        const ContactIcon = contactIcons[contactMethod.kind]
        const href = contactHref(contactMethod)

        return (
          <div key={`${contactMethod.kind}-${contactMethod.value}`}>
            <ContactIcon aria-hidden="true" size={18} />
            <span>
              <small>{contactMethod.label}</small>
              {href ? (
                <a href={href} rel="noreferrer" target="_blank">
                  <strong>{contactMethod.value}</strong>
                </a>
              ) : (
                <strong>{contactMethod.value}</strong>
              )}
            </span>
          </div>
        )
      })}
      {contactMethods.length === 0 ? (
        <p className="contact-methods__empty">{emptyMessage}</p>
      ) : null}
    </div>
  )
}
