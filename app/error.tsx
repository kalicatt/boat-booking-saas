'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({ error, reset }: { error: Error, reset: () => void }) {
  useEffect(() => {
    console.error('Global error boundary caught:', error)
  }, [error])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center" aria-labelledby="err-title">
      <h1 id="err-title" className="text-3xl font-bold mb-4">Une erreur est survenue</h1>
      <p className="text-slate-600 max-w-md mb-6" aria-live="polite">
        Nous avons rencontré un problème inattendu. Vous pouvez réessayer ou revenir à l&apos;accueil.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button onClick={reset} className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:outline-none focus:ring">Réessayer</button>
        <Link href="/" className="px-4 py-2 rounded bg-slate-800 text-white font-semibold hover:bg-slate-900 focus:outline-none focus:ring">Accueil</Link>
        <Link href="/admin" className="px-4 py-2 rounded bg-slate-500 text-white font-semibold hover:bg-slate-600 focus:outline-none focus:ring">Admin</Link>
      </div>
    </main>
  )
}
