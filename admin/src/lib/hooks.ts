import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage } from './api'

export function useApi<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(!!path)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<number | null>(null)

  const reload = useCallback(async () => {
    if (!path) return
    setLoading(true)
    try {
      setData(await api<T>(path))
      setError(null)
      setStatus(null)
    } catch (e) {
      setError(errorMessage(e))
      setStatus((e as { status?: number }).status ?? null)
    } finally {
      setLoading(false)
    }
  }, [path])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, setData, loading, error, forbidden: status === 403, reload }
}
