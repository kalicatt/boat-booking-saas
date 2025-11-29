'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center" aria-labelledby="nf-title">
      <h1 id="nf-title" className="text-3xl font-bold mb-4">Page introuvable</h1>
      <p className="text-slate-600 max-w-md mb-6">
        Désolé, la ressource demandée n&apos;existe pas ou a été déplacée.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link href="/" className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:outline-none focus:ring">Retour accueil</Link>
        <Link href="/admin" className="px-4 py-2 rounded bg-slate-800 text-white font-semibold hover:bg-slate-900 focus:outline-none focus:ring">Espace admin</Link>
      </div>
    </main>
  )
}
