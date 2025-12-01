'use client'

import { useMemo } from 'react'
import { Capacitor } from '@capacitor/core'

const getNativeStatus = () => {
  try {
    if (Capacitor?.isNativePlatform?.()) {
      return true
    }

    const platform = Capacitor?.getPlatform?.()
    if (platform && platform !== 'web') {
      return true
    }

    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || ''
      if (/Capacitor|SweetNarcisse/i.test(ua)) {
        return true
      }
    }
  } catch {
    // ignore runtime detection errors and fall through to false
  }

  return false
}

export function useIsNativePlatform(): boolean {
  return useMemo(() => getNativeStatus(), [])
}
