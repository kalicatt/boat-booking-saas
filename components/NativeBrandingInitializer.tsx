'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar'

const BRAND_COLOR = '#0f172a'

export default function NativeBrandingInitializer() {
  useEffect(() => {
    const isNative = (() => {
      try {
        if (Capacitor?.isNativePlatform?.()) {
          return true
        }
        const platform = Capacitor?.getPlatform?.()
        return platform !== undefined && platform !== 'web'
      } catch {
        return false
      }
    })()

    if (!isNative) {
      return
    }

    const applyBranding = async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: false })
        await StatusBar.setBackgroundColor({ color: BRAND_COLOR })
        await StatusBar.setStyle({ style: StatusBarStyle.Light })
      } catch (error) {
        console.warn('[native-branding] failed to update status bar', error)
      }

      try {
        await SplashScreen.hide({ fadeOutDuration: 200 })
      } catch (error) {
        console.warn('[native-branding] failed to hide splash screen', error)
      }
    }

    void applyBranding()
  }, [])

  return null
}
