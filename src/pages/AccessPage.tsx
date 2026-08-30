import { Check, LogIn, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

import { EmailOtpForm } from '../components/EmailOtpForm'
import { PublicAccessShell } from '../components/PublicAccessShell'
import type { Community } from '../domain/types'
import { useEmailOtp } from '../hooks/useEmailOtp'

type AccessPageProps = {
  community: Community
  onComplete: () => Promise<void> | void
}

type AccessStage = 'access' | 'verification'

export function AccessPage({ community, onComplete }: AccessPageProps) {
  const [stage, setStage] = useState<AccessStage>('access')
  const emailOtp = useEmailOtp()
  const progressSteps = [
    { id: 'access', label: 'Correo' },
    { id: 'verification', label: 'Código' },
  ] as const
  const currentProgressIndex = progressSteps.findIndex(({ id }) => id === stage)

  return (
    <PublicAccessShell community={community}>
      <div className="page registration-page access-page">
        <header className="registration-heading">
          <span className="page-eyebrow">
            <LogIn aria-hidden="true" size={15} />
            Acceso a Garroveta
          </span>
          <h1>Entra en tu comunidad</h1>
          <p>
            Garroveta es un espacio privado para los miembros de{' '}
            {community.name}. Accede sin contraseña con el código temporal que
            recibirás por correo.
          </p>
        </header>

        <ol
          className="registration-progress registration-progress--access"
          aria-label="Progreso del acceso"
        >
          {progressSteps.map(({ id, label }, index) => {
            const isCurrent = stage === id
            const isComplete = currentProgressIndex > index

            return (
              <li
                aria-current={isCurrent ? 'step' : undefined}
                className={isComplete ? 'registration-progress__complete' : ''}
                key={id}
              >
                <span>{isComplete ? <Check size={15} /> : index + 1}</span>
                {label}
              </li>
            )
          })}
        </ol>

        <EmailOtpForm
          accessDescription="Introduce el correo asociado a tu cuenta."
          accessTitle="Acceso de miembros"
          approvalNote={
            <>
              <strong>Acceso reservado</strong>
              Solo los miembros validados de {community.name} pueden entrar. Si
              todavía no tienes cuenta, solicita una invitación al gerente.
            </>
          }
          flow={emailOtp}
          stage={stage}
          onStageChange={setStage}
          onVerified={() => void onComplete()}
        />

        <p className="access-page__security-note">
          <ShieldCheck aria-hidden="true" size={16} />
          El código caduca a los diez minutos y solo puede utilizarse una vez.
        </p>
      </div>
    </PublicAccessShell>
  )
}
