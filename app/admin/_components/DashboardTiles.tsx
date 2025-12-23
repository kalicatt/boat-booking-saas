'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Capacitor } from '@capacitor/core'

type DashboardTileData = {
  key: string
  href: string
  label: string
  description: string
  icon: string
  iconClass: string
  hoverBorder: string
  hoverText: string
}

type DashboardTilesProps = {
  tiles: DashboardTileData[]
  pageAccess: Record<string, boolean>
}

// Strict mobile detection - only true for actual mobile devices, not small desktop windows
function useIsMobileDevice(): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if running in Capacitor native app
    try {
      if (Capacitor?.isNativePlatform?.()) {
        setIsMobile(true)
        return
      }
    } catch {
      // ignore
    }

    // Check user agent for mobile devices
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || ''
      // Match actual mobile devices, not just small screens
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i
      if (mobileRegex.test(ua)) {
        setIsMobile(true)
        return
      }
    }

    // Not a mobile device
    setIsMobile(false)
  }, [])

  return isMobile
}

export function DashboardTiles({ tiles, pageAccess }: DashboardTilesProps) {
  const isMobile = useIsMobileDevice()

  // Don't render until we know if it's mobile or not (prevents flash)
  if (isMobile === null) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Loading skeleton */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 rounded-xl border border-slate-200 bg-slate-50 animate-pulse" />
        ))}
      </div>
    )
  }

  // Filter tiles based on platform - hide "today" on desktop
  const filteredTiles = tiles.filter((tile) => {
    // Check permission first
    if (!pageAccess[tile.key]) {
      return false
    }
    // Hide "Ops du jour" (today) on desktop - only show on mobile devices
    if (tile.key === 'today' && !isMobile) {
      return false
    }
    return true
  })

  const hasAnyTile = filteredTiles.length > 0

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredTiles.map((tile) => (
          <Link
            key={tile.key}
            href={tile.href}
            className="group relative overflow-hidden bg-white rounded-xl border border-slate-200 p-6 transition-all hover:shadow-lg hover:border-sky-300 hover:-translate-y-0.5"
          >
            {/* Icon */}
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg text-2xl ${tile.iconClass}`}>
              {tile.icon}
            </div>
          
            {/* Content */}
            <h3 className={`text-lg font-semibold text-slate-900 mb-2 transition ${tile.hoverText}`}>
              {tile.label}
            </h3>
            <p className="text-sm text-slate-600 line-clamp-2">
              {tile.description}
            </p>

            {/* Hover indicator */}
            <div className="absolute top-0 right-0 w-1 h-full bg-sky-600 transform translate-x-full group-hover:translate-x-0 transition-transform" />
          </Link>
        ))}
      </div>

      {!hasAnyTile && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h3 className="text-lg font-semibold text-amber-900 mb-2">Accès limité</h3>
          <p className="text-sm text-amber-800">
            Aucune section n&apos;est active pour votre compte. Contactez un administrateur pour obtenir les accès nécessaires.
          </p>
        </div>
      )}
    </>
  )
}
