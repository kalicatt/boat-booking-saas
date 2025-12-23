'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

type WebQrScannerProps = {
  isOpen: boolean
  onScan: (data: string) => void
  onError: (error: string) => void
  onClose: () => void
}

export function WebQrScanner({ isOpen, onScan, onError, onClose }: WebQrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const mountedRef = useRef(true)

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState()
        if (state === 2) { // SCANNING
          await scannerRef.current.stop()
        }
      } catch {
        // ignore stop errors
      }
      try {
        scannerRef.current.clear()
      } catch {
        // ignore clear errors
      }
      scannerRef.current = null
    }
  }, [])

  const startScanner = useCallback(async () => {
    if (!containerRef.current || scannerRef.current || isStarting) return

    setIsStarting(true)

    try {
      // Check if we're in a secure context (HTTPS or localhost)
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        throw new Error("Le scanner nécessite une connexion sécurisée (HTTPS). Utilisez l'adresse en https:// ou localhost.")
      }

      // Check if mediaDevices API is available
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("L'API caméra n'est pas disponible. Vérifiez que vous utilisez HTTPS.")
      }

      // Request camera permission first
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop())
      
      if (!mountedRef.current) return
      setHasPermission(true)

      const scannerId = 'web-qr-scanner-' + Date.now()
      if (containerRef.current) {
        containerRef.current.id = scannerId
      }

      const html5QrCode = new Html5Qrcode(scannerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      })
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          // Success callback
          onScan(decodedText)
        },
        () => {
          // Error callback (called frequently when no QR detected - ignore)
        }
      )
    } catch (err) {
      if (!mountedRef.current) return
      
      const error = err instanceof Error ? err : new Error(String(err))
      
      if (error.name === 'NotAllowedError' || error.message.includes('Permission')) {
        setHasPermission(false)
        onError("Autorisez l'accès à la caméra pour scanner les QR codes.")
      } else if (error.name === 'NotFoundError') {
        onError("Aucune caméra détectée sur cet appareil.")
      } else if (error.message.includes('getUserMedia') || error.message.includes('mediaDevices')) {
        onError("Le scanner QR nécessite une connexion HTTPS sécurisée.")
      } else {
        onError(error.message)
      }
    } finally {
      if (mountedRef.current) {
        setIsStarting(false)
      }
    }
  }, [isStarting, onScan, onError])

  useEffect(() => {
    mountedRef.current = true
    
    if (isOpen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startScanner()
      }, 100)
      return () => clearTimeout(timer)
    } else {
      stopScanner()
    }

    return () => {
      mountedRef.current = false
      stopScanner()
    }
  }, [isOpen, startScanner, stopScanner])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <h2 className="text-white font-semibold text-lg">Scanner QR Code</h2>
        <button
          onClick={onClose}
          className="text-white p-2 rounded-full hover:bg-white/20 transition"
          aria-label="Fermer"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scanner area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative w-full max-w-sm aspect-square">
          {/* Scanner container */}
          <div 
            ref={containerRef}
            className="w-full h-full rounded-2xl overflow-hidden bg-slate-900"
          />

          {/* Loading state */}
          {isStarting && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 rounded-2xl">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white text-sm">Démarrage de la caméra...</p>
              </div>
            </div>
          )}

          {/* Permission denied state */}
          {hasPermission === false && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 rounded-2xl p-6">
              <div className="text-center">
                <div className="text-5xl mb-4">📷</div>
                <p className="text-white font-medium mb-2">Accès caméra refusé</p>
                <p className="text-slate-400 text-sm mb-4">
                  Autorisez l&apos;accès à la caméra dans les paramètres de votre navigateur.
                </p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}

          {/* Scan overlay guide */}
          {!isStarting && hasPermission !== false && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-white/50 rounded-lg" />
              </div>
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-white/80 text-sm">Placez le QR code dans le cadre</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel button */}
      <div className="p-4 pb-8">
        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 transition"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
