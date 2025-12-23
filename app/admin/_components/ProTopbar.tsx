'use client'

import Link from 'next/link'
import { WeatherBadge } from './WeatherBadge'

export function ProTopbar() {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Breadcrumb / Page title will go here */}
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Weather */}
          <Link href="/admin/weather" className="inline-flex">
            <WeatherBadge className="cursor-pointer transition hover:scale-[1.02]" />
          </Link>

          {/* Notifications placeholder */}
          <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition">
            🔔
          </button>
        </div>
      </div>
    </header>
  )
}
