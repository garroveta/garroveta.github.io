import { DatabaseSync } from 'node:sqlite'
import { betterAuth } from 'better-auth'
import { emailOTP } from 'better-auth/plugins'

export const auth = betterAuth({
  database: new DatabaseSync(':memory:'),
  plugins: [
    emailOTP({
      allowedAttempts: 3,
      expiresIn: 600,
      storeOTP: 'hashed',
      async sendVerificationOTP() {
        // Schema generation does not send email.
      },
    }),
  ],
})
