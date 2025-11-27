"use client"
import Image from 'next/image'
import BookingWidget from '@/components/BookingWidget'
import { useEffect, useState, useRef } from 'react'
import TripReviews from '@/components/TripReviews'
import dynamic from 'next/dynamic'
const ContactForms = dynamic(() => import('@/components/ContactForms'), { ssr: false })
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function LandingClient({ dict, lang }: { dict: any, lang: 'en'|'fr'|'de'|'es'|'it' }) {
  const [scrolled, setScrolled] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement|null>(null)
  const pathname = usePathname()
  const routeLang = (pathname?.split('/')[1] || '') as 'en'|'fr'|'de'|'es'|'it'|''
  const [currentLang, setCurrentLang] = useState<'en'|'fr'|'de'|'es'|'it'>((['en','fr','de','es','it'] as const).includes(lang) ? lang : 'en')
  const [liveDict, setLiveDict] = useState(dict)
  const [currentHash, setCurrentHash] = useState('')
  const [currentSearch, setCurrentSearch] = useState('')
  useEffect(()=>{
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    const reveal = () => {
      document.querySelectorAll('.fade-in').forEach(el => {
        const r = el.getBoundingClientRect();
        if(r.top < window.innerHeight - 60) el.classList.add('fade-in-visible')
      })
    }
    window.addEventListener('scroll', reveal)
    reveal()
    const onKey = (e: KeyboardEvent) => {
      if(e.key === 'Escape') setLangOpen(false)
    }
    const onClickOutside = (e: MouseEvent) => {
      if(langOpen && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('click', onClickOutside)
    const onHash = () => setCurrentHash(window.location.hash || '')
    const onSearch = () => setCurrentSearch(window.location.search || '')
    window.addEventListener('hashchange', onHash)
    onHash()
    onSearch()
    return ()=> { window.removeEventListener('scroll', onScroll); window.removeEventListener('scroll', reveal); window.removeEventListener('keydown', onKey); window.removeEventListener('click', onClickOutside); window.removeEventListener('hashchange', onHash) }
  },[])

  // Sync currentLang with URL on client navigation
  useEffect(()=>{
    const code = (['en','fr','de','es','it'] as const).includes(routeLang as any) ? (routeLang as any) : undefined
    if (code && code !== currentLang) setCurrentLang(code)
  }, [routeLang])

  // Re-fetch dictionary client-side when currentLang changes (soft navigation)
  useEffect(()=>{
    let cancelled = false
    fetch(`/api/dict/${currentLang}`)
      .then(r=>r.json())
      .then(data=>{ if(!cancelled && data?.dict) setLiveDict(data.dict) })
      .catch(()=>{})
    return ()=>{ cancelled = true }
  },[currentLang])

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 scroll-smooth">
      <nav className={`fixed w-full z-40 backdrop-blur-md transition-all ${scrolled ? 'bg-white/80 shadow-md h-16' : 'bg-white/90 h-20'} border-b border-slate-100`}>
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="text-2xl font-serif font-bold text-[#0f172a] flex items-center gap-3">Sweet <span className="text-[#eab308]">Narcisse</span></div>
          <div className="hidden md:flex gap-8 text-sm font-semibold tracking-wide text-slate-600 items-center">
            <a href="#presentation" className="hover:text-[#eab308] transition duration-300">{liveDict.nav.experience}</a>
            <a href={`/${currentLang}/partners`} className="hover:text-[#eab308] transition duration-300 uppercase">{liveDict.partners?.nav || 'Partners'}</a>
            <a href="#contact" className="hover:text-[#eab308] transition duration-300">{liveDict.nav.contact}</a>
            <div className="relative ml-4 border-l pl-4 border-slate-300" ref={dropdownRef}>
              <button onClick={()=>setLangOpen(o=>!o)} aria-haspopup="listbox" aria-expanded={langOpen} className="px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-2 text-xs font-bold">
                <span>{currentLang.toUpperCase()}</span>
                <span className="text-[10px]">▾</span>
              </button>
              {langOpen && (
                <ul role="listbox" className="absolute right-0 mt-2 w-32 bg-white border border-slate-200 rounded-md shadow-lg z-50 text-xs divide-y divide-slate-100">
                  {['fr','en','de','es','it'].map(code => (
                    <li key={code}>
                      <Link prefetch={false} href={`/${code}${currentSearch}${currentHash}`} role="option" aria-selected={currentLang===code} className={`block px-3 py-2 hover:bg-slate-50 ${currentLang===code? 'font-bold text-[#0f172a]' : 'text-slate-600'}`} onClick={()=>setLangOpen(false)}>{code.toUpperCase()}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <a href="#reservation" className="bg-[#0f172a] text-[#eab308] px-6 py-2 rounded-full font-bold text-sm hover:bg-black transition shadow-lg transform hover:scale-105">{liveDict.nav.book}</a>
        </div>
      </nav>

      <header className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image src="/images/hero-bg.jpg" alt="Colmar Petite Venise" fill className="object-cover" priority />
          {/* Subtle vignette & warm overlay instead of heavy blue */}
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(0,0,0,0.35)] via-[rgba(0,0,0,0.25)] to-[rgba(0,0,0,0.55)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(234,179,8,0.25),transparent_60%)]" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto fade-in">
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 drop-shadow-lg leading-[1.05]">{liveDict.hero.title}</h1>
          <p className="text-xl md:text-2xl text-slate-200 mb-10 font-light max-w-3xl mx-auto leading-relaxed">{liveDict.hero.subtitle}</p>
          <div className="flex flex-col items-center justify-center gap-5">
            <a href="#reservation" className="bg-[#eab308] text-[#0f172a] px-10 py-4 rounded text-lg font-bold hover:bg-white hover:scale-105 transition transform shadow-xl inline-block">{liveDict.hero.cta}</a>
            <Link href={`/${currentLang}/partners`} className="text-sm font-semibold text-slate-200 hover:text-white transition underline decoration-[#eab308] decoration-2 underline-offset-4">{liveDict.partners?.nav}</Link>
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-white/50 text-2xl">↓</div>
      </header>

      <section id="presentation" className="py-24 px-6 bg-sand-gradient">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6 fade-in">
            <h4 className="text-[#eab308] font-bold tracking-widest text-sm uppercase">Sweet Narcisse</h4>
            <h2 className="text-4xl font-serif font-bold text-deep">{liveDict.presentation.title}</h2>
            <p className="text-slate-600 leading-relaxed text-lg text-justify">{liveDict.presentation.text}</p>
            <ul className="space-y-3 pt-4">
              {liveDict.presentation.points.map((item: string) => (
                <li key={item} className="flex items-center gap-3 text-slate-700 font-medium">
                  <span className="w-6 h-6 rounded-full bg-yellow-100 text-[#eab308] flex items-center justify-center font-bold">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative group fade-in">
            <div className="absolute -inset-4 bg-[#eab308]/20 rounded-2xl rotate-3 group-hover:rotate-6 transition duration-500"></div>
            <Image src="/images/presentation.jpg" alt="Barque Colmar" width={800} height={500} className="relative rounded-2xl shadow-2xl w-full h-[500px] object-cover" />
          </div>
        </div>
      </section>

      <section className="py-8 px-6 bg-white">
        <div className="max-w-6xl mx-auto text-center mb-6 fade-in">
          <h3 className="text-sm uppercase tracking-widest text-slate-500 font-semibold">{liveDict.logos?.title}</h3>
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 opacity-70">
          {[1,2,3,4,5,6].map(n => (
            <div key={n} className="flex items-center justify-center h-16 grayscale hover:grayscale-0 transition">
              <Image src={`/images/logo${n}.png`} alt={`Logo ${n}`} width={120} height={50} className="object-contain" />
            </div>
          ))}
        </div>
      </section>

      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center fade-in">
            <h2 className="text-4xl font-serif font-bold mb-4">{liveDict.bento?.title}</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">{liveDict.bento?.subtitle}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3 auto-rows-[200px]">
            {liveDict.bento?.cards?.map((c: any, idx: number) => (
              <div key={idx} className={`fade-in rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between bg-gradient-to-br from-slate-50 to-slate-100 hover:shadow-lg transition group ${idx===0||idx===3? 'md:row-span-2' : ''}`}>
                <h3 className="font-serif text-xl font-bold mb-2 text-[#0f172a] group-hover:text-[#eab308] transition">{c.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-sand-gradient" id="reviews">
        <div className="max-w-5xl mx-auto text-center mb-12 fade-in">
          <h2 className="text-4xl font-serif font-bold mb-3">{liveDict.social?.title}</h2>
          <p className="text-slate-600 max-w-xl mx-auto">{liveDict.social?.subtitle}</p>
        </div>
        <div className="max-w-6xl mx-auto">
          <TripReviews dict={liveDict} lang={currentLang} />
        </div>
      </section>

      <div className="wave-divider" aria-hidden="true">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none"><path fill="#0d1b2a" d="M0,80 L0,40 C160,10 320,10 480,30 C640,50 800,70 960,60 C1120,50 1280,20 1440,30 L1440,80 Z" /></svg>
      </div>
      <section id="contact" className="py-24 px-6 bg-white">
        <ContactForms lang={currentLang} dict={liveDict} />
      </section>
      <section id="reservation" className="py-24 px-4 bg-[#0d1b2a] relative overflow-hidden fade-in">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute w-96 h-96 bg-yellow-500 rounded-full blur-[120px] -top-20 -left-20"></div>
          <div className="absolute w-96 h-96 bg-blue-500 rounded-full blur-[120px] bottom-0 right-0"></div>
        </div>
        <div className="relative z-10 max-w-6xl mx-auto text-center mb-12">
          <h2 className="text-4xl font-serif font-bold text-white mb-4">{liveDict.booking.title}</h2>
          <p className="text-slate-400 text-lg">{liveDict.booking.subtitle}</p>
        </div>
        <div className="relative z-10 fade-in">
          <BookingWidget dict={liveDict} initialLang={currentLang} />
        </div>
      </section>

      {/* Contact shortcut placed right below reservation */}
      <section className="py-12 px-6 bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="text-slate-700 text-sm">
            Besoin d'un devis groupe ou d'une privatisation ?
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded border border-slate-200 text-sm hover:bg-slate-50"
              onClick={() => {
                const el = document.getElementById('contact-group') || document.getElementById('contact')
                if (el) {
                  history.pushState(null, '', '#contact-group')
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                } else {
                  window.location.hash = '#contact-group'
                }
              }}
            >
              👥 Demande groupe
            </button>
            <button
              className="px-4 py-2 rounded border border-slate-200 text-sm hover:bg-slate-50"
              onClick={() => {
                const el = document.getElementById('contact-private') || document.getElementById('contact')
                if (el) {
                  history.pushState(null, '', '#contact-private')
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                } else {
                  window.location.hash = '#contact-private'
                }
              }}
            >
              ✨ Demande de privatisation
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 text-sm">
          <div className="md:col-span-1 fade-in">
            <h5 className="text-white font-serif font-bold text-lg mb-4 flex items-center gap-2">Sweet <span className="text-[#eab308]">Narcisse</span></h5>
            <p className="leading-relaxed font-bold text-white mb-2">{liveDict.footer.departure_label}</p>
            <p className="leading-relaxed">10 Rue de la Herse<br/>68000 Colmar, France</p>
            <p className="mt-4 font-bold text-white">📞 +33 3 89 20 68 92</p>
            <p>📧 contact@sweet-narcisse.fr</p>
          </div>
          <div className="fade-in">
            <h5 className="text-white font-serif font-bold text-lg mb-4">{liveDict.footer.hours_title}</h5>
            <p>{liveDict.footer.open_days}</p>
            <div className="mt-2 space-y-1">
              <p className="text-white font-bold flex justify-between w-full max-w-[200px] whitespace-nowrap"><span>{liveDict.footer.morning_label}</span> <span>{liveDict.footer.morning_hours}</span></p>
              <p className="text-white font-bold flex justify-between w-full max-w-[200px] whitespace-nowrap"><span>{liveDict.footer.afternoon_label}</span> <span>{liveDict.footer.afternoon_hours}</span></p>
            </div>
          </div>
          <div className="fade-in">
            <h5 className="text-white font-serif font-bold text-lg mb-4">{liveDict.footer.infos}</h5>
            <Link href={`/${currentLang}/legal`} className="block hover:text-[#eab308] transition mb-2">{liveDict.footer.legal}</Link>
            <Link href={`/${currentLang}/cgv`} className="block hover:text-[#eab308] transition mb-2">{liveDict.footer.cgv}</Link>
          </div>
          <div className="md:col-span-1 fade-in">
            <h5 className="text-white font-serif font-bold text-lg mb-4">{liveDict.footer.access_map}</h5>
            <div className="rounded-lg overflow-hidden shadow-lg h-40 w-full border border-slate-700">
              <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2665.933730020825!2d7.3546046767205695!3d48.0729220556597!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x479165e89c124c77%3A0x9da47dac5d840502!2sBarque%20Colmar%20au%20fil%20de%20l%E2%80%99eau%20*2A%20Sweet%20Narcisse!5e0!3m2!1sfr!2sfr!4v1764011388547!5m2!1sfr!2sfr" width="100%" height="100%" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={liveDict.footer.map_title}></iframe>
            </div>
          </div>
        </div>
        <div className="text-center mt-12 pt-8 border-t border-slate-800 text-xs opacity-50 flex flex-col items-center gap-2">
          <Link href={`/${currentLang}/partners`} className="text-slate-400 hover:text-[#eab308] transition text-xs font-semibold">{liveDict.partners?.nav || 'Partners'}</Link>
          <span>{liveDict.footer.rights}</span>
        </div>
      </footer>
    </div>
  )
}
