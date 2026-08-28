import { emailOTPClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

import { apiOrigin } from '../api/client'

export const authClient = createAuthClient({
  basePath: '/api/auth',
  baseURL: apiOrigin,
  plugins: [emailOTPClient()],
})
