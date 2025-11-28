"use client"
import { useEffect, useMemo, useRef, useState } from 'react'
import { pickFeatured, AGGREGATE_RATING, REVIEWS, ReviewExcerpt } from '@/lib/reviews'

type FeaturedFeed = {
  featured?: string[]
  aggregate?: {
    reviewCount?: number
  }
}

interface SocialCopy {
  title?: string
  subtitle?: string
  cta?: string
  sourceLink?: string
  aggregatePrefix?: string
  reviewsLabel?: string
}

interface CopyDictionary {
  social?: SocialCopy
}

interface Props {
  dict: CopyDictionary
  lang: 'fr' | 'en' | 'de' | 'es' | 'it'
}

export default function TripReviews({ dict, lang }: Props) {
  const [reviews, setReviews] = useState(() => pickFeatured(3))
  const [aggregate, setAggregate] = useState(AGGREGATE_RATING)
  const viewportRef = useRef<HTMLDivElement|null>(null)
  const [index, setIndex] = useState(0)
  const autoplayRef = useRef<number | null>(null)
  const preferredLang = useMemo<ReviewExcerpt['language']>(() => {
    if (lang === 'de') return 'de'
    if (lang === 'en') return 'en'
    return 'fr'
  }, [lang])
  const localized = useMemo(() => {
    const matches = reviews.filter(r => r.language === preferredLang)
    const others = reviews.filter(r => r.language !== preferredLang)
    return [...matches, ...others]
  }, [reviews, preferredLang])
  const visible = localized.slice(0, 3)
  const angleStep = visible.length ? 360 / visible.length : 0
  const radius = 420

  // Optional rotation each mount (could be improved later)
  useEffect(() => {
    // Attempt to fetch daily featured IDs produced by maintenance script
    fetch('/reviews-featured.json')
      .then<FeaturedFeed | null>(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.featured?.length) {
          const mapped = data.featured
            .map((id: string) => REVIEWS.find(r => r.id === id))
            .filter((value): value is ReviewExcerpt => Boolean(value))
          if (mapped.length) setReviews(mapped)
        }
        if (typeof data?.aggregate?.reviewCount === 'number') {
          const nextCount = data.aggregate.reviewCount
          setAggregate(a => ({ ...a, reviewCount: nextCount }))
        }
      })
      .catch(() => { /* silent fallback */ })
  }, [])

  // Autoplay carousel (pause on hover)
  useEffect(() => {
    const start = () => {
      stop()
      autoplayRef.current = window.setInterval(() => {
        setIndex(i => visible.length ? (i + 1) % visible.length : 0)
      }, 4000)
    }
    const stop = () => { if (autoplayRef.current) { window.clearInterval(autoplayRef.current); autoplayRef.current = null } }
    start()
    const vp = viewportRef.current
    if (vp) {
      const onEnter = () => stop()
      const onLeave = () => start()
      vp.addEventListener('mouseenter', onEnter)
      vp.addEventListener('mouseleave', onLeave)
      return () => { stop(); vp.removeEventListener('mouseenter', onEnter); vp.removeEventListener('mouseleave', onLeave) }
    }
    return () => stop()
  }, [visible.length])

  return (
    <div>
      <div className="relative">
        <div
          ref={viewportRef}
          className="relative px-6"
          style={{ perspective: '1300px', height: '340px', overflow: 'hidden' }}
        >
          <div
            className="relative w-full h-full flex items-center justify-center"
            style={{ transformStyle: 'preserve-3d', transition: 'transform 800ms ease', transform: `translateZ(-${radius}px) rotateY(${index * angleStep * -1}deg)` }}
          >
            {visible.map((r, idx) => {
              const rotation = idx * angleStep
              const distance = visible.length ? (idx - index + visible.length) % visible.length : 0
              const isFront = distance === 0
              const isSide = distance === 1 || distance === visible.length - 1
              const opacity = isFront ? 1 : isSide ? 0.55 : 0.2
              const boxShadow = isFront ? '0 20px 40px rgba(2,6,23,0.15)' : '0 12px 22px rgba(2,6,23,0.1)'
              return (
                <article
                  key={r.id}
                  className="sn-slide fade-in sn-card p-6 flex flex-col text-left absolute w-[65%] sm:w-[50%] md:w-[38%]"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: `rotateY(${rotation}deg) translateZ(${radius}px)`,
                    opacity,
                    boxShadow,
                    transition: 'opacity 500ms ease, box-shadow 500ms ease'
                  }}
                  itemScope itemType="https://schema.org/Review"
                >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center font-bold text-[#0f172a]"><span aria-hidden>{r.author[0]}</span></div>
              <span className="font-semibold" itemProp="author">{r.author}</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed flex-1" itemProp="reviewBody">“{r.excerpt}”</p>
            <meta itemProp="datePublished" content={r.date} />
            <div className="mt-4 text-xs text-slate-500 flex items-center gap-1" itemProp="reviewRating" itemScope itemType="https://schema.org/Rating">
              <span aria-label={`${r.rating} sur 5`} itemProp="ratingValue">{'★★★★★'.slice(0, r.rating)}</span>
              <span className="text-slate-300">{'★★★★★'.slice(r.rating)}</span>
              <meta itemProp="bestRating" content="5" />
              <meta itemProp="worstRating" content="1" />
            </div>
            <a
              href={r.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 text-[11px] text-slate-400 hover:text-[#0f172a] underline decoration-[#0ea5e9] decoration-2 underline-offset-2"
            >
              {dict.social?.sourceLink || 'Voir sur TripAdvisor'}
            </a>
                </article>
              )
            })}
          </div>
        </div>
        {/* Arrows */}
        <button aria-label="Précédent" onClick={()=>setIndex(i => visible.length ? (i - 1 + visible.length) % visible.length : 0)} className="absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/80 hover:bg-white shadow border border-slate-200">‹</button>
        <button aria-label="Suivant" onClick={()=>setIndex(i => visible.length ? (i + 1) % visible.length : 0)} className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/80 hover:bg-white shadow border border-slate-200">›</button>
      </div>
      <div className="text-center mt-10" itemScope itemType="https://schema.org/AggregateRating">
        <p className="text-sm text-slate-600">{dict.social?.aggregatePrefix} <span className="font-semibold" itemProp="ratingValue">{aggregate.ratingValue}</span>/5 – <span itemProp="reviewCount">{aggregate.reviewCount}</span> {dict.social?.reviewsLabel}.</p>
        <meta itemProp="bestRating" content={String(aggregate.bestRating)} />
        <meta itemProp="worstRating" content={String(aggregate.worstRating)} />
        <a href="https://www.tripadvisor.fr/Attraction_Review-g187073-d3404197" target="_blank" rel="noopener noreferrer" className="sn-btn-primary rounded-full inline-block mt-4">{dict.social?.cta}</a>
      </div>
    </div>
  )
}
