import { betterAuth } from 'better-auth'
import { emailOTP } from 'better-auth/plugins'
import { Resend } from 'resend'

export interface AuthEnv extends Env {
  BETTER_AUTH_SECRET: string
  RESEND_API_KEY: string
}

interface CreateAuthOptions {
  context: ExecutionContext
  env: AuthEnv
  request: Request
}

function getAuthBaseUrl(request: Request, productionUrl: string) {
  const requestUrl = new URL(request.url)
  const isLocalRequest =
    requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1'

  return isLocalRequest ? requestUrl.origin : productionUrl
}

function getOtpSubject(type: string) {
  if (type === 'sign-in') {
    return 'Tu código de acceso a Garroveta'
  }

  if (type === 'email-verification') {
    return 'Confirma tu correo electrónico en Garroveta'
  }

  return 'Tu código de seguridad de Garroveta'
}

function getOtpText(otp: string) {
  return [
    `Tu código de Garroveta es: ${otp}`,
    '',
    'Caduca dentro de 10 minutos.',
    'Si no has solicitado este código, puedes ignorar este correo.',
  ].join('\n')
}

export function createAuth({ context, env, request }: CreateAuthOptions) {
  return betterAuth({
    appName: 'Garroveta',
    baseURL: getAuthBaseUrl(request, env.BETTER_AUTH_URL),
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [
      env.APP_ORIGIN,
      'https://www.garroveta.es',
      'http://localhost:5173',
    ],
    plugins: [
      emailOTP({
        allowedAttempts: 3,
        expiresIn: 600,
        storeOTP: 'hashed',
        async sendVerificationOTP({ email, otp, type }) {
          const resend = new Resend(env.RESEND_API_KEY)

          context.waitUntil(
            resend.emails
              .send({
                from: env.RESEND_FROM_EMAIL,
                to: email,
                subject: getOtpSubject(type),
                text: getOtpText(otp),
              })
              .then(({ error }) => {
                if (error) {
                  throw new Error(
                    `Resend rejected the OTP email: ${error.message}`,
                  )
                }
              })
              .catch((error: unknown) => {
                console.error('Unable to send authentication email', error)
              }),
          )
        },
      }),
    ],
  })
}
