"use client"
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Lang } from '@/lib/contactClient'
import type { ContactDict } from '@/components/ContactForms'

const ContactForms = dynamic(() => import('@/components/ContactForms'), { ssr: false })

export default function ContactModal({ open, onClose, dict, lang }:
  { open: boolean, onClose: ()=>void, dict: ContactDict, lang: Lang }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(()=>{
    if (!open) return
    const prevHash = window.location.hash
    const target = '#contact-group'
    history.replaceState(null, '', target)
    return ()=> { history.replaceState(null, '', prevHash || '') }
  }, [open])

  useEffect(() => {
    if (!open) return

    // Robust scroll lock (prevents background scroll on mobile too)
    const scrollY = window.scrollY || 0
    const prevBodyStyle = document.body.getAttribute('style') || ''
    const prevHtmlOverflow = document.documentElement.style.overflow

    document.documentElement.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.width = '100%'
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow

      if (prevBodyStyle) document.body.setAttribute('style', prevBodyStyle)
      else document.body.removeAttribute('style')

      window.scrollTo(0, scrollY)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const content = useMemo(() => {
    if (!open) return null
    return (
      <div
        className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/50 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div className="mx-auto w-full max-w-3xl">
          <div className="bg-white rounded-xl shadow-2xl w-full max-h-[calc(100dvh-2rem)] flex flex-col relative">
            <div className="sticky top-0 z-10 flex justify-end bg-white rounded-t-xl p-3 border-b border-slate-100">
              <button onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-800">✕</button>
            </div>
            <div className="p-6 overflow-y-auto">
              <ContactForms lang={lang} dict={dict} />
            </div>
          </div>
        </div>
      </div>
    )
  }, [dict, lang, onClose, open])

  if (!mounted) return null
  if (!content) return null
  return createPortal(content, document.body)
}
