'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useDeviceType } from '@/lib/useDeviceType'

const TABS = [
  { href: '/admin/today', label: "Aujourd'hui", icon: 'calendar' },
  { href: '/admin/planning', label: 'Planning', icon: 'schedule' },
  { href: '/admin/reservations', label: 'Réservations', icon: 'book' },
  { href: '/admin/stats', label: 'Stats', icon: 'chart' },
  { href: '/admin/settings', label: 'Réglages', icon: 'settings' },
]

const iconMap: Record<string, string> = {
  calendar: '📅',
  schedule: '🗓️',
  book: '🧾',
  chart: '📊',
  settings: '⚙️',
}

export default function MobileAdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const deviceType = useDeviceType()
  const [networkOnline, setNetworkOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))
  const [lastSync, setLastSync] = useState(() => new Date())

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleOnline = () => setNetworkOnline(true)
    const handleOffline = () => setNetworkOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handleSync = () => setLastSync(new Date())
    window.addEventListener('sn-sync', handleSync)
    return () => {
      window.removeEventListener('sn-sync', handleSync)
    }
  }, [])

  // Only redirect mobile phones from planning to today
  // Tablets should be able to access both views
  useEffect(() => {
    if (deviceType === 'mobile' && pathname?.startsWith('/admin/planning')) {
      router.replace('/admin/today')
    }
  }, [pathname, router, deviceType])

  const isActive = (href: string) => {
    if (href === '/admin/today') return pathname === '/admin' || pathname?.startsWith('/admin/today')
    return Boolean(pathname?.startsWith(href))
  }

  // On tablets, show planning tab. On mobile, hide it.
  const navigationTabs = deviceType === 'tablet' ? TABS : TABS.filter((tab) => tab.href !== '/admin/planning')
  const lastSyncLabel = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(lastSync)

  const handleManualSync = () => {
    setLastSync(new Date())
    router.refresh()
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900">
      <header className="safe-area-inset-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="flex items-center justify-between px-4 py-2">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Tableau de bord</span>
              <span className="text-base font-serif font-bold tracking-wide">Sweet Narcisse</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <span className={`sn-native-chip text-[10px] ${networkOnline ? 'is-positive' : 'is-warning'}`}>
              {networkOnline ? 'Connecté' : 'Hors ligne'}
            </span>
            <span className="sn-native-chip text-[10px]">Sync {lastSyncLabel}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-slate-100 text-slate-900">
        <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-3 px-4 pb-safe pt-3">
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleManualSync}
              className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 transition hover:border-slate-500 hover:text-slate-800"
            >
              ↻ Sync
            </button>
          </div>
          <div className="sn-native-shell">
            {children}
          </div>
        </div>
      </main>

      <nav className="safe-area-inset-b sticky bottom-0 border-t border-slate-200 bg-white/95 text-slate-500 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-2 py-2">
          {navigationTabs.map((tab) => {
            const active = isActive(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-1 flex-col items-center rounded-lg px-2 py-1 text-xs font-semibold transition ${
                  active ? 'text-sky-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="text-lg" aria-hidden="true">
                  {iconMap[tab.icon] ?? '•'}
                </span>
                <span>{tab.label}</span>
                <span className={`sn-native-tab-indicator ${active ? 'is-active' : ''}`} aria-hidden="true" />
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
