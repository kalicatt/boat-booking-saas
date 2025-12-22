'use client'

import Image from 'next/image'
import OptimizedImage from '@/components/OptimizedImage'
import { authenticate } from '@/lib/actions'
import { FormEvent, useEffect, useState, startTransition } from 'react'
import { useIsNativePlatform } from '@/lib/useIsNativePlatform'

const REMEMBER_EMAIL_KEY = 'sn-admin-remember-email'
const REMEMBER_PASSWORD_KEY = 'sn-admin-remember-password'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })
const TIME_FORMAT = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

export default function LoginPage() {
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [networkOnline, setNetworkOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))
  const [now, setNow] = useState(() => new Date())
  const isNative = useIsNativePlatform()
  const accountDisabled = /désactivé/i.test(errorMessage)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const storedEmail = window.localStorage.getItem(REMEMBER_EMAIL_KEY)
    const storedPassword = window.localStorage.getItem(REMEMBER_PASSWORD_KEY)

    let decodedPassword = ''
    if (storedPassword) {
      try {
        decodedPassword = window.atob(storedPassword)
      } catch {
        window.localStorage.removeItem(REMEMBER_PASSWORD_KEY)
      }
    }

    if (!storedEmail && !decodedPassword) {
      return
    }

    startTransition(() => {
      if (storedEmail) {
        setEmail(storedEmail)
      }
      if (decodedPassword) {
        setPassword(decodedPassword)
      }
      setRememberMe(true)
    })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleOnline = () => setNetworkOnline(true)
    const handleOffline = () => setNetworkOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  const greeting = (() => {
    const hour = now.getHours()
    if (hour < 12) return 'Bonjour'
    if (hour < 18) return 'Bon après-midi'
    return 'Bonsoir'
  })()

  const dateLabel = DATE_FORMAT.format(now)
  const timeLabel = TIME_FORMAT.format(now)
  const networkLabel = networkOnline ? 'Connecté' : 'Hors ligne'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setErrorMessage('')

    const formData = new FormData(event.currentTarget)
    const trimmedEmail = email.trim()
    formData.set('email', trimmedEmail)
    formData.set('password', password)

    if (typeof window !== 'undefined') {
      if (rememberMe && trimmedEmail.length > 0) {
        window.localStorage.setItem(REMEMBER_EMAIL_KEY, trimmedEmail)
      } else {
        window.localStorage.removeItem(REMEMBER_EMAIL_KEY)
      }
      if (rememberMe && password.length > 0) {
        window.localStorage.setItem(REMEMBER_PASSWORD_KEY, window.btoa(password))
      } else {
        window.localStorage.removeItem(REMEMBER_PASSWORD_KEY)
      }
    }
    
    // On appelle notre Server Action pour se connecter
    const result = await authenticate(formData)
    
    if (result?.error) {
      setErrorMessage(result.error)
      setIsLoading(false)
    } else {
      // Si succès, la redirection se fait côté serveur, on ne fait rien
    }
  }
  const wrapperClasses = isNative
    ? 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900/70'
    : 'bg-slate-900'

  return (
    <div className={`${wrapperClasses} min-h-screen px-4 py-8`}> 
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        {isNative && (
          <div className="text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-400">{dateLabel}</p>
            <h1 className="mt-2 text-3xl font-serif font-semibold leading-tight">
              {greeting},
              <br />
              prêt à ouvrir le ponton ?
            </h1>
            <p className="mt-1 text-sm text-slate-300">Il est {timeLabel}. Serveur: {BASE_URL}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`sn-native-chip ${networkOnline ? 'is-positive' : 'is-warning'}`}>{networkLabel}</span>
              <span className="sn-native-chip">Mode sécurisé</span>
            </div>
          </div>
        )}
        <div
          className={`rounded-3xl border border-white/10 bg-white p-8 shadow-2xl ${
            isNative ? 'bg-white/95 backdrop-blur-xl' : ''
          }`}
        >
          <div className="mb-6 flex flex-col items-center text-center">
            <OptimizedImage src="/images/logo.webp" fallback="/images/logo.jpg" alt="Sweet Narcisse" width={160} height={40} className="h-10 w-auto rounded-md" priority />
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Interface Admin</p>
            <p className="mt-1 text-sm text-slate-500">Authentifiez-vous pour accéder aux outils mobiles.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.3em] text-slate-500">Email</label>
              <input
                type="email"
                name="email"
                required
                placeholder="admin@sweet-narcisse.fr"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-semibold text-slate-900 transition focus:border-sky-400 focus:bg-white focus:outline-none"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.3em] text-slate-500">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 pr-12 text-sm font-semibold text-slate-900 transition focus:border-sky-400 focus:bg-white focus:outline-none"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? 'Masquer' : 'Voir'}
                </button>
              </div>
            </div>
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-[12px] font-semibold text-slate-600">
              <span>Se souvenir de mes identifiants</span>
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="sr-only"
                />
                <span className={`sn-toggle ${rememberMe ? 'is-active' : ''}`} aria-hidden="true">
                  <span className="sn-toggle-thumb" />
                </span>
              </span>
            </label>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-2xl bg-[#0f172a] py-3 text-center text-base font-bold uppercase tracking-[0.4em] text-[#eab308] transition hover:bg-black disabled:opacity-60"
            >
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </button>
            {accountDisabled ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-left text-sm text-rose-700 space-y-2">
                <p className="font-semibold text-rose-800">Compte désactivé</p>
                <p>Votre accès administratif est temporairement désactivé. Contactez un administrateur Sweet Narcisse pour réactiver votre profil ou connaître la marche à suivre.</p>
                <div className="rounded-xl bg-white/70 px-3 py-2 text-[13px] font-semibold text-rose-800">
                  ✉️ operations@sweet-narcisse.fr
                </div>
              </div>
            ) : errorMessage && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-600">
                {errorMessage}
              </div>
            )}
          </form>
          <a
            href="mailto:operations@sweet-narcisse.fr"
            className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-800"
          >
            Besoin d&apos;aide ? Contact support →
          </a>
        </div>
      </div>
    </div>
  )
}