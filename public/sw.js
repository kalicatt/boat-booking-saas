/// <reference lib="webworker" />

/**
 * Sweet Narcisse - Service Worker
 * Provides offline caching and PWA functionality
 */

const CACHE_NAME = 'sweet-narcisse-v2'
const STATIC_CACHE_NAME = 'sweet-narcisse-static-v2'

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/fr',
  '/en',
  '/de',
  '/es',
  '/it',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/images/logo.webp',
  '/images/hero-bg.webp'
]

// Cache strategies
const CACHE_FIRST_PATTERNS = [
  /\.(png|jpg|jpeg|webp|svg|gif|ico)$/i,
  /\.(woff|woff2|ttf|eot)$/i,
  /\/icons\//,
  /\/images\//
]

const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /\/_next\/data\//
]

const STALE_WHILE_REVALIDATE_PATTERNS = [
  /\/_next\/static\//,
  /\.css$/,
  /\.js$/
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS.filter(url => !url.includes('undefined')))
    }).then(() => {
      return self.skipWaiting()
    }).catch((error) => {
      console.warn('SW: Failed to cache some assets:', error)
      return self.skipWaiting()
    })
  )
})

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    }).then(() => {
      return self.clients.claim()
    })
  )
})

// External domains to skip (let browser handle directly)
const EXTERNAL_SKIP_DOMAINS = [
  'js.stripe.com',
  'api.stripe.com',
  'm.stripe.network',
  'q.stripe.com',
  'www.paypal.com',
  'www.sandbox.paypal.com',
  'www.paypalobjects.com',
  'pay.google.com',
  'payments.google.com',
  'www.google.com',
  'www.gstatic.com',
  'apple-pay-gateway.apple.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
]

// Fetch event - handle requests with appropriate strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') return
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return
  
  // Skip external payment/third-party domains entirely - let browser handle them
  if (EXTERNAL_SKIP_DOMAINS.some(domain => url.hostname.includes(domain))) {
    return
  }
  
  // Skip cross-origin requests (not from our domain)
  if (url.origin !== self.location.origin) {
    return
  }
  
  // Skip API requests that need fresh data (payments, bookings)
  if (url.pathname.includes('/api/payments') || 
      url.pathname.includes('/api/bookings') ||
      url.pathname.includes('/api/admin')) {
    return
  }

  // Determine caching strategy
  if (matchesPattern(url.pathname, CACHE_FIRST_PATTERNS)) {
    event.respondWith(cacheFirst(request))
  } else if (matchesPattern(url.pathname, NETWORK_FIRST_PATTERNS)) {
    event.respondWith(networkFirst(request))
  } else if (matchesPattern(url.pathname, STALE_WHILE_REVALIDATE_PATTERNS)) {
    event.respondWith(staleWhileRevalidate(request))
  } else {
    // Default: network first with cache fallback
    event.respondWith(networkFirst(request))
  }
})

// Cache first strategy (for static assets)
async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

// Network first strategy (for dynamic content)
async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline')
      if (offlinePage) return offlinePage
    }
    
    return new Response('Offline', { status: 503 })
  }
}

// Stale while revalidate (for JS/CSS bundles)
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  }).catch(() => cached)
  
  return cached || fetchPromise
}

// Helper to match URL patterns
function matchesPattern(pathname, patterns) {
  return patterns.some(pattern => pattern.test(pathname))
}

// Handle push notifications (future feature)
self.addEventListener('push', (event) => {
  if (!event.data) return
  
  const data = event.data.json()
  const title = data.title || 'Sweet Narcisse'
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'notification',
    data: data.data || {}
  }
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  const url = event.notification.data?.url || '/'
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Focus existing window if open
      for (const client of clients) {
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})
