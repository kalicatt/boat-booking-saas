'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useSWRConfig } from 'swr'

const DEFAULT_ENDPOINT = '/api/admin/weather'

type WeatherRefreshButtonProps = {
  endpoint?: string
  className?: string
}

export function WeatherRefreshButton({ endpoint = DEFAULT_ENDPOINT, className }: WeatherRefreshButtonProps) {
  const { mutate } = useSWRConfig()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleClick = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      await mutate(endpoint)
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isRefreshing}
      className={`inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ''}`.trim()}
    >
      <RotateCcw className="h-3.5 w-3.5" />
      {isRefreshing ? 'Actualisation…' : 'Rafraîchir la météo'}
    </button>
  )
}
