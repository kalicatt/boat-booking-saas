'use client'

import { ReactNode } from 'react'
import { ProSidebar, SidebarProvider, useSidebar } from './ProSidebar'
import { ProTopbar } from './ProTopbar'

interface ProLayoutProps {
  children: ReactNode
}

function ProLayoutContent({ children }: ProLayoutProps) {
  const { collapsed } = useSidebar()
  
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <ProSidebar />
      
      {/* Main content area */}
      <div className={`flex-1 transition-all duration-300 flex flex-col ${collapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Topbar */}
        <ProTopbar />
        
        {/* Page content */}
        <main className="flex-1 p-6">
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
