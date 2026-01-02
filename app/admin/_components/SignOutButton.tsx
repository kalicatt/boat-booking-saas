'use client'

import type { ReactNode } from 'react'
import { signOut } from 'next-auth/react'

type Props = {
  children: ReactNode
  className?: string
  redirectTo?: string
}

export function SignOutButton({ children, className, redirectTo = '/login' }: Props) {
  return (
    <button
      type="button"
      onClick={() => {
        void signOut({ callbackUrl: redirectTo })
      }}
      className={className}
    >
      {children}
    </button>
  )
}
