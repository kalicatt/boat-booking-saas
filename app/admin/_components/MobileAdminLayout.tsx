'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const TABS = [
  { href: '/admin/today', label: "Aujourd'hui", icon: 'calendar' },
  { href: '/admin/planning', label: 'Planning', icon: 'schedule' },
  { href: '/admin/reservations', label: 'Réservations', icon: 'book' },
  { href: '/admin/stats', label: 'Stats', icon: 'chart' },
]

const iconMap: Record<string, string> = {
  calendar: '📅',
  schedule: '🗓️',
  book: '🧾',
  chart: '📊',
}

export default function MobileAdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/admin/today') return pathname === '/admin' || pathname?.startsWith('/admin/today')
    return Boolean(pathname?.startsWith(href))
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <header className="safe-area-inset-t bg-slate-950/95 backdrop-blur supports-[backdrop-filter]:bg-slate-950/80">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/admin" className="flex items-center gap-3">
            <Image src="/images/logo.jpg" alt="Sweet Narcisse" width={120} height={32} className="h-8 w-auto rounded-md" priority />
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Tableau de bord</span>
              <span className="text-lg font-serif font-bold">Sweet Narcisse</span>
            </div>
          </Link>
        </div>
      </header>

      <main className="flex-1 bg-slate-100 text-slate-900">
        <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-4 px-4 pb-safe pt-4">
          {children}
        </div>
      </main>

      <nav className="safe-area-inset-b sticky bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-2 py-2">
          {TABS.map((tab) => {
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
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
