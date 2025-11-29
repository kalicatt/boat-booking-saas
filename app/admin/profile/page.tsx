'use client'

import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { logout } from '@/lib/actions'

export default function ProfilePage() {
  // --- ÉTATS ---
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loadingImage, setLoadingImage] = useState(false)
  
  const [formPassword, setFormPassword] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  })
  const [loadingPass, setLoadingPass] = useState(false)

  // --- GESTION PHOTO ---
  
  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Limite de taille (ex: 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert("L'image est trop lourde (Max 2MB)")
        return
      }

      // Conversion en Base64
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const saveImage = async () => {
    if (!imagePreview) return
    setLoadingImage(true)
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imagePreview })
      })
      if (res.ok) {
        alert("Photo mise à jour ! Déconnexion nécessaire pour voir le changement.")
        await logout() // On force la reco pour mettre à jour la session
      }
    } catch { alert("Erreur technique") } 
    finally { setLoadingImage(false) }
  }

  // --- GESTION MOT DE PASSE ---

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoadingPass(true)

    if (formPassword.newPassword !== formPassword.confirmPassword) {
        alert("Les mots de passe ne correspondent pas")
        setLoadingPass(false)
        return
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            currentPassword: formPassword.currentPassword,
            newPassword: formPassword.newPassword
        })
      })
      const data = await res.json()
      if (res.ok) {
        alert("Mot de passe modifié ! Déconnexion...")
        await logout()
      } else {
        alert("Erreur : " + data.error)
      }
    } catch { alert("Erreur technique") } 
    finally { setLoadingPass(false) }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-sm text-slate-500 hover:text-blue-600 mb-2 inline-block">← Retour Tableau de bord</Link>
            <h1 className="text-3xl font-bold text-slate-800">Mon Profil 👤</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">

            {/* SECTION 1 : PHOTO DE PROFIL */}
            <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 mb-6 border-b pb-4">Ma Photo</h2>
                
                <div className="flex items-center gap-8">
                    {/* Cercle de prévisualisation */}
                    <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden relative flex-shrink-0">
                        {imagePreview ? (
                          <Image
                            src={imagePreview}
                            alt="Prévisualisation"
                            fill
                            unoptimized
                            sizes="96px"
                            className="object-cover"
                          />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">📷</div>
                        )}
                    </div>

                    <div className="flex-1">
                        <label className="block text-sm font-bold text-slate-600 mb-2">Choisir une nouvelle photo</label>
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleImageChange}
                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition"
                        />
                        <p className="text-xs text-slate-400 mt-2">Formats acceptés : JPG, PNG. Max 2 Mo.</p>
                    </div>

                    {imagePreview && (
                        <button 
                            onClick={saveImage}
                            disabled={loadingImage}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition"
                        >
                            {loadingImage ? "..." : "Sauvegarder"}
                        </button>
                    )}
                </div>
            </div>

            {/* SECTION 2 : MOT DE PASSE */}
            <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 mb-6 border-b pb-4">Sécurité</h2>
                
                <form onSubmit={handlePasswordSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-1">Mot de passe ACTUEL</label>
                        <input type="password" required className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            value={formPassword.currentPassword} onChange={e => setFormPassword({...formPassword, currentPassword: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1">NOUVEAU mot de passe</label>
                            <input type="password" required minLength={6} className="w-full p-3 border rounded-lg outline-none bg-slate-50 focus:ring-2 focus:ring-blue-500"
                                value={formPassword.newPassword} onChange={e => setFormPassword({...formPassword, newPassword: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1">CONFIRMER le nouveau</label>
                            <input type="password" required minLength={6} className="w-full p-3 border rounded-lg outline-none bg-slate-50 focus:ring-2 focus:ring-blue-500"
                                value={formPassword.confirmPassword} onChange={e => setFormPassword({...formPassword, confirmPassword: e.target.value})} />
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                        <button type="submit" disabled={loadingPass} className="bg-slate-800 text-white px-8 py-3 rounded-lg font-bold hover:bg-black transition">
                            {loadingPass ? "Mise à jour..." : "Changer le mot de passe"}
                        </button>
                    </div>
                </form>
            </div>

        </div>
      </div>
    </div>
  )
}