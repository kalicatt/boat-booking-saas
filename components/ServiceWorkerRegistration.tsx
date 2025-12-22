'use client'

import { useEffect } from 'react'

/**
 * Service Worker Registration Component
 * Registers the service worker for PWA functionality
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    
    // Only register in production or when explicitly enabled
    const shouldRegister = 
      process.env.NODE_ENV === 'production' ||
      process.env.NEXT_PUBLIC_ENABLE_SW === 'true'
    
    if (!shouldRegister) {
      console.log('Service Worker: Skipped in development')
      return
    }

    // Register service worker
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        })

        console.log('Service Worker: Registered', registration.scope)

        // Check for updates periodically
        const checkForUpdates = () => {
          registration.update().catch(console.error)
        }

        // Check for updates every hour
        const updateInterval = setInterval(checkForUpdates, 60 * 60 * 1000)

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              console.log('Service Worker: New version available')
              
              // Optionally notify user
              if (window.confirm('Une nouvelle version est disponible. Voulez-vous rafraîchir ?')) {
                window.location.reload()
              }
            }
          })
        })

        return () => clearInterval(updateInterval)
      } catch (error) {
        console.error('Service Worker: Registration failed', error)
      }
    }

    // Register after page load
    if (document.readyState === 'complete') {
      registerSW()
    } else {
      window.addEventListener('load', registerSW)
      return () => window.removeEventListener('load', registerSW)
    }
  }, [])

  return null
}

/**
 * Unregister all service workers (useful for debugging)
 */
export async function unregisterServiceWorkers() {
  if (!('serviceWorker' in navigator)) return

  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(registrations.map(r => r.unregister()))
  console.log('Service Worker: All unregistered')
}

/**
 * Clear all caches (useful for debugging)
 */
export async function clearAllCaches() {
  const keys = await caches.keys()
  await Promise.all(keys.map(key => caches.delete(key)))
  console.log('Caches: All cleared')
}
