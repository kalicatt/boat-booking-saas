'use client'

import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

interface PWAInstallPromptProps {
  /** Custom install button text */
  installText?: string
  /** Custom dismiss button text */
  dismissText?: string
  /** Custom prompt title */
  title?: string
  /** Custom prompt description */
  description?: string
  /** Delay before showing prompt (ms) */
  delay?: number
  /** Show even if dismissed before */
  forceShow?: boolean
}

const DISMISSED_KEY = 'pwa-install-dismissed'
const DISMISSED_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * PWA Install Prompt Component
 * Shows a native-style prompt to install the PWA
 */
export default function PWAInstallPrompt({
  installText = 'Installer',
  dismissText = 'Plus tard',
  title = 'Installer Sweet Narcisse',
  description = 'Installez l\'application pour un accès rapide et une expérience optimale.',
  delay = 3000,
  forceShow = false
}: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  // Check if already installed
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check display-mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIOSStandalone = 'standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone
    
    if (isStandalone || isIOSStandalone) {
      setIsInstalled(true)
      return
    }

    // Check if dismissed recently
    if (!forceShow) {
      const dismissed = localStorage.getItem(DISMISSED_KEY)
      if (dismissed) {
        const dismissedTime = parseInt(dismissed, 10)
        if (Date.now() - dismissedTime < DISMISSED_EXPIRY) {
          return
        }
      }
    }

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Show prompt after delay
      setTimeout(() => {
        setShowPrompt(true)
      }, delay)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [delay, forceShow])

  // Handle install click
  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setIsInstalled(true)
      }
    } catch (error) {
      console.warn('PWA install failed:', error)
    }
    
    setShowPrompt(false)
    setDeferredPrompt(null)
  }, [deferredPrompt])

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    setShowPrompt(false)
  }, [])

  // Don't render if already installed or no prompt available
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <span className="text-2xl">🛶</span>
            </div>
            <div>
              <h3 className="font-bold text-white">{title}</h3>
              <p className="text-xs text-slate-300">sweet-narcisse.com</p>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-slate-600 mb-4">{description}</p>
          
          {/* Features */}
          <div className="flex gap-4 mb-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <span>⚡</span>
              <span>Rapide</span>
            </div>
            <div className="flex items-center gap-1">
              <span>📱</span>
              <span>Hors-ligne</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🔔</span>
              <span>Notifications</span>
            </div>
          </div>
          
          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
            >
              {dismissText}
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-sky-500 rounded-xl hover:bg-sky-600 transition-colors shadow-lg shadow-sky-500/25"
            >
              {installText}
            </button>
          </div>
        </div>
      </div>
      
      {/* Animation styles */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

/**
 * Hook to manage PWA installation state
 */
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (isStandalone) {
      setIsInstalled(true)
      return
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setCanInstall(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setCanInstall(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt) return false

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      setCanInstall(false)
      
      if (outcome === 'accepted') {
        setIsInstalled(true)
        return true
      }
    } catch {
      console.warn('PWA install failed')
    }
    
    return false
  }, [deferredPrompt])

  return { canInstall, isInstalled, install }
}
