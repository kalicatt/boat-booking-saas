"use client"

import { useEffect, useMemo, useState } from 'react'
import { Preferences } from '@capacitor/preferences'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

import { AdminPageShell } from '../_components/AdminPageShell'
import { useIsNativePlatform } from '@/lib/useIsNativePlatform'

const STORAGE_KEY = 'sn_custom_server_url'

const ensureUrl = (input: string): string | null => {
  if (!input.trim()) return null
  try {
    return new URL(input).origin
  } catch {
    try {
      return new URL(`https://${input}`).origin
    } catch {
      return null
    }
  }
}

export default function SettingsClient() {
  const [activeUrl, setActiveUrl] = useState('')
  const [storedUrl, setStoredUrl] = useState('')
  const [candidate, setCandidate] = useState('')
  const [testState, setTestState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)
  const isNative = useIsNativePlatform()

  useEffect(() => {
    setActiveUrl(window.location.origin)

    const loadPreferences = async () => {
      try {
        const { value } = await Preferences.get({ key: STORAGE_KEY })
        if (value) {
          setStoredUrl(value)
          setCandidate(value)
        }
      } catch (error) {
        console.warn('[settings] unable to read stored url', error)
      }
    }

    void loadPreferences()
  }, [])

  const candidateOrigin = useMemo(() => ensureUrl(candidate), [candidate])

  const handleSave = async () => {
    if (!candidateOrigin) {
      setTestState('error')
      setTestMessage('URL invalide. Ajoutez https://')
      return
    }
    setSaving(true)
    try {
      await Preferences.set({ key: STORAGE_KEY, value: candidateOrigin })
      setStoredUrl(candidateOrigin)
      setTestState('success')
      setTestMessage('URL sauvegardee localement')
      await Haptics.impact({ style: ImpactStyle.Light })
    } catch (error) {
      console.error('save url failed', error)
      setTestState('error')
      setTestMessage('Impossible de sauvegarder cette URL')
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    setSaving(true)
    try {
      await Preferences.remove({ key: STORAGE_KEY })
      setStoredUrl('')
      setCandidate('')
      setTestState('idle')
      setTestMessage('Preferences nettoyees')
    } catch (error) {
      console.error('clear url failed', error)
      setTestState('error')
      setTestMessage('Impossible de nettoyer la preference')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!candidateOrigin) {
      setTestState('error')
      setTestMessage('URL invalide')
      return
    }
    setTestState('testing')
    setTestMessage('Test en cours...')
    try {
      const probeUrl = new URL('/api/dict/fr', candidateOrigin).toString()
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 5_000)
      const response = await fetch(probeUrl, { signal: controller.signal })
      window.clearTimeout(timeout)
      if (!response.ok) {
        throw new Error(`Statut ${response.status}`)
      }
      setTestState('success')
      setTestMessage('Connexion OK. Vous pouvez appliquer cette URL.')
      await Haptics.notification({ type: NotificationType.Success })
    } catch (error) {
      console.error('test url failed', error)
      setTestState('error')
      setTestMessage('Serveur injoignable. Verifiez le reseau et le port.')
      await Haptics.notification({ type: NotificationType.Error })
    }
  }

  const handleApply = async () => {
    if (!candidateOrigin) {
      setTestState('error')
      setTestMessage('URL invalide')
      return
    }
    setApplying(true)
    try {
      await Preferences.set({ key: STORAGE_KEY, value: candidateOrigin })
      await Haptics.impact({ style: ImpactStyle.Medium })
      window.location.href = candidateOrigin
    } catch (error) {
      console.error('apply url failed', error)
      setApplying(false)
      setTestState('error')
      setTestMessage('Impossible de rediriger vers cette URL')
    }
  }

  return (
    <AdminPageShell
      title="Parametres mobiles"
      description="Configurez le serveur a utiliser dans l'application Android et testez la connexion."
      backHref="/admin"
      backLabel="Retour admin"
    >
      <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900/80">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">URL active</p>
            <p className="mt-2 break-all font-mono text-sm text-slate-900 dark:text-slate-100">{activeUrl}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">URL personnalisee stockee</p>
            <p className="mt-2 break-all font-mono text-sm text-slate-900 dark:text-slate-100">
              {storedUrl || '—'}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Nouvelle URL serveur
          </label>
          <input
            type="text"
            value={candidate}
            onChange={(event) => setCandidate(event.target.value)}
            placeholder="https://192.168.1.80:3000"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 font-mono text-sm focus:border-sky-400 focus:bg-white focus:outline-none"
          />
          <p className="text-xs text-slate-500">L&apos;URL doit inclure le protocole (https://) et pointer vers votre serveur Next.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleTest}
            disabled={testState === 'testing'}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-black disabled:opacity-60"
          >
            {testState === 'testing' ? 'Test...' : 'Tester la connexion'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-slate-700 transition hover:border-slate-500"
          >
            Sauvegarder
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={saving}
            className="rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-red-600 transition hover:border-red-400"
          >
            Nettoyer
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={applying || !candidateOrigin}
            className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {applying ? 'Redirection...' : 'Appliquer et recharger'}
          </button>
        </div>

        {testMessage && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
              testState === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : testState === 'error'
                ? 'border-red-200 bg-red-50 text-red-600'
                : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}
          >
            {testMessage}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
          <p className="font-semibold uppercase tracking-[0.4em] text-slate-500">Notes</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>Disponible uniquement dans l&apos;app Android/Capacitor.</li>
            <li>La redirection recharge completement le WebView.</li>
            <li>Utilisez le test avant d&apos;appliquer pour eviter les erreurs de certificat.</li>
          </ul>
        </div>

        {!isNative && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Vous consultez ces parametres depuis un navigateur classique. Les changements s&apos;appliquent uniquement sur l&apos;application mobile.
          </div>
        )}
      </div>
    </AdminPageShell>
  )
}
