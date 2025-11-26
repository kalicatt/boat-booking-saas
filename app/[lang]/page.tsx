"use client"
import BookingWidget from '@/components/BookingWidget'
import { getDictionary } from '@/lib/get-dictionary'
import Image from 'next/image'
import { useEffect, useState } from 'react'

// On définit params comme une Promise (Spécifique Next.js 15+)
export default function LandingPage({ params }: { params: Promise<{ lang: 'en' | 'fr' | 'de' }> }) {
    const [dict, setDict] = useState<any>(null)
    const [lang, setLang] = useState<'en'|'fr'|'de'>('fr')
    const [scrolled, setScrolled] = useState(false)
    useEffect(()=>{
        (async()=>{
            const p = await params
            setLang(p.lang)
            const d = await getDictionary(p.lang)
            setDict(d)
        })()
    },[params])
    useEffect(()=>{
        const onScroll = () => setScrolled(window.scrollY > 40)
        window.addEventListener('scroll', onScroll)
        return ()=> window.removeEventListener('scroll', onScroll)
    },[])
    if(!dict) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
    return (
    import { getDictionary } from '@/lib/get-dictionary'
    import LandingClient from '@/components/LandingClient'

    export default async function LandingPage({ params }: { params: Promise<{ lang: 'en' | 'fr' | 'de' }> }) {
        const { lang } = await params
        const dict = await getDictionary(lang)
        return <LandingClient dict={dict} lang={lang} />
    }

        </div>
        <div className="text-center mt-12 pt-8 border-t border-slate-800 text-xs opacity-50 flex flex-col items-center gap-2">
            <a href={`/${lang}/partners`} className="text-slate-400 hover:text-[#eab308] transition text-xs font-semibold">{dict.partners?.nav || 'Partners'}</a>
            <span>{dict.footer.rights}</span>
        </div>
      </footer>

    </div>
  )
}