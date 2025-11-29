'use client'

import Image from 'next/image'
import { authenticate } from '@/lib/actions'
import { FormEvent, useState } from 'react'

export default function LoginPage() {
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    const formData = new FormData(event.currentTarget);
    
    // On appelle notre Server Action pour se connecter
    const result = await authenticate(formData);
    
    if (result?.error) {
      setErrorMessage(result.error);
      setIsLoading(false);
    } else {
      // Si succès, la redirection se fait côté serveur, on ne fait rien
    }
  };
 
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
            <input type="email" name="email" required placeholder="admin@sweet-narcisse.fr"
              className="w-full border p-2 rounded focus:border-[#eab308] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Mot de passe</label>
            <input type="password" name="password" required placeholder="••••••"
              className="w-full border p-2 rounded focus:border-[#eab308] outline-none" />
          </div>
          
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
  );
}