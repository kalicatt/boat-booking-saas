'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createContext, useContext, useState, ReactNode } from 'react'

type SidebarContextType = {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider')
  }
  return context
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

type NavSection = {
  title: string
  items: NavItem[]
}

type NavItem = {
  label: string
  href: string
  icon: string
  badge?: string | number
  disabled?: boolean
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Opérations',
    items: [
      { label: 'Aujourd\'hui', href: '/admin/today', icon: '⚓' },
      { label: 'Planning', href: '/admin/planning', icon: '📅' },
      { label: 'Réservations', href: '/admin/reservations', icon: '📋' },
      { label: 'Météo', href: '/admin/weather', icon: '🌤️' },
    ]
  },
  {
    title: 'Gestion',
    items: [
      { label: 'Flotte', href: '/admin/fleet', icon: '🚤' },
      { label: 'Heures', href: '/admin/hours', icon: '🕒' },
      { label: 'Comptabilité', href: '/admin/accounting', icon: '💶' },
      { label: 'Équipe', href: '/admin/employees', icon: '👥' },
    ]
  },
  {
    title: 'Analytics',
    items: [
      { label: 'Statistiques', href: '/admin/stats', icon: '📊' },
      { label: 'Logs', href: '/admin/logs', icon: '🕵️' },
    ]
  },
  {
    title: 'Configuration',
    items: [
      { label: 'Blocages', href: '/admin/blocks', icon: '⛔' },
      { label: 'CMS', href: '/admin/cms', icon: '📰' },
      { label: 'Paramètres', href: '/admin/settings', icon: '⚙️' },
    ]
  }
]

export function ProSidebar() {
  const pathname = usePathname()
  const { collapsed, setCollapsed } = useSidebar()

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen bg-slate-50 text-slate-700 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} border-r border-slate-200 z-50 flex flex-col shadow-sm`}
    >
      {/* Header */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-4 border-b border-slate-200`}>
        {!collapsed && (
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-800">Sweet Narcisse</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-slate-200 transition text-slate-500 hover:text-slate-800"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 6h16M4 12h16M4 18h16" 
            />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 scrollbar-thin">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-6">
            {!collapsed && (
              <h3 className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-lg transition-all
                        ${isActive 
                          ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' 
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }
                        ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        ${collapsed ? 'justify-center' : ''}
                      `}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="text-lg flex-shrink-0">{item.icon}</span>
                      {!collapsed && (
                        <>
                          <span className="flex-1 font-medium text-sm">{item.label}</span>
                          {item.badge && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-sky-500 text-white rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200">
        <Link
          href="/admin/profile"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 transition ${
            pathname === '/admin/profile' ? 'bg-slate-200' : ''
          } ${collapsed ? 'justify-center' : ''}`}
        >
          <span className="text-lg">👤</span>
          {!collapsed && <span className="text-sm font-medium text-slate-700">Mon profil</span>}
        </Link>
      </div>
    </aside>
  )
}
