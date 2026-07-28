import { useState } from 'react'

import type { DemoRole } from '../app/demoRoles'

const defaultDemoRole: DemoRole = 'jugador'

export function useDemoRole() {
  const [activeRole, setActiveRole] = useState<DemoRole>(defaultDemoRole)

  const resetRole = () => {
    setActiveRole(defaultDemoRole)
  }

  return {
    activeRole,
    setActiveRole,
    resetRole,
  }
}
