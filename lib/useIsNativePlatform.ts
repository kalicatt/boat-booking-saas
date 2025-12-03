'use client'

import { useEffect, useMemo, useState } from 'react'
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
  const initialIsMobile = useMemo(() => {
    if (getNativeStatus()) {
      return true
    }
    if (typeof navigator !== 'undefined' && /Mobi|Android.+Mobile/i.test(navigator.userAgent || '')) {
      return true
    }
    if (typeof window !== 'undefined' && window.innerWidth <= 640) {
      return true
    }
    return false
  }, [])

  const [isMobile, setIsMobile] = useState<boolean>(initialIsMobile)

  useEffect(() => {
    const handleResize = () => {
      if (getNativeStatus()) {
        setIsMobile(true)
        return
      }
      if (typeof navigator !== 'undefined' && /Mobi|Android.+Mobile/i.test(navigator.userAgent || '')) {
        setIsMobile(true)
        return
      }
      if (window.innerWidth <= 640) {
        setIsMobile(true)
      } else {
        setIsMobile(false)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return isMobile
}
