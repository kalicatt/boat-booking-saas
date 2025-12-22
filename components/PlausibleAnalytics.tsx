'use client'

import Script from 'next/script'

/**
 * Plausible Analytics - Privacy-friendly, GDPR compliant
 * 
 * Self-hosted version at /analytics or cloud version
 * No cookies, no personal data collection
 * 
 * @see https://plausible.io/docs
 */

interface PlausibleAnalyticsProps {
  /** Domain to track (defaults to NEXT_PUBLIC_PLAUSIBLE_DOMAIN) */
  domain?: string
  /** Custom script source (defaults to self-hosted or cloud) */
  src?: string
  /** Enable hash-based routing tracking */
  hashMode?: boolean
  /** Track outbound links */
  outboundLinks?: boolean
  /** Track file downloads */
  fileDownloads?: boolean
  /** Track 404 pages */
  track404?: boolean
  /** Enable revenue tracking */
  revenue?: boolean
  /** Enable pageview props */
  pageviewProps?: boolean
  /** Custom props to send with every pageview */
  customProps?: Record<string, string>
}

// Plausible global type
declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: Record<string, string | number | boolean>; revenue?: { currency: string; amount: number } }
    ) => void
  }
}

/**
 * Track custom events in Plausible
 * 
 * @example
 * ```ts
 * import { trackEvent } from '@/components/PlausibleAnalytics'
 * 
 * // Simple event
 * trackEvent('Signup')
 * 
 * // Event with properties
 * trackEvent('Booking', { props: { language: 'fr', passengers: 4 } })
 * 
 * // Event with revenue
 * trackEvent('Purchase', { 
 *   props: { plan: 'premium' },
 *   revenue: { currency: 'EUR', amount: 49.99 }
 * })
 * ```
 */
export function trackEvent(
  event: string,
  options?: { 
    props?: Record<string, string | number | boolean>
    revenue?: { currency: string; amount: number }
  }
) {
  if (typeof window !== 'undefined' && window.plausible) {
    window.plausible(event, options)
  }
}

/**
 * Track pageview manually (useful for SPA navigation)
 */
export function trackPageview(url?: string, props?: Record<string, string>) {
  if (typeof window !== 'undefined' && window.plausible) {
    const pageviewProps = url ? { url, ...props } : props
    window.plausible('pageview', pageviewProps ? { props: pageviewProps } : undefined)
  }
}

export default function PlausibleAnalytics({
  domain,
  src,
  hashMode = false,
  outboundLinks = true,
  fileDownloads = true,
  track404 = true,
  revenue = true,
  pageviewProps = true,
}: PlausibleAnalyticsProps) {
  // Check if analytics is enabled
  const plausibleDomain = domain || process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
  const plausibleSrc = src || process.env.NEXT_PUBLIC_PLAUSIBLE_SRC
  
  // Skip if not configured
  if (!plausibleDomain) {
    return null
  }

  // Build script URL with extensions
  const extensions: string[] = []
  if (hashMode) extensions.push('hash')
  if (outboundLinks) extensions.push('outbound-links')
  if (fileDownloads) extensions.push('file-downloads')
  if (track404) extensions.push('404')
  if (revenue) extensions.push('revenue')
  if (pageviewProps) extensions.push('pageview-props')

  // Default to self-hosted, fallback to cloud
  const baseUrl = plausibleSrc || 'https://plausible.io'
  const scriptName = extensions.length > 0 
    ? `script.${extensions.join('.')}.js`
    : 'script.js'
  const scriptUrl = `${baseUrl}/js/${scriptName}`

  return (
    <>
      <Script
        defer
        data-domain={plausibleDomain}
        src={scriptUrl}
        strategy="afterInteractive"
      />
      {/* Plausible tracking function for custom events */}
      <Script id="plausible-init" strategy="afterInteractive">
        {`window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }`}
      </Script>
    </>
  )
}
