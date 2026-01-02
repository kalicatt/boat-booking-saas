"use client"
import Image from 'next/image'
import OptimizedImage from '@/components/OptimizedImage'
import BookingWidget from '@/components/BookingWidget'
import { useEffect, useMemo, useRef, useState } from 'react'
import TripReviews from '@/components/TripReviews'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import ScrollReveal, { ParallaxImage } from '@/components/ScrollReveal'
import FlagIcon from '@/components/FlagIcon'
import { CmsProvider } from '@/components/cms/CmsContext'
import EditableText from '@/components/cms/EditableText'

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
  userRole?: string
}

export default function LandingClient({ dict, lang, cmsContent, initialCmsLocale, userRole }: LandingClientProps) {
  const [scrolled, setScrolled] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const firstLinkRef = useRef<HTMLAnchorElement|null>(null)
  
  // Parallax scroll hooks
  const { scrollYProgress } = useScroll()
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, 150])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0])
  
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
  const getCmsCopy = (key: string): string => {
    const raw = cmsSiteConfigMap.get(key)
    return resolveCmsField(raw, activeCmsLocale)
  }
  const heroEyebrow = getCmsCopy('home.hero.eyebrow')
  const heroCtaCopy = getCmsCopy('home.hero.cta') || liveDict.hero?.cta || 'Book now'
  const storyParagraphOverride = getCmsCopy('home.story.paragraph')
  const footerContactLine = getCmsCopy('footer.contact.line')
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
  
  
  useEffect(()=>{
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    
    const onHash = () => setCurrentHash(window.location.hash || '')
    const onSearch = () => setCurrentSearch(window.location.search || '')
    window.addEventListener('hashchange', onHash)
    onHash()
    onSearch()
    return ()=> { window.removeEventListener('scroll', onScroll); window.removeEventListener('hashchange', onHash) }
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

  // Slideshow auto-play
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
      setTimeout(()=>{ if(firstLinkRef.current) firstLinkRef.current.focus() }, 50)
    } else {
      document.body.classList.remove('lock-scroll')
    }
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
    <CmsProvider initialRole={userRole}>
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-sky-200 selection:text-sky-900">
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-blue-600 origin-left z-[60]"
        style={{ scaleX: scrollYProgress }}
      />
      
      <nav className={`fixed w-full z-40 transition-all duration-500 ${scrolled ? 'backdrop-blur-md bg-white/80 border-b border-slate-200/50 h-16 shadow-sm' : 'bg-transparent h-24'} `}>
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <motion.button
            whileTap={{ scale: 0.95 }}
            aria-label="Menu" 
            onClick={()=>{ setMenuOpen(true); }} 
            className={`hamburger-btn rounded-full p-2 hover:bg-white/10 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 group`}
          >
            <div className="flex flex-col gap-1.5 w-6">
              <span className={`h-0.5 w-full rounded-full transition-all duration-300 ${scrolled ? 'bg-slate-800' : 'bg-white'}`} />
              <span className={`h-0.5 w-full rounded-full transition-all duration-300 ${scrolled ? 'bg-slate-800' : 'bg-white'} group-hover:w-4 self-end`} />
              <span className={`h-0.5 w-full rounded-full transition-all duration-300 ${scrolled ? 'bg-slate-800' : 'bg-white'}`} />
            </div>
          </motion.button>

          {/* Centered Logo visible only when scrolled */}
          <motion.div
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: scrolled ? 1 : 0, y: scrolled ? 0 : -20 }}
             className="absolute left-1/2 -translate-x-1/2 font-serif font-bold text-lg text-slate-800 hidden md:block"
          >
            Sweet Narcisse
          </motion.div>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 h-full w-[320px] bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-6 h-20 border-b border-slate-100">
                <span className="font-serif font-bold text-2xl bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Sweet Narcisse</span>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                   <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto py-8 px-6">
                <ul className="space-y-4">
                  {[
                    { href: "#presentation", label: liveDict.nav?.experience ?? 'Experience' },
                    { href: `/${currentLang}/partners`, label: liveDict.partners?.nav || 'Partners', isLink: true },
                    { href: "#contact", label: liveDict.nav?.contact ?? 'Contact' },
                    { href: "#reservation", label: liveDict.nav?.book ?? 'Book', primary: true }
                  ].map((item, i) => (
                    <motion.li
                      key={item.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      {item.isLink ? (
                        <Link
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className={`text-2xl font-serif block ${item.primary ? 'text-sky-500 font-bold' : 'text-slate-700 hover:text-sky-500 transition-colors'}`}
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <a
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className={`text-2xl font-serif block ${item.primary ? 'text-sky-500 font-bold' : 'text-slate-700 hover:text-sky-500 transition-colors'}`}
                        >
                          {item.label}
                        </a>
                      )}
                    </motion.li>
                  ))}

                  <motion.li
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="pt-8 mt-8 border-t border-slate-100"
                  >
                     <div className="grid grid-cols-2 gap-4">
                        <Link href={`/${currentLang}/legal`} className="text-sm text-slate-500 hover:text-sky-500">{liveDict.footer?.legal ?? 'Legal'}</Link>
                        <Link href={`/${currentLang}/privacy`} className="text-sm text-slate-500 hover:text-sky-500">{liveDict.footer?.privacy ?? 'Privacy'}</Link>
                     </div>
                  </motion.li>

                  <motion.li
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="pt-6"
                  >
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Language</p>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGE_OPTIONS.map((opt) => (
                         <Link
                            key={opt.code}
                            href={`/${opt.code}${currentSearch}${currentHash}`}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                              currentLang === opt.code
                              ? 'bg-sky-100 text-sky-700'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                         >
                            <span className="mr-1 inline-flex align-middle">
                              <FlagIcon
                                code={(opt.code === 'en' ? 'GB' : opt.code.toUpperCase()) as 'FR' | 'GB' | 'DE' | 'ES' | 'IT'}
                                className="w-4 h-4 text-slate-900/60"
                              />
                            </span>
                            <span className="align-middle">{opt.code.toUpperCase()}</span>
                         </Link>
                      ))}
                    </div>
                  </motion.li>
                </ul>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <header
        id="hero"
        className="relative h-screen flex items-center justify-center overflow-hidden"
      >
        <motion.div className="absolute inset-0 z-0">
          <AnimatePresence mode='wait'>
            <motion.div
              key={heroIndexSafe}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="absolute inset-0"
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
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
        </motion.div>

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 mx-auto max-w-5xl px-4 text-center"
        >
          {heroEyebrow && (
             <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-4 text-xs md:text-sm font-bold uppercase tracking-[0.4em] text-sky-200"
            >
              <EditableText
                 initialValue={heroEyebrow}
                 cmsKey="home.hero.eyebrow"
                 locale={activeCmsLocale}
                 as="span"
              />
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
            className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold leading-tight text-white drop-shadow-lg mb-6"
          >
            <EditableText
              initialValue={heroTitle}
              cmsId={heroSlide?.id}
              cmsField="title"
              locale={activeCmsLocale}
              as="h1"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mx-auto mb-10 max-w-2xl text-lg md:text-xl font-light leading-relaxed text-slate-100"
          >
            <EditableText
              initialValue={heroSubtitle}
              cmsId={heroSlide?.id}
              cmsField="subtitle"
              locale={activeCmsLocale}
              as="p"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col items-center justify-center gap-6"
          >
            <a
              href="#reservation"
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-slate-900 bg-sky-400 rounded-full overflow-hidden shadow-xl transition-transform hover:scale-105 hover:shadow-2xl active:scale-95"
            >
              <span className="relative z-10">
                <EditableText
                  initialValue={heroCtaCopy}
                  cmsKey="home.hero.cta"
                  locale={activeCmsLocale}
                  as="span"
                />
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </a>
            <Link
              href={`/${currentLang}/partners`}
              className="text-sm font-semibold text-slate-300 hover:text-white transition-colors border-b border-transparent hover:border-white pb-0.5"
            >
              {liveDict.partners?.nav}
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7-7-7" /></svg>
        </motion.div>
      </header>

      {/* ============================================
          📖 SECTION STORYTELLING
          ============================================ */}
      <section
        id="presentation"
        className="relative py-32 px-6 overflow-hidden min-h-screen flex items-center"
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #faf8f5 30%, #f3e5c7 100%)'
        }}
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">
          <ScrollReveal direction="left">
            <div className="space-y-8">
              <div>
                <h4 className="text-sky-500 font-bold tracking-widest text-xs uppercase mb-2">Sweet Narcisse</h4>
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-slate-900">{liveDict.presentation?.title ?? ''}</h2>
              </div>
              <div className="text-slate-600 leading-relaxed text-lg text-justify">
                <EditableText
                  initialValue={storyParagraph}
                  cmsKey="home.story.paragraph"
                  locale={activeCmsLocale}
                  as="p"
                />
              </div>
              <ul className="space-y-4">
                {(liveDict.presentation?.points ?? []).map((item: string, i: number) => (
                  <ScrollReveal key={item} delay={i * 0.1} direction="up" distance={20} className="flex items-center gap-4 text-slate-700 font-medium">
                    <span className="w-8 h-8 rounded-full bg-sky-100 text-sky-500 flex items-center justify-center font-bold text-sm">✓</span>
                    {item}
                  </ScrollReveal>
                ))}
              </ul>
            </div>
          </ScrollReveal>
          
          <ScrollReveal direction="right" delay={0.2}>
            <div className="relative group">
              <div className="absolute inset-0 bg-sky-200/50 rounded-2xl rotate-3 scale-105 group-hover:rotate-6 transition-transform duration-500" />
              <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[4/3]">
                 <ParallaxImage
                    src="/images/presentation.webp"
                    alt="Barque Colmar"
                    className="w-full h-full"
                 />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Partners section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
           <ScrollReveal className="text-center mb-10">
             <h3 className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">{liveDict.logos?.title}</h3>
           </ScrollReveal>

           {visiblePartners.length > 0 ? (
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 items-center justify-center opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                {visiblePartners.map((partner, i) => (
                   <ScrollReveal key={partner.id} delay={i * 0.05} className="flex justify-center">
                      <div className="h-16 w-32 relative">
                         <Image src={partner.logoUrl} alt={partner.name} fill className="object-contain" />
                      </div>
                   </ScrollReveal>
                ))}
             </div>
           ) : (
             <div className="text-center text-slate-400 text-sm py-10 border border-dashed rounded-xl">
                No partners currently visible.
             </div>
           )}
        </div>
      </section>

      {/* ============================================
          📦 SECTION BENTO GRID
          ============================================ */}
      <section 
        className="relative py-32 px-6 overflow-hidden bg-slate-50"
      >
        <div className="max-w-7xl mx-auto relative z-10">
          <ScrollReveal className="mb-20 text-center">
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6 text-slate-900">{liveDict.bento?.title}</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">{liveDict.bento?.subtitle}</p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <ScrollReveal key={idx} delay={idx * 0.1} className="h-full">
                  <motion.div
                    whileHover={{ y: -5 }}
                    className="relative group h-[340px] rounded-2xl overflow-hidden shadow-lg"
                  >
                    <Image src={bg} alt={title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    <div className="absolute bottom-0 left-0 p-6 w-full">
                      <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/20 shadow-lg group-hover:bg-white/20 transition-colors">
                        <h3 className="font-serif text-xl font-bold text-white mb-2">{title}</h3>
                        <p className="text-sm text-slate-200 leading-relaxed">{text}</p>
                      </div>
                    </div>
                  </motion.div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================
          ⭐ SECTION AVIS
          ============================================ */}
      <section 
        id="reviews"
        className="relative py-32 px-6 bg-white overflow-hidden"
      >
        <div className="max-w-5xl mx-auto text-center mb-16">
          <ScrollReveal>
             <h2 className="text-4xl font-serif font-bold mb-4 text-slate-900">{liveDict.social?.title}</h2>
             <p className="text-lg text-slate-600 max-w-xl mx-auto">{liveDict.social?.subtitle}</p>
          </ScrollReveal>
        </div>
        <ScrollReveal delay={0.2} className="max-w-6xl mx-auto">
          <TripReviews dict={liveDict} lang={currentLang} />
        </ScrollReveal>
      </section>

      {/* ============================================
          📅 SECTION RÉSERVATION
          ============================================ */}
      <section 
        id="reservation" 
        className="py-32 px-4 relative overflow-hidden bg-[#0d1b2a]"
      >
        {/* Glow Effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute w-[500px] h-[500px] bg-sky-600/20 rounded-full blur-[100px] -top-20 -left-20" />
          <div className="absolute w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] bottom-0 right-0" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          <ScrollReveal className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">{liveDict.booking?.title ?? 'Book now'}</h2>
            <p className="text-slate-400 text-lg">{liveDict.booking?.subtitle ?? ''}</p>
          </ScrollReveal>

          <ScrollReveal delay={0.2} className="bg-white rounded-3xl shadow-2xl overflow-hidden p-1">
             <BookingWidget dict={liveDict} initialLang={currentLang} />
          </ScrollReveal>
        </div>
      </section>

      <footer
        id="footer"
        className="bg-[#050a10] text-slate-400 py-16 border-t border-slate-800"
      >
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 text-sm">
          <div className="md:col-span-1">
            <h5 className="text-white font-serif font-bold text-xl mb-6 flex items-center gap-2">
              <OptimizedImage src="/images/logo.webp" fallback="/images/logo.jpg" alt="Sweet Narcisse" width={110} height={34} className="h-6 w-auto rounded-sm" priority />
            </h5>
            <p className="leading-relaxed font-bold text-slate-300 mb-2">{liveDict.footer?.departure_label ?? 'Departures'}</p>
            <p className="leading-relaxed mb-4">10 Rue de la Herse<br/>68000 Colmar, France</p>
            <p className="text-white font-bold">📞 +33 3 89 20 68 92</p>
            <p className="hover:text-sky-400 transition-colors cursor-pointer">📧 contact@sweet-narcisse.fr</p>
          </div>

          <div>
            <h5 className="text-white font-serif font-bold text-lg mb-6">{liveDict.footer?.hours_title ?? 'Hours'}</h5>
            <p className="mb-4 text-sky-400 font-medium">{liveDict.footer?.open_days ?? 'Open daily'}</p>
            <div className="space-y-2">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                 <span>{liveDict.footer?.morning_label ?? 'Morning'}</span>
                 <span className="text-white">{liveDict.footer?.morning_hours ?? '--'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                 <span>{liveDict.footer?.afternoon_label ?? 'Afternoon'}</span>
                 <span className="text-white">{liveDict.footer?.afternoon_hours ?? '--'}</span>
              </div>
            </div>
          </div>

          <div>
            <h5 className="text-white font-serif font-bold text-lg mb-6">{liveDict.footer?.infos ?? 'Infos'}</h5>
            {footerContactLine && (
              <div className="mb-4 text-slate-400 text-sm">
                <EditableText
                  initialValue={footerContactLine}
                  cmsKey="footer.contact.line"
                  locale={activeCmsLocale}
                  as="p"
                />
              </div>
            )}
            <ul className="space-y-3">
               {[
                 { href: `/${currentLang}/legal`, label: liveDict.footer?.legal ?? 'Legal' },
                 { href: `/${currentLang}/cgv`, label: liveDict.footer?.cgv ?? 'Terms' },
                 { href: `/${currentLang}/privacy`, label: liveDict.footer?.privacy ?? 'Privacy' }
               ].map(link => (
                  <li key={link.href}>
                     <Link href={link.href} className="hover:text-sky-400 hover:pl-1 transition-all duration-300 block">{link.label}</Link>
                  </li>
               ))}
            </ul>
          </div>

          <div>
            <h5 className="text-white font-serif font-bold text-lg mb-6">{liveDict.footer?.access_map ?? 'Access map'}</h5>
            <div className="rounded-xl overflow-hidden shadow-lg h-40 w-full border border-slate-700 grayscale hover:grayscale-0 transition-all duration-500">
              <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2665.933730020825!2d7.3546046767205695!3d48.0729220556597!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x479165e89c124c77%3A0x9da47dac5d840502!2sBarque%20Colmar%20au%20fil%20de%20l%E2%80%99eau%20*2A%20Sweet%20Narcisse!5e0!3m2!1sfr!2sfr!4v1764011388547!5m2!1sfr!2sfr" width="100%" height="100%" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={liveDict.footer?.map_title ?? 'Map'}></iframe>
            </div>
          </div>
        </div>

        <div className="text-center mt-16 pt-8 border-t border-slate-900/50 text-xs text-slate-600 flex flex-col items-center gap-2">
          <div className="flex gap-4 mb-2">
             <Link href={`/${currentLang}/partners`} className="hover:text-sky-400 transition">Partners</Link>
             <span>•</span>
             <Link href="#" className="hover:text-sky-400 transition">Sitemap</Link>
          </div>
          <span>{liveDict.footer?.rights ?? 'All rights reserved.'} © {new Date().getFullYear()} Sweet Narcisse</span>
        </div>
      </footer>
    </div>
    </CmsProvider>
  )
}
