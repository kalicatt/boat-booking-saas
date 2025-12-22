"use client"
import Image from 'next/image'
import OptimizedImage from '@/components/OptimizedImage'
import BookingWidget from '@/components/BookingWidget'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import TripReviews from '@/components/TripReviews'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// ============================================
// 🎬 Parallax Scrolling Hook (comme Goonies)
// ============================================
function useParallax() {
  const [scrollY, setScrollY] = useState(0)
  const [windowHeight, setWindowHeight] = useState(0)
  const ticking = useRef(false)

  useEffect(() => {
    setWindowHeight(window.innerHeight)
    setScrollY(window.scrollY)

    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY)
          ticking.current = false
        })
        ticking.current = true
      }
    }

    const handleResize = () => {
      setWindowHeight(window.innerHeight)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Calcule le déplacement parallax pour un élément
  const getParallaxStyle = useCallback((speed: number = 0.5, offset: number = 0) => {
    const y = (scrollY - offset) * speed
    return {
      transform: `translate3d(0, ${y}px, 0)`,
      willChange: 'transform' as const,
    }
  }, [scrollY])

  // Calcule l'opacité basée sur la position de scroll
  const getScrollOpacity = useCallback((start: number, end: number) => {
    if (scrollY < start) return 0
    if (scrollY > end) return 1
    return (scrollY - start) / (end - start)
  }, [scrollY])

  // Vérifie si un élément est visible dans le viewport
  const isInView = useCallback((elementTop: number, threshold: number = 0.2) => {
    const viewportBottom = scrollY + windowHeight
    return viewportBottom > elementTop + (windowHeight * threshold)
  }, [scrollY, windowHeight])

  return { scrollY, windowHeight, getParallaxStyle, getScrollOpacity, isInView }
}
import type { CmsPayload } from '@/lib/cms/contentSelectors'
import {
  DEFAULT_LOCALE as CMS_DEFAULT_LOCALE,
  SUPPORTED_LOCALES as CMS_SUPPORTED_LOCALES,
  type LocaleCode,
  type TranslationRecord
} from '@/types/cms'

const LANGUAGE_OPTIONS = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' }
] as const

type SupportedLang = (typeof LANGUAGE_OPTIONS)[number]['code']

const FALLBACK_LANG: SupportedLang = 'en'

const isSupportedLang = (value: string): value is SupportedLang =>
  LANGUAGE_OPTIONS.some(option => option.code === value)

interface LandingDictionary extends Record<string, unknown> {
  hero?: { title?: string; subtitle?: string; cta?: string }
  nav?: { home?: string; experience?: string; contact?: string; book?: string }
  partners?: { nav?: string; learn_more?: string }
  logos?: { title?: string }
  presentation?: { title?: string; text?: string; points?: string[] }
  bento?: {
    title?: string
    subtitle?: string
    cards?: Array<{ title?: string; text?: string }>
  }
  social?: { title?: string; subtitle?: string }
  booking?: { title?: string; subtitle?: string }
  footer?: {
    infos?: string
    legal?: string
    cgv?: string
    privacy?: string
    access_map?: string
    map_title?: string
    hours_title?: string
    open_days?: string
    morning_label?: string
    morning_hours?: string
    afternoon_label?: string
    afternoon_hours?: string
    departure_label?: string
    rights?: string
  }
}

const pickCmsLocale = (langCode: SupportedLang | string, fallback: LocaleCode): LocaleCode => {
  return CMS_SUPPORTED_LOCALES.includes(langCode as LocaleCode)
    ? (langCode as LocaleCode)
    : fallback
}

const pickCmsTranslation = (record: TranslationRecord, locale: LocaleCode): string => {
  const direct = record[locale]
  if (direct && direct.trim().length) return direct
  const fallback = record[CMS_DEFAULT_LOCALE]
  if (fallback && fallback.trim().length) return fallback
  for (const code of CMS_SUPPORTED_LOCALES) {
    const candidate = record[code]
    if (candidate && candidate.trim().length) {
      return candidate
    }
  }
  return ''
}

const resolveCmsField = (
  value: TranslationRecord | string | undefined,
  locale: LocaleCode
): string => {
  if (!value) return ''
  if (typeof value === 'string') return value
  return pickCmsTranslation(value, locale)
}

type LandingClientProps = {
  dict: LandingDictionary
  lang: SupportedLang
  cmsContent?: CmsPayload | null
  initialCmsLocale: LocaleCode
}

export default function LandingClient({ dict, lang, cmsContent, initialCmsLocale }: LandingClientProps) {
  const [scrolled, setScrolled] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuClosing, setMenuClosing] = useState(false)
  const firstLinkRef = useRef<HTMLAnchorElement|null>(null)
  const panelRef = useRef<HTMLDivElement|null>(null)
  const menuButtonRef = useRef<HTMLButtonElement|null>(null)
  
  // Parallax scroll system
  const { scrollY, windowHeight, getParallaxStyle, isInView } = useParallax()
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set())
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())
  
  // Scroll progress for floating indicator
  const [scrollProgress, setScrollProgress] = useState(0)
  const [showScrollIndicator, setShowScrollIndicator] = useState(false)
  
  const closeMenu = () => {
    if(menuOpen){
      setMenuClosing(true)
      setMenuOpen(false)
      setTimeout(()=>{ setMenuClosing(false); menuButtonRef.current?.focus() }, 340)
    }
  }
  const dropdownRef = useRef<HTMLDivElement|null>(null)
  const pathname = usePathname()
  const routeLang = pathname?.split('/')[1] || ''
  const [currentLang, setCurrentLang] = useState<SupportedLang>(isSupportedLang(lang) ? lang : FALLBACK_LANG)
  const [liveDict, setLiveDict] = useState<LandingDictionary>(dict)
  const [activeHeroIndex, setActiveHeroIndex] = useState(0)
  const cmsSiteConfigMap = useMemo(() => {
    return new Map<string, TranslationRecord | string>(
      (cmsContent?.siteConfig ?? []).map((entry) => [entry.key, entry.value])
    )
  }, [cmsContent])
  const activeCmsLocale = pickCmsLocale(currentLang, initialCmsLocale)
  const heroSlides = useMemo(() => {
    return (cmsContent?.heroSlides ?? []).filter((slide) => slide.isActive)
  }, [cmsContent])
  const visiblePartners = useMemo(() => {
    return (cmsContent?.partners ?? []).filter((partner) => partner.isVisible)
  }, [cmsContent])
  const [currentHash, setCurrentHash] = useState('')
  const [currentSearch, setCurrentSearch] = useState('')
  const currentLangOption = LANGUAGE_OPTIONS.find(option => option.code === currentLang) || LANGUAGE_OPTIONS[0]
  const getCmsCopy = (key: string): string => {
    const raw = cmsSiteConfigMap.get(key)
    return resolveCmsField(raw, activeCmsLocale)
  }
  const heroEyebrow = getCmsCopy('home.hero.eyebrow')
  const heroCtaCopy = getCmsCopy('home.hero.cta') || liveDict.hero?.cta || 'Book now'
  const storyParagraphOverride = getCmsCopy('home.story.paragraph')
  const heroIndexSafe = heroSlides.length ? activeHeroIndex % heroSlides.length : 0
  const heroSlide = heroSlides[heroIndexSafe] ?? null
  const heroTitle = heroSlide
    ? pickCmsTranslation(heroSlide.title, activeCmsLocale) || liveDict.hero?.title || 'Sweet Narcisse'
    : liveDict.hero?.title || 'Sweet Narcisse'
  const heroSubtitle = heroSlide
    ? pickCmsTranslation(heroSlide.subtitle, activeCmsLocale) || liveDict.hero?.subtitle || ''
    : liveDict.hero?.subtitle || ''
  const heroDesktopImage = heroSlide?.imageDesktop ?? '/images/hero-bg.webp'
  const heroMobileImage = heroSlide?.imageMobile ?? heroDesktopImage
  const storyParagraph = storyParagraphOverride || (liveDict.presentation?.text as string || '')
  
  // Parallax section visibility detection
  useEffect(() => {
    const checkVisibility = () => {
      const newVisible = new Set<string>()
      sectionRefs.current.forEach((el, id) => {
        const rect = el.getBoundingClientRect()
        const threshold = window.innerHeight * 0.15
        if (rect.top < window.innerHeight - threshold && rect.bottom > threshold) {
          newVisible.add(id)
        }
      })
      setVisibleSections(newVisible)
    }
    
    window.addEventListener('scroll', checkVisibility, { passive: true })
    checkVisibility()
    return () => window.removeEventListener('scroll', checkVisibility)
  }, [])
  
  // Register section ref helper
  const registerSection = useCallback((id: string) => (el: HTMLElement | null) => {
    if (el) sectionRefs.current.set(id, el)
    else sectionRefs.current.delete(id)
  }, [])
  
  // Floating scroll indicator
  useEffect(() => {
    let hideTimeout: NodeJS.Timeout
    
    const updateScrollProgress = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = Math.min(window.scrollY / docHeight, 1)
      setScrollProgress(progress)
      setShowScrollIndicator(true)
      
      clearTimeout(hideTimeout)
      hideTimeout = setTimeout(() => {
        setShowScrollIndicator(false)
      }, 1500)
    }
    
    window.addEventListener('scroll', updateScrollProgress, { passive: true })
    return () => {
      window.removeEventListener('scroll', updateScrollProgress)
      clearTimeout(hideTimeout)
    }
  }, [])
  
  useEffect(()=>{
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    
    // Legacy fade-in support
    const revealFadeIn = () => {
      document.querySelectorAll('.fade-in').forEach(el => {
        const r = el.getBoundingClientRect();
        if(r.top < window.innerHeight - 60) el.classList.add('fade-in-visible')
      })
    }
    window.addEventListener('scroll', revealFadeIn)
    revealFadeIn()
    
    const onHash = () => setCurrentHash(window.location.hash || '')
    const onSearch = () => setCurrentSearch(window.location.search || '')
    window.addEventListener('hashchange', onHash)
    onHash()
    onSearch()
    return ()=> { window.removeEventListener('scroll', onScroll); window.removeEventListener('scroll', revealFadeIn); window.removeEventListener('hashchange', onHash) }
  },[])

  useEffect(()=>{
    if(!langOpen) return
    const onKey = (e: KeyboardEvent) => {
      if(e.key === 'Escape') setLangOpen(false)
    }
    const onClickOutside = (e: MouseEvent) => {
      if(dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('click', onClickOutside)
    return ()=> {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('click', onClickOutside)
    }
  },[langOpen])

  useEffect(() => {
    if (heroSlides.length <= 1) {
      return
    }
    const timer = window.setInterval(() => {
      setActiveHeroIndex((previous) => previous + 1)
    }, 8000)
    return () => window.clearInterval(timer)
  }, [heroSlides.length])

  // Smooth scroll to reservation with offset and focus (no instant jump)
  useEffect(()=>{
    const scrollToReservation = () => {
      const target = document.getElementById('reservation')
      if(!target) return
      const headerOffset = scrolled ? 64 : 80
      const y = target.getBoundingClientRect().top + window.pageYOffset - headerOffset - 8
      window.scrollTo({ top: y, behavior: 'smooth' })
      // Focus the date input after animation
      setTimeout(()=>{
        const dateInput = target.querySelector('input[type="date"]') as HTMLElement | null
        dateInput?.focus()
      }, 650)
    }
    // Intercept clicks on reservation anchors for smooth scroll
    const anchors = Array.from(document.querySelectorAll('a[href="#reservation"]')) as HTMLAnchorElement[]
    const onClick = (e: MouseEvent) => {
      e.preventDefault()
      scrollToReservation()
    }
    anchors.forEach(a => a.addEventListener('click', onClick))
    // If page loaded with hash already
    if(window.location.hash === '#reservation') {
      // Delay to ensure layout rendered
      setTimeout(scrollToReservation, 100)
    }
    // Listen to hashchange triggered by other means
    const onHashSmooth = () => { if(window.location.hash === '#reservation') scrollToReservation() }
    window.addEventListener('hashchange', onHashSmooth)
    return ()=> {
      anchors.forEach(a => a.removeEventListener('click', onClick))
      window.removeEventListener('hashchange', onHashSmooth)
    }
  }, [scrolled])

  // Body scroll lock + initial focus for menu
  useEffect(()=>{
    if(menuOpen) {
      document.body.classList.add('lock-scroll')
      // make state updates async to avoid cascading renders inside the effect
      setTimeout(()=> setMenuClosing(false), 0)
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
    if (isSupportedLang(routeLang) && routeLang !== currentLang) {
      // set state asynchronously so we avoid sync updates inside effect
      setTimeout(() => setCurrentLang(routeLang), 0)
    }
  }, [routeLang, currentLang])

  // Re-fetch dictionary client-side when currentLang changes (soft navigation)
  useEffect(()=>{
    let cancelled = false
    fetch(`/api/dict/${currentLang}`)
      .then(r=>r.json())
      .then(data=>{
        if(!cancelled && data?.dict) setLiveDict(data.dict as LandingDictionary)
      })
      .catch(()=>{})
    return ()=>{ cancelled = true }
  },[currentLang])

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 scroll-smooth">
      {/* Floating scroll bubble indicator */}
      <div 
        className={`fixed right-3 z-50 transition-all duration-300 pointer-events-none ${showScrollIndicator ? 'opacity-100' : 'opacity-0'}`}
        style={{
          top: `calc(10% + ${scrollProgress * 80}%)`,
        }}
      >
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-sky-400 rounded-full blur-md opacity-50" />
          {/* Main bubble */}
          <div 
            className="relative w-3 h-8 bg-gradient-to-b from-sky-400 via-sky-500 to-sky-600 rounded-full shadow-lg"
            style={{
              boxShadow: '0 0 20px rgba(14, 165, 233, 0.5), 0 0 40px rgba(14, 165, 233, 0.2)',
            }}
          />
        </div>
      </div>
      
      <nav className={`fixed w-full z-40 transition-all ${scrolled ? 'backdrop-blur-md bg-white/90 shadow-sm border-b border-slate-200 h-16' : 'bg-transparent h-20'} `}>
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <button 
            ref={menuButtonRef} 
            aria-label="Menu" 
            onClick={()=>{ setMenuOpen(true); }} 
            className="hamburger-btn rounded-lg hover:bg-white/10 active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <span className={`hamburger-line ${scrolled ? 'bg-slate-700' : 'bg-white'}`} />
            <span className={`hamburger-line ${scrolled ? 'bg-slate-700' : 'bg-white'}`} />
            <span className={`hamburger-line ${scrolled ? 'bg-slate-700' : 'bg-white'}`} />
          </button>
          {/* Logo removed - clean minimal header */}
          <div className="flex-1"></div>
        </div>
      </nav>
      {/* Offcanvas outside nav so fixed covers viewport */}
      { (menuOpen || menuClosing) && (
        <div className={`fixed inset-0 z-50`} role="dialog" aria-modal="true">
          <div onClick={closeMenu} className={`menu-backdrop absolute inset-0 bg-slate-900/60 transition-opacity duration-300 ${menuOpen && !menuClosing ? 'opacity-100' : 'opacity-0'}`}></div>
          <div ref={panelRef} className={`absolute top-0 left-0 h-full w-[320px] bg-gradient-to-b from-white to-slate-50 shadow-2xl flex flex-col ${menuClosing ? 'menu-panel-closing' : 'menu-panel'}`}>
            <div className="flex items-center justify-between px-6 h-20 border-b border-slate-100/80">
              <span className="font-serif font-bold text-2xl bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Sweet Narcisse</span>
              <button 
                aria-label="Fermer" 
                onClick={closeMenu} 
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all hover:rotate-90 duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-8 px-4">
              <ul className="space-y-1">
                <li className="menu-link-animate" style={{ animationDelay: '50ms' }}>
                  <a ref={firstLinkRef} onClick={closeMenu} href="#presentation" className="menu-link">
                    {liveDict.nav?.experience ?? 'Experience'}
                  </a>
                </li>
                <li className="menu-link-animate" style={{ animationDelay: '100ms' }}>
                  <Link onClick={closeMenu} href={`/${currentLang}/partners`} className="menu-link">
                    {liveDict.partners?.nav || 'Partners'}
                  </Link>
                </li>
                <li className="menu-link-animate" style={{ animationDelay: '150ms' }}>
                  <a onClick={closeMenu} href="#contact" className="menu-link">
                    {liveDict.nav?.contact ?? 'Contact'}
                  </a>
                </li>
                <li className="menu-link-animate" style={{ animationDelay: '200ms' }}>
                  <a onClick={closeMenu} href="#reservation" className="menu-link">
                    {liveDict.nav?.book ?? 'Book'}
                  </a>
                </li>
                
                <li className="menu-link-animate pt-6" style={{ animationDelay: '250ms' }}>
                  <div className="menu-divider"></div>
                  <span className="block px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-slate-400 font-bold">{liveDict.footer?.infos ?? 'Infos'}</span>
                </li>
                <li className="menu-link-animate" style={{ animationDelay: '300ms' }}>
                  <Link onClick={closeMenu} href={`/${currentLang}/legal`} className="menu-link text-sm text-slate-500">
                    {liveDict.footer?.legal ?? 'Legal'}
                  </Link>
                </li>
                <li className="menu-link-animate" style={{ animationDelay: '350ms' }}>
                  <Link onClick={closeMenu} href={`/${currentLang}/cgv`} className="menu-link text-sm text-slate-500">
                    {liveDict.footer?.cgv ?? 'Terms'}
                  </Link>
                </li>
                <li className="menu-link-animate" style={{ animationDelay: '400ms' }}>
                  <Link onClick={closeMenu} href={`/${currentLang}/privacy`} className="menu-link text-sm text-slate-500">
                    {liveDict.footer?.privacy ?? 'Privacy'}
                  </Link>
                </li>
                
                <li className="menu-link-animate pt-6" style={{ animationDelay: '450ms' }}>
                  <div className="menu-divider"></div>
                  <div ref={dropdownRef} className="mt-4">
                    <button 
                      onClick={()=>setLangOpen(o=>!o)} 
                      aria-haspopup="listbox" 
                      aria-expanded={langOpen} 
                      className="w-full text-left px-4 py-3 rounded-xl bg-gradient-to-r from-slate-100 to-slate-50 hover:from-slate-200 hover:to-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow"
                    >
                      <span className="flex items-center gap-3">
                        <span aria-hidden="true" className="text-xl">{currentLangOption.flag}</span>
                        <span className="font-semibold">{currentLangOption.label}</span>
                      </span>
                      <svg className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${langOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {langOpen && (
                      <ul role="listbox" className="mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100">
                        {LANGUAGE_OPTIONS.map((option, idx) => (
                          <li key={option.code} className="menu-link-animate" style={{ animationDelay: `${idx * 50}ms` }}>
                            <Link
                              prefetch={false}
                              href={`/${option.code}${currentSearch}${currentHash}`}
                              role="option"
                              aria-selected={currentLang===option.code}
                              className={`flex items-center gap-3 px-4 py-3 hover:bg-gradient-to-r hover:from-sky-50 hover:to-transparent transition-all ${currentLang===option.code ? 'font-bold text-[#0ea5e9] bg-sky-50/50' : 'text-slate-600'}`}
                              onClick={()=>{setLangOpen(false); closeMenu()}}
                            >
                              <span aria-hidden="true" className="text-xl">{option.flag}</span>
                              <span>{option.label}</span>
                              {currentLang===option.code && (
                                <svg className="w-5 h-5 ml-auto text-[#0ea5e9]" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              </ul>
            </nav>
            {/* Menu footer */}
            <div className="px-6 py-4 border-t border-slate-100/80 bg-slate-50/50">
              <p className="text-xs text-slate-400 text-center">© {new Date().getFullYear()} Sweet Narcisse</p>
            </div>
          </div>
        </div>
      ) }

      <header
        id="hero"
        data-preview-anchor="hero"
        className="relative h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Parallax background - bouge lentement */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            transform: `translate3d(0, ${scrollY * 0.4}px, 0) scale(${1 + scrollY * 0.0002})`,
            willChange: 'transform',
          }}
        >
          <Image
            src={heroDesktopImage}
            alt={heroTitle}
            fill
            priority
            sizes="100vw"
            className="hidden object-cover sm:block"
          />
          <Image
            src={heroMobileImage}
            alt={heroTitle}
            fill
            priority
            sizes="100vw"
            className="object-cover sm:hidden"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(0,0,0,0.35)] via-[rgba(0,0,0,0.25)] to-[rgba(0,0,0,0.55)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(14,165,233,0.25),transparent_60%)]" />
          {/* Transition fluide vers section suivante */}
          <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none bg-gradient-to-t from-white via-white/80 to-transparent" />
        </div>
        {/* Hero content - bouge plus vite (effet de profondeur) */}
        <div 
          className="relative z-10 mx-auto max-w-5xl px-4 text-center"
          style={{
            transform: `translate3d(0, ${scrollY * 0.15}px, 0)`,
            opacity: Math.max(0, 1 - scrollY / 600),
            willChange: 'transform, opacity',
          }}
        >
          {heroEyebrow ? (
            <p className="mb-4 text-fluid-xs font-semibold uppercase tracking-[0.45em] text-sky-200 parallax-text-reveal">
              {heroEyebrow}
            </p>
          ) : null}
          <h1 className="text-fluid-hero font-serif font-bold leading-[1.05] text-white drop-shadow-lg parallax-text-reveal" style={{ animationDelay: '0.2s' }}>
            {heroTitle}
          </h1>
          <p className="mx-auto mb-10 max-w-3xl text-fluid-xl font-light leading-relaxed text-slate-200 parallax-text-reveal" style={{ animationDelay: '0.4s' }}>
            {heroSubtitle}
          </p>
          <div className="flex flex-col items-center justify-center gap-5 parallax-text-reveal" style={{ animationDelay: '0.6s' }}>
            <a
              href="#reservation"
              className="btn-interactive btn-haptic btn-ripple inline-block rounded-xl bg-[#0ea5e9] px-10 py-4 text-fluid-base font-bold text-[#0f172a] shadow-xl hover:bg-white hover:shadow-2xl"
            >
              {heroCtaCopy}
            </a>
            <Link
              href={`/${currentLang}/partners`}
              className="text-fluid-sm font-semibold text-slate-200 underline decoration-[#0ea5e9] decoration-2 underline-offset-4 transition hover:text-white"
            >
              {liveDict.partners?.nav}
            </Link>
          </div>
        </div>
        {heroSlides.length > 1 ? (
          <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-2">
            {heroSlides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Slide ${index + 1}`}
                aria-current={index === activeHeroIndex}
                onClick={() => setActiveHeroIndex(index)}
                className={`h-2 w-6 rounded-full transition ${index === activeHeroIndex ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
        ) : null}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-2xl text-white/60">
          <span className="inline-block animate-bounce">↓</span>
        </div>
      </header>

      {/* ============================================
          📖 SECTION STORYTELLING PARALLAX 
          ============================================ */}
      <section
        id="presentation"
        ref={registerSection('presentation')}
        data-preview-anchor="presentation"
        className="relative py-32 px-6 overflow-hidden min-h-screen"
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #faf8f5 30%, #f3e5c7 100%)'
        }}
      >
        {/* Floating decorative elements with parallax */}
        <div 
          className="absolute top-20 left-10 w-32 h-32 bg-sky-200/30 rounded-full blur-3xl pointer-events-none"
          style={{ transform: `translate3d(0, ${(scrollY - windowHeight) * -0.1}px, 0)` }}
        />
        <div 
          className="absolute bottom-40 right-20 w-48 h-48 bg-sky-300/20 rounded-full blur-3xl pointer-events-none"
          style={{ transform: `translate3d(0, ${(scrollY - windowHeight) * 0.15}px, 0)` }}
        />
        
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center relative z-10">
          {/* Text content - slides from left */}
          <div 
            className={`space-y-6 transition-all duration-1000 ease-out ${visibleSections.has('presentation') ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-20'}`}
          >
            <h4 className="text-[#0ea5e9] font-bold tracking-widest text-fluid-xs uppercase">Sweet Narcisse</h4>
            <h2 className="text-fluid-3xl font-serif font-bold text-deep">{liveDict.presentation?.title ?? ''}</h2>
            <p className="text-slate-600 leading-relaxed text-fluid-base text-justify">{storyParagraph}</p>
            <ul className="space-y-3 pt-4">
              {(liveDict.presentation?.points ?? []).map((item: string, i: number) => (
                <li 
                  key={item} 
                  className={`flex items-center gap-3 text-slate-700 font-medium transition-all duration-700 ease-out ${visibleSections.has('presentation') ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}
                  style={{ transitionDelay: `${0.3 + i * 0.15}s` }}
                >
                  <span className="w-6 h-6 rounded-full bg-sky-100 text-[#0ea5e9] flex items-center justify-center font-bold text-sm">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Image - slides from right with parallax rotation */}
          <div 
            className={`relative group transition-all duration-1000 ease-out ${visibleSections.has('presentation') ? 'opacity-100 translate-x-0 rotate-0' : 'opacity-0 translate-x-20 rotate-3'}`}
            style={{ transitionDelay: '0.2s' }}
          >
            <div 
              className="absolute -inset-4 bg-[#0ea5e9]/20 rounded-2xl transition duration-500"
              style={{ transform: `rotate(${3 + Math.sin(scrollY * 0.002) * 2}deg)` }}
            />
            <OptimizedImage 
              src="/images/presentation.webp" 
              fallback="/images/presentation.jpg" 
              alt="Barque Colmar" 
              width={800} 
              height={500} 
              className="relative rounded-2xl shadow-2xl w-full h-[500px] object-cover group-hover:scale-[1.02] transition-transform duration-700" 
            />
          </div>
        </div>
      </section>

      {/* Partners section avec transition fluide */}
      <section className="py-12 px-6" style={{ background: 'linear-gradient(180deg, #faf8f5 0%, #ffffff 100%)' }}>
        <div className="max-w-6xl mx-auto text-center mb-6">
          <h3 className="text-sm uppercase tracking-widest text-slate-500 font-semibold">{liveDict.logos?.title}</h3>
        </div>
        {visiblePartners.length ? (
          <div className="max-w-5xl mx-auto grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePartners.map((partner) => (
              <article
                key={partner.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-left shadow-sm"
              >
                <div className="flex h-24 items-center justify-center rounded-xl border border-slate-200 bg-white">
                  <div
                    className="h-14 w-32 bg-contain bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${partner.logoUrl})` }}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{partner.name}</p>
                  {partner.websiteUrl ? (
                    <a
                      href={partner.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[#0ea5e9] transition hover:text-slate-900"
                    >
                      {liveDict.partners?.learn_more ?? 'Voir le site'}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">{liveDict.footer?.infos ?? 'Info'}</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
            Aucun partenaire visible pour le moment.
          </div>
        )}
      </section>

      {/* ============================================
          📦 SECTION BENTO AVEC PARALLAX STAGGER
          ============================================ */}
      <section 
        ref={registerSection('bento')}
        className="relative py-32 px-6 overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #faf8f5 0%, #ffffff 20%, #ffffff 80%, #ffffff 100%)'
        }}
      >
        {/* Decorative parallax backgrounds */}
        <div 
          className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none"
          style={{ transform: `translate3d(0, ${(scrollY - windowHeight * 1.5) * -0.05}px, 0)` }}
        >
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-sky-100 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-blue-100 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div 
            className={`mb-16 text-center transition-all duration-1000 ease-out ${visibleSections.has('bento') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            <h2 className="text-fluid-3xl font-serif font-bold mb-4">{liveDict.bento?.title}</h2>
            <p className="text-fluid-base text-slate-600 max-w-2xl mx-auto">{liveDict.bento?.subtitle}</p>
          </div>
          <div className="bento-grid">
            {liveDict.bento?.cards?.map((c: Record<string, unknown>, idx: number) => {
              const originalTitle = String(c.title || '').trim();
              const title = /friction/i.test(originalTitle) ? (currentLang === 'fr' ? 'Simplicité' : 'Simplicity') : originalTitle;
              const t = title.toLowerCase();
              let bg = '/images/presentation.webp';
              if (/(perfect|longueur|perfetto|perfecto)/i.test(t)) bg = '/images/perfectlength.webp';
              else if (/(impact|empreinte|impatto)/i.test(t)) bg = '/images/low-impact.jpg';
              else if (/(guide|humain|guida|humano)/i.test(t)) bg = '/images/human-guide.webp';
              else if (/(group|groupe|gruppo|grupo|privat)/i.test(t)) bg = '/images/group-private.webp';
              else if (/(central|centre|centrale|centrado|departure|départ)/i.test(t)) bg = '/images/central-departure.jpg';
              else if (/(simplicité|simplicity|simple|facile)/i.test(t)) bg = '/images/simplicity.webp';
              const text = typeof c.text === 'string' ? c.text : String(c.text ?? '');
              return (
                <div
                  key={idx}
                  className={`bento-card group min-h-[280px] transition-all duration-700 ease-out ${visibleSections.has('bento') ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}
                  style={{
                    backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.35), rgba(0,0,0,0.15)), url(${bg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center top',
                    transitionDelay: `${0.1 + idx * 0.12}s`,
                  }}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    e.currentTarget.style.setProperty('--mouse-x', `${x}%`);
                    e.currentTarget.style.setProperty('--mouse-y', `${y}%`);
                  }}
                >
                  <div className="bento-content h-full flex flex-col justify-end p-5">
                    <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg transform transition-all duration-300 group-hover:bg-white group-hover:shadow-xl group-hover:-translate-y-1">
                      <h3 className="font-serif text-fluid-lg font-bold text-[#0f172a] group-hover:text-[#0ea5e9] transition-colors mb-1">
                        {title}
                      </h3>
                      <p className="text-fluid-sm text-slate-600 leading-relaxed">{text}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================
          ⭐ SECTION AVIS AVEC PARALLAX
          ============================================ */}
      <section 
        ref={registerSection('reviews')}
        className="relative py-32 px-6 overflow-hidden" 
        id="reviews"
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 10%, #e8f0f5 100%)'
        }}
      >
        {/* Parallax floating stars/decorations */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div 
            className="absolute top-20 left-[10%] text-4xl opacity-20"
            style={{ transform: `translate3d(0, ${(scrollY - windowHeight * 2.5) * -0.08}px, 0)` }}
          >⭐</div>
          <div 
            className="absolute top-40 right-[15%] text-3xl opacity-15"
            style={{ transform: `translate3d(0, ${(scrollY - windowHeight * 2.5) * 0.1}px, 0)` }}
          >⭐</div>
          <div 
            className="absolute bottom-32 left-[20%] text-2xl opacity-10"
            style={{ transform: `translate3d(0, ${(scrollY - windowHeight * 2.5) * -0.12}px, 0)` }}
          >⭐</div>
        </div>
        
        <div 
          className={`max-w-5xl mx-auto text-center mb-12 transition-all duration-1000 ease-out ${visibleSections.has('reviews') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          <h2 className="text-fluid-3xl font-serif font-bold mb-3">{liveDict.social?.title}</h2>
          <p className="text-fluid-base text-slate-600 max-w-xl mx-auto">{liveDict.social?.subtitle}</p>
        </div>
        <div 
          className={`max-w-6xl mx-auto transition-all duration-1000 ease-out ${visibleSections.has('reviews') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
          style={{ transitionDelay: '0.2s' }}
        >
          <TripReviews dict={liveDict} lang={currentLang} />
        </div>
      </section>

      {/* ============================================
          📅 SECTION RÉSERVATION - Transition fluide
          ============================================ */}
      <section 
        ref={registerSection('reservation')}
        id="reservation" 
        className="py-32 px-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #e8f0f5 0%, #1e3a5f 15%, #0d1b2a 30%, #0d1b2a 100%)'
        }}
      >
        {/* Parallax glowing orbs */}
        <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
          <div 
            className="absolute w-96 h-96 bg-sky-500 rounded-full blur-[120px] -top-20 -left-20"
            style={{ transform: `translate3d(${(scrollY - windowHeight * 3) * 0.05}px, ${(scrollY - windowHeight * 3) * -0.03}px, 0)` }}
          />
          <div 
            className="absolute w-96 h-96 bg-blue-500 rounded-full blur-[120px] bottom-0 right-0"
            style={{ transform: `translate3d(${(scrollY - windowHeight * 3) * -0.05}px, ${(scrollY - windowHeight * 3) * 0.03}px, 0)` }}
          />
          <div 
            className="absolute w-64 h-64 bg-cyan-400 rounded-full blur-[100px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ transform: `translate(-50%, -50%) scale(${1 + Math.sin((scrollY - windowHeight * 3) * 0.002) * 0.2})` }}
          />
        </div>
        <div 
          className={`relative z-10 max-w-6xl mx-auto text-center mb-12 transition-all duration-1000 ease-out ${visibleSections.has('reservation') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          <h2 className="text-4xl font-serif font-bold text-white mb-4">{liveDict.booking?.title ?? 'Book now'}</h2>
          <p className="text-slate-400 text-lg">{liveDict.booking?.subtitle ?? ''}</p>
        </div>
        <div 
          className={`relative z-10 transition-all duration-1000 ease-out ${visibleSections.has('reservation') ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
          style={{ transitionDelay: '0.2s' }}
        >
          <div className="sn-card sn-card-body">
            <BookingWidget dict={liveDict} initialLang={currentLang} />
          </div>
        </div>
      </section>

      {/* Contact forms are now shown as a modal from BookingWidget; no standalone section */}

      <footer
        id="footer"
        data-preview-anchor="footer"
        className="text-slate-400 py-16"
        style={{
          background: 'linear-gradient(180deg, #0d1b2a 0%, #0a1420 50%, #050a10 100%)'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 text-sm">
          <div className="md:col-span-1 fade-in">
            <h5 className="text-white font-serif font-bold text-lg mb-4 flex items-center gap-2">
              <OptimizedImage src="/images/logo.webp" fallback="/images/logo.jpg" alt="Sweet Narcisse" width={110} height={34} className="h-6 w-auto rounded-sm" priority />
              <span>Sweet <span className="text-[#0ea5e9]">Narcisse</span></span>
            </h5>
            <p className="leading-relaxed font-bold text-white mb-2">{liveDict.footer?.departure_label ?? 'Departures'}</p>
            <p className="leading-relaxed">10 Rue de la Herse<br/>68000 Colmar, France</p>
            <p className="mt-4 font-bold text-white">📞 +33 3 89 20 68 92</p>
            <p>📧 contact@sweet-narcisse.fr</p>
          </div>
          <div className="fade-in">
            <h5 className="text-white font-serif font-bold text-lg mb-4">{liveDict.footer?.hours_title ?? 'Hours'}</h5>
            <p>{liveDict.footer?.open_days ?? 'Open daily'}</p>
            <div className="mt-2 space-y-1">
              <p className="text-white font-bold flex justify-between w-full max-w-[200px] whitespace-nowrap"><span>{liveDict.footer?.morning_label ?? 'Morning'}</span> <span>{liveDict.footer?.morning_hours ?? '--'}</span></p>
              <p className="text-white font-bold flex justify-between w-full max-w-[200px] whitespace-nowrap"><span>{liveDict.footer?.afternoon_label ?? 'Afternoon'}</span> <span>{liveDict.footer?.afternoon_hours ?? '--'}</span></p>
            </div>
          </div>
          <div className="fade-in">
            <h5 className="text-white font-serif font-bold text-lg mb-4">{liveDict.footer?.infos ?? 'Infos'}</h5>
            <Link href={`/${currentLang}/legal`} className="block hover:text-[#0ea5e9] transition mb-2">{liveDict.footer?.legal ?? 'Legal'}</Link>
            <Link href={`/${currentLang}/cgv`} className="block hover:text-[#0ea5e9] transition mb-2">{liveDict.footer?.cgv ?? 'Terms'}</Link>
            <Link href={`/${currentLang}/privacy`} className="block hover:text-[#0ea5e9] transition">{liveDict.footer?.privacy ?? 'Privacy'}</Link>
          </div>
          <div className="md:col-span-1 fade-in">
            <h5 className="text-white font-serif font-bold text-lg mb-4">{liveDict.footer?.access_map ?? 'Access map'}</h5>
            <div className="rounded-lg overflow-hidden shadow-lg h-40 w-full border border-slate-700">
              <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2665.933730020825!2d7.3546046767205695!3d48.0729220556597!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x479165e89c124c77%3A0x9da47dac5d840502!2sBarque%20Colmar%20au%20fil%20de%20l%E2%80%99eau%20*2A%20Sweet%20Narcisse!5e0!3m2!1sfr!2sfr!4v1764011388547!5m2!1sfr!2sfr" width="100%" height="100%" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={liveDict.footer?.map_title ?? 'Map'}></iframe>
            </div>
          </div>
        </div>
        <div className="text-center mt-12 pt-8 border-t border-slate-800 text-xs opacity-50 flex flex-col items-center gap-2">
          <Link href={`/${currentLang}/partners`} className="text-slate-400 hover:text-[#0ea5e9] transition text-xs font-semibold">{liveDict.partners?.nav || 'Partners'}</Link>
          <span>{liveDict.footer?.rights ?? 'All rights reserved.'}</span>
        </div>
      </footer>
    </div>
  )
}
