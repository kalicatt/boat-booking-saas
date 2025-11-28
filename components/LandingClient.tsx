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
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuClosing, setMenuClosing] = useState(false)
  const firstLinkRef = useRef<HTMLAnchorElement|null>(null)
  const panelRef = useRef<HTMLDivElement|null>(null)
  const menuButtonRef = useRef<HTMLButtonElement|null>(null)
  const [activeSection, setActiveSection] = useState<string>('')
  const closeMenu = () => {
    if(menuOpen){
      setMenuClosing(true)
      setMenuOpen(false)
      setTimeout(()=>{ setMenuClosing(false); menuButtonRef.current?.focus() }, 340)
    }
  }
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

  // Observe sections to highlight active link
  useEffect(()=>{
    const ids = ['presentation','reviews','reservation']
    const options: IntersectionObserverInit = { root: null, rootMargin: '0px 0px -55% 0px', threshold: [0,0.25,0.5,0.75,1] }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(entry.isIntersecting) {
          setActiveSection(entry.target.id)
        }
      })
    }, options)
    ids.forEach(id => { const el = document.getElementById(id); if(el) observer.observe(el) })
    return ()=> observer.disconnect()
  },[])

  // Body scroll lock + initial focus for menu
  useEffect(()=>{
    if(menuOpen) {
      document.body.classList.add('lock-scroll')
      setMenuClosing(false)
      setTimeout(()=>{ if(firstLinkRef.current) firstLinkRef.current.focus() }, 50)
    } else {
      document.body.classList.remove('lock-scroll')
    }
  },[menuOpen])

  // Focus trap within offcanvas
  useEffect(()=>{
    if(!menuOpen) return
    const trap = (e: KeyboardEvent) => {
      if(e.key !== 'Tab') return
      const container = panelRef.current
      if(!container) return
      const selectors = 'a[href], button:not([disabled]), [tabindex]:not([-1]), select, input, textarea'
      const nodes = Array.from(container.querySelectorAll<HTMLElement>(selectors)).filter(el => !el.hasAttribute('disabled'))
      if(nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const active = document.activeElement as HTMLElement
      if(e.shiftKey) {
        if(active === first) { e.preventDefault(); last.focus() }
      } else {
        if(active === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', trap)
    return ()=> window.removeEventListener('keydown', trap)
  },[menuOpen])

  // ESC closes menu if open
  useEffect(()=>{
    const onEsc = (e: KeyboardEvent) => { if(e.key==='Escape' && menuOpen) { setMenuOpen(false) } }
    window.addEventListener('keydown', onEsc)
    return ()=> window.removeEventListener('keydown', onEsc)
  },[menuOpen])

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
      <nav className={`fixed w-full z-40 transition-all ${scrolled ? 'backdrop-blur-md bg-white/90 shadow-sm border-b border-slate-200 h-16' : 'bg-transparent h-20'} `}>
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button ref={menuButtonRef} aria-label="Menu" onClick={()=>{ setMenuOpen(true); }} className="p-2 rounded-md border border-slate-300 bg-white hover:bg-slate-100 active:scale-95 transition flex flex-col justify-center gap-[5px] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
              <span className="block w-5 h-0.5 bg-slate-700" />
              <span className="block w-5 h-0.5 bg-slate-700" />
              <span className="block w-5 h-0.5 bg-slate-700" />
            </button>
            <Link
              href={`/${currentLang}`}
              aria-label={liveDict?.nav?.home || 'Accueil'}
              className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-sm"
            >
              <img src="/images/logo.jpg" alt="Sweet Narcisse" className={`${scrolled ? 'h-10' : 'h-12'} w-auto rounded-sm shadow-sm transition-all`} />
            </Link>
          </div>
          {/* All navigation links removed from header; accessible only via offcanvas menu */}
        </div>
        {/* Off-canvas menu */}
      </nav>
      {/* Offcanvas outside nav so fixed covers viewport */}
      { (menuOpen || menuClosing) && (
        <div className={`fixed inset-0 z-50`} role="dialog" aria-modal="true">
          <div onClick={closeMenu} className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${menuOpen && !menuClosing ? 'opacity-100' : 'opacity-0'}`}></div>
          <div ref={panelRef} className={`absolute top-0 left-0 h-full w-[300px] bg-white shadow-2xl border-r border-slate-200 flex flex-col ${menuClosing ? 'menu-panel-closing' : 'menu-panel'}`}>
            <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100">
              <span className="font-serif font-bold text-lg text-[#0f172a]">Menu</span>
              <button aria-label="Fermer" onClick={closeMenu} className="p-2 rounded-md hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
                <span className="block w-5 h-0.5 bg-slate-700 rotate-45 translate-y-[3px]" />
                <span className="block w-5 h-0.5 bg-slate-700 -rotate-45 -translate-y-[3px]" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4">
              <ul className="px-4 text-sm font-semibold space-y-1">
                <li className="menu-link-animate" style={{ animationDelay: '40ms' }}>
                  <a ref={firstLinkRef} onClick={closeMenu} href="#presentation" className="block px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700 hover:text-[#0ea5e9]">{liveDict.nav.experience}</a>
                </li>
                <li className="menu-link-animate" style={{ animationDelay: '80ms' }}>
                  <Link onClick={closeMenu} href={`/${currentLang}/partners`} className="block px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700 hover:text-[#0ea5e9] uppercase">{liveDict.partners?.nav || 'Partners'}</Link>
                </li>
                <li className="menu-link-animate" style={{ animationDelay: '120ms' }}>
                  <a onClick={closeMenu} href="#contact" className="block px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700 hover:text-[#0ea5e9]">{liveDict.nav.contact}</a>
                </li>
                <li className="menu-link-animate" style={{ animationDelay: '160ms' }}>
                  <a onClick={closeMenu} href="#reservation" className="block px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700 hover:text-[#0ea5e9]">{liveDict.nav.book}</a>
                </li>
                <li className="pt-2 border-t border-slate-200 menu-link-animate" style={{ animationDelay: '200ms' }}>
                  <div ref={dropdownRef} className="relative">
                    <button onClick={()=>setLangOpen(o=>!o)} aria-haspopup="listbox" aria-expanded={langOpen} className="w-full text-left px-3 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-between text-xs font-bold">
                      <span>{currentLang.toUpperCase()}</span>
                      <span className="text-[10px]">▾</span>
                    </button>
                    {langOpen && (
                      <ul role="listbox" className="mt-2 w-full bg-white border border-slate-200 rounded-md shadow-lg z-50 text-xs divide-y divide-slate-100">
                        {['fr','en','de','es','it'].map(code => (
                          <li key={code}>
                            <Link prefetch={false} href={`/${code}${currentSearch}${currentHash}`} role="option" aria-selected={currentLang===code} className={`block px-3 py-2 hover:bg-slate-50 ${currentLang===code? 'font-bold text-[#0f172a]' : 'text-slate-600'}`} onClick={()=>{setLangOpen(false); closeMenu()}}>{code.toUpperCase()}</Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      ) }

      <header className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 hero-parallax">
          <Image src="/images/hero-bg.jpg" alt="Colmar Petite Venise" fill className="object-cover" priority />
          {/* Subtle vignette & warm overlay instead of heavy blue */}
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(0,0,0,0.35)] via-[rgba(0,0,0,0.25)] to-[rgba(0,0,0,0.55)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(14,165,233,0.25),transparent_60%)]" />
          {/* Bottom drip to break straight edge */}
          <div className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none">
            <svg viewBox="0 0 1440 160" preserveAspectRatio="none" className="w-full h-full">
              <defs>
                <linearGradient id="dripGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,0)"/>
                  <stop offset="100%" stopColor="#ffffff"/>
                </linearGradient>
                <filter id="dripShadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur" />
                  <feOffset in="blur" dx="0" dy="4" result="offset" />
                  <feColorMatrix in="offset" type="matrix" values="0 0 0 0 0.05  0 0 0 0 0.08  0 0 0 0 0.12  0 0 0 0.35 0" result="shadow" />
                  <feMerge>
                    <feMergeNode in="shadow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* shadow for depth */}
                <path d="M0,40 C240,20 420,35 620,30 C780,26 920,18 1090,35 C1230,50 1340,70 1440,60 L1440,160 L0,160 Z"
                  fill="rgba(13,27,42,0.12)" filter="url(#dripShadow)" />
              {/* soft drip with asymmetry to look organic */}
              <path d="M0,40 C240,20 420,35 620,30 C780,26 920,18 1090,35 C1230,50 1340,70 1440,60 L1440,160 L0,160 Z"
                    fill="url(#dripGrad)" />
            </svg>
          </div>
        </div>
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto fade-in">
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 drop-shadow-lg leading-[1.05]">{liveDict.hero.title}</h1>
          <p className="text-xl md:text-2xl text-slate-200 mb-10 font-light max-w-3xl mx-auto leading-relaxed">{liveDict.hero.subtitle}</p>
          <div className="flex flex-col items-center justify-center gap-5">
            <a href="#reservation" className="bg-[#0ea5e9] text-[#0f172a] px-10 py-4 rounded text-lg font-bold hover:bg-white hover:scale-105 transition transform shadow-xl inline-block">{liveDict.hero.cta}</a>
            <Link href={`/${currentLang}/partners`} className="text-sm font-semibold text-slate-200 hover:text-white transition underline decoration-[#0ea5e9] decoration-2 underline-offset-4">{liveDict.partners?.nav}</Link>
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-white/50 text-2xl">↓</div>
      </header>

      <section id="presentation" className="py-24 px-6 bg-sand-gradient section-top-blend">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6 fade-in">
            <h4 className="text-[#0ea5e9] font-bold tracking-widest text-sm uppercase">Sweet Narcisse</h4>
            <h2 className="text-4xl font-serif font-bold text-deep">{liveDict.presentation.title}</h2>
            <p className="text-slate-600 leading-relaxed text-lg text-justify">{liveDict.presentation.text}</p>
            <ul className="space-y-3 pt-4">
              {liveDict.presentation.points.map((item: string) => (
                <li key={item} className="flex items-center gap-3 text-slate-700 font-medium">
                  <span className="w-6 h-6 rounded-full bg-sky-100 text-[#0ea5e9] flex items-center justify-center font-bold">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative group fade-in">
            <div className="absolute -inset-4 bg-[#0ea5e9]/20 rounded-2xl rotate-3 group-hover:rotate-6 transition duration-500"></div>
            <Image src="/images/presentation.jpg" alt="Barque Colmar" width={800} height={500} className="relative rounded-2xl shadow-2xl w-full h-[500px] object-cover" />
          </div>
        </div>
      </section>

      <section className="py-8 px-6 bg-white section-top-blend">
        <div className="max-w-6xl mx-auto text-center mb-6 fade-in">
          <h3 className="text-sm uppercase tracking-widest text-slate-500 font-semibold">{liveDict.logos?.title}</h3>
        </div>
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-6 opacity-80">
          <div className="flex items-center gap-3 px-4 py-2 border border-slate-200 rounded-md bg-slate-50">
            <span className="text-slate-600 text-sm font-semibold">Trusted partners</span>
            <img src="/images/logo.jpg" alt="Sweet Narcisse" className="h-6 w-auto rounded-sm" />
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-white section-top-blend">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center fade-in">
            <h2 className="text-4xl font-serif font-bold mb-4">{liveDict.bento?.title}</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">{liveDict.bento?.subtitle}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3 auto-rows-[200px]">
            {liveDict.bento?.cards?.map((c: any, idx: number) => {
              const originalTitle = String(c.title || '').trim();
              const title = /friction/i.test(originalTitle) ? (currentLang === 'fr' ? 'Simplicité' : 'Simplicity') : originalTitle;
              // Use normalized display title for matching so "Frictionless" remap is honored
              const t = title.toLowerCase();
              // Map images by semantic title across locales
              let bg = '/images/presentation.jpg';
              if (/(perfect|longueur|perfetto|perfecto)/i.test(t)) bg = '/images/perfectlength.jpg';
              else if (/(impact|empreinte|impatto)/i.test(t)) bg = '/images/low-impact.jpg';
              else if (/(guide|humain|guida|humano)/i.test(t)) bg = '/images/human-guide.jpg';
              else if (/(group|groupe|gruppo|grupo|privat)/i.test(t)) bg = '/images/group-private.jpg';
              else if (/(central|centre|centrale|centrado|departure|départ)/i.test(t)) bg = '/images/central-departure.jpg';
              else if (/(simplicité|simplicity|simple|facile)/i.test(t)) bg = '/images/simplicity.jpg';
                return (
                  <div
                    key={idx}
                    className={`fade-in sn-card p-5 overflow-hidden hover:shadow-lg transition group ${idx===0||idx===3? 'md:row-span-2' : ''}`}
                    style={{
                      backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.20), rgba(0,0,0,0.12)), url(${bg})`,
                      backgroundSize: 'cover',
                    backgroundPosition: 'center top',
                    backgroundBlendMode: 'normal'
                    }}
                  >
                    <div className="bg-white/85 rounded-md px-3 py-2 inline-block shadow-sm max-w-[85%]">
                      <h3 className="font-serif text-lg font-bold mb-0.5 text-[#0f172a] group-hover:text-[#0ea5e9] transition">{title}</h3>
                      <p className="text-[13px] text-slate-700 leading-relaxed">{c.text}</p>
                  </div>
                  </div>
                );
            })}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-sand-gradient section-top-blend" id="reviews">
        <div className="max-w-5xl mx-auto text-center mb-12 fade-in">
          <h2 className="text-4xl font-serif font-bold mb-3">{liveDict.social?.title}</h2>
          <p className="text-slate-600 max-w-xl mx-auto">{liveDict.social?.subtitle}</p>
        </div>
        <div className="max-w-6xl mx-auto">
          <TripReviews dict={liveDict} lang={currentLang} />
        </div>
      </section>

      <div className="wave-divider" aria-hidden="true">
        <svg viewBox="0 0 1440 100" preserveAspectRatio="none"><path fill="#0d1b2a" d="M0,100 L0,50 C160,20 320,20 480,40 C640,60 800,80 960,70 C1120,60 1280,30 1440,40 L1440,100 Z" /></svg>
      </div>
      <section id="reservation" className="-mt-6 py-24 px-4 bg-[#0d1b2a] relative overflow-hidden fade-in section-top-blend section-top-blend-dark">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute w-96 h-96 bg-sky-500 rounded-full blur-[120px] -top-20 -left-20"></div>
          <div className="absolute w-96 h-96 bg-blue-500 rounded-full blur-[120px] bottom-0 right-0"></div>
        </div>
        <div className="relative z-10 max-w-6xl mx-auto text-center mb-12">
          <h2 className="text-4xl font-serif font-bold text-white mb-4">{liveDict.booking.title}</h2>
          <p className="text-slate-400 text-lg">{liveDict.booking.subtitle}</p>
        </div>
        <div className="relative z-10 fade-in">
          <div className="sn-card sn-card-body">
            <BookingWidget dict={liveDict} initialLang={currentLang} />
          </div>
        </div>
      </section>

      {/* Contact forms are now shown as a modal from BookingWidget; no standalone section */}

      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 text-sm">
          <div className="md:col-span-1 fade-in">
            <h5 className="text-white font-serif font-bold text-lg mb-4 flex items-center gap-2">
              <img src="/images/logo.jpg" alt="Sweet Narcisse" className="h-6 w-auto rounded-sm" />
              <span>Sweet <span className="text-[#0ea5e9]">Narcisse</span></span>
            </h5>
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
            <Link href={`/${currentLang}/legal`} className="block hover:text-[#0ea5e9] transition mb-2">{liveDict.footer.legal}</Link>
            <Link href={`/${currentLang}/cgv`} className="block hover:text-[#0ea5e9] transition mb-2">{liveDict.footer.cgv}</Link>
          </div>
          <div className="md:col-span-1 fade-in">
            <h5 className="text-white font-serif font-bold text-lg mb-4">{liveDict.footer.access_map}</h5>
            <div className="rounded-lg overflow-hidden shadow-lg h-40 w-full border border-slate-700">
              <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2665.933730020825!2d7.3546046767205695!3d48.0729220556597!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x479165e89c124c77%3A0x9da47dac5d840502!2sBarque%20Colmar%20au%20fil%20de%20l%E2%80%99eau%20*2A%20Sweet%20Narcisse!5e0!3m2!1sfr!2sfr!4v1764011388547!5m2!1sfr!2sfr" width="100%" height="100%" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={liveDict.footer.map_title}></iframe>
            </div>
          </div>
        </div>
        <div className="text-center mt-12 pt-8 border-t border-slate-800 text-xs opacity-50 flex flex-col items-center gap-2">
          <Link href={`/${currentLang}/partners`} className="text-slate-400 hover:text-[#0ea5e9] transition text-xs font-semibold">{liveDict.partners?.nav || 'Partners'}</Link>
          <span>{liveDict.footer.rights}</span>
        </div>
      </footer>
    </div>
  )
}
