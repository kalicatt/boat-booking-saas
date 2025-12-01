'use client'

import { useMemo } from 'react'
import { Capacitor } from '@capacitor/core'

const getNativeStatus = () => {
  try {
    return Capacitor?.isNativePlatform?.() ?? false
  } catch {
    return false
  }
}

export function useIsNativePlatform(): boolean {
  return useMemo(() => getNativeStatus(), [])
}
