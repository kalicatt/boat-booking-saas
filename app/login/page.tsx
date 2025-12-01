'use client'

import Image from 'next/image'
import { authenticate } from '@/lib/actions'
import { FormEvent, useEffect, useState, startTransition } from 'react'

const REMEMBER_EMAIL_KEY = 'sn-admin-remember-email'
const REMEMBER_PASSWORD_KEY = 'sn-admin-remember-password'

export default function LoginPage() {
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

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
 
  return (
    <div className="flex h-screen items-center justify-center bg-slate-900">
      <div className="w-full max-w-sm p-8 bg-white rounded-xl shadow-2xl">
        <div className="flex flex-col items-center mb-4">
          <Image src="/images/logo.jpg" alt="Sweet Narcisse" width={160} height={40} className="h-10 w-auto" priority />
        </div>
        <h1 className="mb-6 text-2xl font-serif font-bold text-center text-[#0f172a]">
            Sweet <span className="text-[#eab308]">Admin</span> 🔒
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Email</label>
            <input
              type="email"
              name="email"
              required
              placeholder="admin@sweet-narcisse.fr"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full border p-2 rounded focus:border-[#eab308] outline-none"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Mot de passe</label>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full border p-2 rounded focus:border-[#eab308] outline-none"
              autoComplete="current-password"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#0f172a] focus:ring-[#eab308]"
            />
            Se souvenir de mes identifiants
          </label>
          
          <button type="submit" disabled={isLoading} className="w-full bg-[#0f172a] text-[#eab308] py-3 rounded font-bold hover:bg-black transition">
            {isLoading ? "Connexion..." : "Se connecter"}
          </button>
          
          {errorMessage && (
            <div className="p-3 bg-red-100 text-red-600 text-sm rounded text-center">
              {errorMessage}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}