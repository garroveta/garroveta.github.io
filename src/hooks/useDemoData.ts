import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  createLocalDemoRepository,
  type DemoDataRepository,
  type DemoDataUpdater,
} from '../data/demoRepository'

export function useDemoData(repositoryOverride?: DemoDataRepository) {
  const repository = useMemo(
    () => repositoryOverride ?? createLocalDemoRepository(window.localStorage),
    [repositoryOverride],
  )
  const [data, setData] = useState(() => repository.load())

  useEffect(() => {
    repository.save(data)
  }, [data, repository])

  const updateData = useCallback((updater: DemoDataUpdater) => {
    setData((currentData) =>
      typeof updater === 'function' ? updater(currentData) : updater,
    )
  }, [])

  const resetData = useCallback(() => {
    setData(repository.reset())
  }, [repository])

  return {
    data,
    updateData,
    resetData,
  }
}
