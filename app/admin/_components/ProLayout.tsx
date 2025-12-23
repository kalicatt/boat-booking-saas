'use client'

import { ReactNode } from 'react'
import { ProSidebar, SidebarProvider, useSidebar } from './ProSidebar'
import { ProTopbar } from './ProTopbar'
import { useDeviceType } from '@/lib/useDeviceType'

interface ProLayoutProps {
  children: ReactNode
}

function ProLayoutContent({ children }: ProLayoutProps) {
  const { collapsed } = useSidebar()
  const deviceType = useDeviceType()
  const isTablet = deviceType === 'tablet'
  
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar - auto-collapse on tablet */}
      <ProSidebar />
      
      {/* Main content area */}
      <div className={`flex-1 transition-all duration-300 flex flex-col ${
        isTablet ? 'ml-16' : (collapsed ? 'ml-16' : 'ml-64')
      }`}>
        {/* Topbar */}
        <ProTopbar />
        
        {/* Page content - reduced padding on tablet for more space */}
        <main className={`flex-1 ${isTablet ? 'p-2' : 'p-6'}`}>
          {children}
        </main>
      </div>
    </div>
  )
}

export function ProLayout({ children }: ProLayoutProps) {
  return (
    <SidebarProvider>
      <ProLayoutContent>{children}</ProLayoutContent>
    </SidebarProvider>
  )
}
