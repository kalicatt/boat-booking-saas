'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useIsNativePlatform } from '@/lib/useIsNativePlatform'

import MobileAdminLayout from './MobileAdminLayout'

interface AdminLayoutSwitcherProps {
  children: ReactNode
}

function DesktopAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="sn-admin flex min-h-screen flex-col bg-white text-slate-900">
      <header className="sn-admin-header border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/admin" aria-label="Admin Sweet Narcisse" className="flex items-center gap-3">
            <Image
              src="/images/logo.jpg"
              alt="Sweet Narcisse"
              width={136}
              height={40}
              className="h-9 w-auto rounded-sm shadow-sm"
              priority
            />
            <span className="font-serif text-xl font-bold text-slate-900">Admin</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white shadow-xl ring-1 ring-slate-100">
          <div className="sn-card sn-card-body">{children}</div>
        </div>
      </main>
    </div>
  )
}

export default function AdminLayoutSwitcher({ children }: AdminLayoutSwitcherProps) {
  const isNative = useIsNativePlatform()
  if (isNative) {
    return <MobileAdminLayout>{children}</MobileAdminLayout>
  }
  return <DesktopAdminLayout>{children}</DesktopAdminLayout>
}
