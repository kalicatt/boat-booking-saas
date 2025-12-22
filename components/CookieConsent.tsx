/**
 * Cookie Consent Banner Component
 * 
 * RGPD/ePrivacy compliance using tarteaucitron.js
 * Gestion du consentement cookies
 */

'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'

// Configuration des services
const TARTEAUCITRON_SERVICES = {
  googleAnalytics: false, // Désactivé car on utilise Plausible
  stripe: true,
  paypal: true
}

type TarteaucitronType = {
  init: (config: TarteaucitronConfig) => void
  job?: string[]
}

type TarteaucitronConfig = {
  privacyUrl: string
  bodyPosition: 'top' | 'bottom'
  hashtag: string
  cookieName: string
  orientation: 'top' | 'bottom' | 'middle' | 'popup'
  groupServices: boolean
  showDetailsOnClick: boolean
  serviceDefaultState: 'wait' | 'true' | 'false'
  showAlertSmall: boolean
  cookieslist: boolean
  closePopup: boolean
  showIcon: boolean
  iconPosition: string
  adblocker: boolean
  DenyAllCta: boolean
  AcceptAllCta: boolean
  highPrivacy: boolean
  removeCredit: boolean
  moreInfoLink: boolean
  useExternalCss: boolean
  useExternalJs: boolean
  mandatory: boolean
  mandatoryCta: boolean
  readmoreLink: string
}

declare global {
  interface Window {
    tarteaucitron?: TarteaucitronType
  }
}

export default function CookieConsent() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.tarteaucitron && !isLoaded) {
      initTarteaucitron()
      setIsLoaded(true)
    }
  }, [isLoaded])

  const initTarteaucitron = () => {
    if (!window.tarteaucitron) return

    window.tarteaucitron.init({
      // URL de la politique de confidentialité
      privacyUrl: '/privacy',
      
      // Position du bandeau (top ou bottom)
      bodyPosition: 'bottom',
      
      // Hashtag pour le lien d'ouverture du panneau
      hashtag: '#tarteaucitron',
      
      // Nom du cookie
      cookieName: 'sweetnarcisse_consent',
      
      // Orientation du bandeau (top, bottom, middle, popup)
      orientation: 'bottom',
      
      // Grouper les services par catégorie
      groupServices: true,
      
      // Afficher les détails au clic
      showDetailsOnClick: true,
      
      // État par défaut des services (wait = attendre le consentement)
      serviceDefaultState: 'wait',
      
      // Afficher un petit bandeau après fermeture
      showAlertSmall: false,
      
      // Afficher la liste des cookies
      cookieslist: true,
      
      // Fermer automatiquement après acceptation
      closePopup: true,
      
      // Afficher l'icône pour réouvrir
      showIcon: true,
      iconPosition: 'BottomRight',
      
      // Bloquer les bloqueurs de pub
      adblocker: false,
      
      // Bouton "Tout refuser"
      DenyAllCta: true,
      
      // Bouton "Tout accepter"
      AcceptAllCta: true,
      
      // Mode haute confidentialité (opt-in strict)
      highPrivacy: true,
      
      // Masquer le crédit tarteaucitron
      removeCredit: true,
      
      // Lien vers plus d'infos
      moreInfoLink: true,
      
      // Utiliser CSS/JS externes
      useExternalCss: false,
      useExternalJs: false,
      
      // Cookies obligatoires (techniques)
      mandatory: true,
      mandatoryCta: true,
      
      // Lien "En savoir plus"
      readmoreLink: '/privacy#cookies'
    })

    // Déclarer les services utilisés
    if (window.tarteaucitron.job) {
      // Service Stripe (nécessaire pour les paiements)
      if (TARTEAUCITRON_SERVICES.stripe) {
        window.tarteaucitron.job.push('stripe')
      }
      
      // Service PayPal (nécessaire pour les paiements)
      if (TARTEAUCITRON_SERVICES.paypal) {
        window.tarteaucitron.job.push('paypal')
      }
    }
  }

  return (
    <>
      {/* Tarteaucitron CSS */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/tarteaucitronjs@1.17.0/css/tarteaucitron.css"
        crossOrigin="anonymous"
      />
      
      {/* Tarteaucitron JS */}
      <Script
        src="https://cdn.jsdelivr.net/npm/tarteaucitronjs@1.17.0/tarteaucitron.js"
        strategy="afterInteractive"
        onLoad={() => {
          initTarteaucitron()
          setIsLoaded(true)
        }}
      />

      {/* Custom styles for Sweet Narcisse branding */}
      <style jsx global>{`
        /* Personnalisation des couleurs */
        #tarteaucitronRoot #tarteaucitronAlertBig {
          background: linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%) !important;
          border-top: 3px solid #c9a962 !important;
        }
        
        #tarteaucitronRoot #tarteaucitronAlertBig #tarteaucitronCloseAlert,
        #tarteaucitronRoot #tarteaucitronAlertBig #tarteaucitronPersonalize,
        #tarteaucitronRoot #tarteaucitronAlertBig #tarteaucitronAllDenied {
          background: #c9a962 !important;
          color: #1e3a5f !important;
          border: none !important;
          border-radius: 4px !important;
          font-weight: 600 !important;
        }
        
        #tarteaucitronRoot #tarteaucitronAlertBig #tarteaucitronCloseAlert:hover,
        #tarteaucitronRoot #tarteaucitronAlertBig #tarteaucitronPersonalize:hover,
        #tarteaucitronRoot #tarteaucitronAlertBig #tarteaucitronAllDenied:hover {
          background: #b8994d !important;
        }
        
        #tarteaucitronRoot .tarteaucitronH1 {
          color: #c9a962 !important;
        }
        
        #tarteaucitronRoot .tarteaucitronTitle {
          background: #1e3a5f !important;
        }
        
        #tarteaucitronRoot #tarteaucitron {
          border-color: #c9a962 !important;
        }
        
        #tarteaucitronRoot .tarteaucitronAllow {
          background: #22c55e !important;
        }
        
        #tarteaucitronRoot .tarteaucitronDeny {
          background: #ef4444 !important;
        }
        
        /* Mode sombre */
        .dark #tarteaucitronRoot #tarteaucitronAlertBig {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
        }
        
        .dark #tarteaucitronRoot .tarteaucitronTitle {
          background: #0f172a !important;
        }
      `}</style>
    </>
  )
}

/**
 * Hook pour vérifier le consentement d'un service spécifique
 */
export function useCookieConsent(serviceName: string): boolean {
  const [hasConsent, setHasConsent] = useState(false)

  useEffect(() => {
    // Vérifier le consentement dans le cookie
    const checkConsent = () => {
      const cookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('sweetnarcisse_consent='))
      
      if (cookie) {
        try {
          const value = decodeURIComponent(cookie.split('=')[1])
          const consent = JSON.parse(value)
          setHasConsent(consent[serviceName] === true)
        } catch {
          setHasConsent(false)
        }
      }
    }

    checkConsent()
    
    // Écouter les changements de consentement
    const interval = setInterval(checkConsent, 1000)
    return () => clearInterval(interval)
  }, [serviceName])

  return hasConsent
}
