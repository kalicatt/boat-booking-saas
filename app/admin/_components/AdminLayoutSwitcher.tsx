'use client'

import type { ReactNode } from 'react'
import { useDeviceType } from '@/lib/useDeviceType'

import MobileAdminLayout from './MobileAdminLayout'
import { ProLayout } from './ProLayout'

interface AdminLayoutSwitcherProps {
  children: ReactNode
}

export default function AdminLayoutSwitcher({ children }: AdminLayoutSwitcherProps) {
  const deviceType = useDeviceType()
  
  // Loading state while detecting device type
  if (deviceType === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-400">Chargement...</div>
      </div>
    )
  }
  
  // Mobile phones use the mobile layout
  // Tablets and desktops use the pro layout (full planning access)
  if (deviceType === 'mobile') {
    return <MobileAdminLayout>{children}</MobileAdminLayout>
  }
  
  return <ProLayout>{children}</ProLayout>
}
