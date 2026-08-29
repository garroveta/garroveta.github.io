import { ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'

import type { Community } from '../domain/types'

type PublicAccessShellProps = {
  badge?: string
  children: ReactNode
  community: Community
}

export function PublicAccessShell({
  badge = 'Acceso privado',
  children,
  community,
}: PublicAccessShellProps) {
  return (
    <div className="registration-shell">
      <header className="registration-site-header">
        <span className="registration-brand" aria-label="Garroveta">
          <span
            className={`brand__mark${community.logoUrl ? ' brand__mark--image' : ''}`}
            aria-hidden="true"
          >
            {community.logoUrl ? <img src={community.logoUrl} alt="" /> : 'G'}
          </span>
          <span className="brand__text">
            <strong>Garroveta</strong>
            <small>
              {community.name} · {community.city}
            </small>
          </span>
        </span>
        <span className="registration-access-badge">
          <ShieldCheck aria-hidden="true" size={16} />
          {badge}
        </span>
      </header>
      <main className="registration-main" id="main-content">
        {children}
      </main>
    </div>
  )
}
