'use client'

import type { ReactNode } from 'react'
import { useIsNativePlatform } from '@/lib/useIsNativePlatform'

import MobileAdminLayout from './MobileAdminLayout'
import { ProLayout } from './ProLayout'

interface AdminLayoutSwitcherProps {
  children: ReactNode
}

export default function AdminLayoutSwitcher({ children }: AdminLayoutSwitcherProps) {
  const isNative = useIsNativePlatform()
  
  if (isNative) {
    return <MobileAdminLayout>{children}</MobileAdminLayout>
  }
  
  return <ProLayout>{children}</ProLayout>
}
