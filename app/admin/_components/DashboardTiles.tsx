'use client'

import Link from 'next/link'
import { useCanAccessMobileView } from '@/lib/useDeviceType'

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

export function DashboardTiles({ tiles, pageAccess }: DashboardTilesProps) {
  const canAccessMobile = useCanAccessMobileView()

  // Don't render until device type is detected (prevents hydration mismatch)
  if (canAccessMobile === null) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Loading skeleton */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 rounded-xl border border-slate-200 bg-slate-50 animate-pulse" />
        ))}
      </div>
    )
  }

  // Filter tiles based on permissions and device type
  // "Ops du jour" (today) is hidden on desktop, shown on mobile and tablet
  const filteredTiles = tiles.filter((tile) => {
    // Check permission first
    if (!pageAccess[tile.key]) {
      return false
    }
    // Hide "Ops du jour" on desktop - only show on mobile and tablet
    if (tile.key === 'today' && !canAccessMobile) {
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
