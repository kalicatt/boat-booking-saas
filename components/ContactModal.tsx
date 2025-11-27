"use client"
import dynamic from 'next/dynamic'
import { useEffect } from 'react'

const ContactForms = dynamic(() => import('@/components/ContactForms'), { ssr: false })

export default function ContactModal({ open, mode, onClose, dict, lang, people, date }:
  { open: boolean, mode: 'group'|'private', onClose: ()=>void, dict: any, lang: 'en'|'fr'|'de'|'es'|'it', people?: number, date?: string }) {
  useEffect(()=>{
    if (!open) return
    const prevHash = window.location.hash
    const target = mode === 'group' ? '#contact-group' : '#contact-private'
    history.replaceState(null, '', target)
    return ()=> { history.replaceState(null, '', prevHash || '') }
  }, [open, mode])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl relative">
        <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 text-slate-500 hover:text-slate-800">✕</button>
        <div className="p-6">
          <ContactForms lang={lang} dict={dict} />
        </div>
      </div>
    </div>
  )
}
