'use client'

import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'

export type DeviceType = 'desktop' | 'tablet' | 'mobile'

/**
 * Detects if the device is an iPad (including modern iPads that report as Macintosh)
 */
function isIPad(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  // Classic iPad detection
  if (/iPad/i.test(ua)) return true
  // Modern iPad detection (iPadOS 13+ reports as Macintosh)
  // Check for Macintosh + touch support + not a real Mac
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true
  return false
}

/**
 * Detects the device type based on user agent and screen size
 * - desktop: Non-touch devices or large screens (>1024px) without mobile UA
 * - tablet: Touch devices with medium screens (641-1024px) or iPad/Android tablet UA
 * - mobile: Small screens (<=640px) or mobile phone UA
 */
export function useDeviceType(): DeviceType | null {
  const [deviceType, setDeviceType] = useState<DeviceType | null>(null)

  useEffect(() => {
    const detectDevice = (): DeviceType => {
      const ua = navigator.userAgent || ''
      const width = window.innerWidth

      // Check if running in Capacitor native app
      try {
        if (Capacitor?.isNativePlatform?.()) {
          // Native app - check if it's a tablet or phone
          const isTablet = isIPad() || /Android(?!.*Mobile)/i.test(ua) || width > 640
          return isTablet ? 'tablet' : 'mobile'
        }
      } catch {
        // ignore
      }

      // iPad detection first (including modern iPads that report as Macintosh)
      if (isIPad()) {
        return 'tablet'
      }

      // Check for mobile phones (small screens or mobile-specific UA)
      const isMobilePhone = /iPhone|iPod|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)
      if (isMobilePhone || width <= 640) {
        return 'mobile'
      }

      // Check for tablets (Android tablets, or medium screens with touch)
      const isTabletUA = /Android(?!.*Mobile)|Tablet/i.test(ua)
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isMediumScreen = width > 640 && width <= 1024

      if (isTabletUA || (hasTouch && isMediumScreen)) {
        return 'tablet'
      }

      // Large screens with touch (like Surface) - treat as tablet
      if (hasTouch && width > 1024) {
        return 'tablet'
      }

      // Default to desktop
      return 'desktop'
    }

    setDeviceType(detectDevice())

    const handleResize = () => {
      setDeviceType(detectDevice())
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return deviceType
}

/**
 * Helper hook to check if the device can access mobile views
 * Returns true for mobile and tablet devices
 */
export function useCanAccessMobileView(): boolean | null {
  const deviceType = useDeviceType()
  if (deviceType === null) return null
  return deviceType === 'mobile' || deviceType === 'tablet'
}

/**
 * Helper hook to check if the device can access desktop views
 * Returns true for desktop and tablet devices
 */
export function useCanAccessDesktopView(): boolean | null {
  const deviceType = useDeviceType()
  if (deviceType === null) return null
  return deviceType === 'desktop' || deviceType === 'tablet'
}

/**
 * Helper hook to check if the device should use mobile-only layout
 * Returns true only for mobile phones (not tablets)
 */
export function useIsMobileOnly(): boolean | null {
  const deviceType = useDeviceType()
  if (deviceType === null) return null
  return deviceType === 'mobile'
}
