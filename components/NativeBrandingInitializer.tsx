'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar'
import { Preferences } from '@capacitor/preferences'

const BRAND_COLOR = '#f8fafc'
const CUSTOM_SERVER_KEY = 'sn_custom_server_url'

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

    const applyStatusBar = async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: false })
        await StatusBar.setBackgroundColor({ color: BRAND_COLOR })
        await StatusBar.setStyle({ style: StatusBarStyle.Dark })
      } catch (error) {
        console.warn('[native-branding] failed to update status bar', error)
      }
    }

    const applyBranding = async () => {
      await enforceCustomServerUrl()
      await applyStatusBar()

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

async function enforceCustomServerUrl() {
  try {
    const { value } = await Preferences.get({ key: CUSTOM_SERVER_KEY })
    if (!value || typeof window === 'undefined') {
      return
    }
    const parsed = new URL(value)
    if (parsed.origin !== window.location.origin) {
      window.location.href = parsed.origin
    }
  } catch (error) {
    console.warn('[native-branding] failed to enforce custom server url', error)
  }
}
