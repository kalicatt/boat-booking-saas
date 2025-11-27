"use client"
import { useEffect, useState } from 'react'
import { pickFeatured, AGGREGATE_RATING, REVIEWS } from '@/lib/reviews'

interface Props {
  dict: any
  lang: 'fr' | 'en' | 'de' | 'es' | 'it'
}

export default function TripReviews({ dict, lang }: Props) {
  const [reviews, setReviews] = useState(() => pickFeatured(3))
  const [aggregate, setAggregate] = useState(AGGREGATE_RATING)

  // Optional rotation each mount (could be improved later)
  useEffect(() => {
    // Attempt to fetch daily featured IDs produced by maintenance script
    fetch('/reviews-featured.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.featured?.length) {
          const mapped = data.featured
            .map((id: string) => REVIEWS.find(r => r.id === id))
            .filter(Boolean)
          if (mapped.length) setReviews(mapped as typeof reviews)
        }
        if (data?.aggregate?.reviewCount) {
          setAggregate(a => ({ ...a, reviewCount: data.aggregate.reviewCount }))
        }
      })
      .catch(() => { /* silent fallback */ })
  }, [])

  return (
    <div>
      <div className="grid gap-6 md:grid-cols-3">
        {reviews.map(r => (
          <article key={r.id} className="fade-in bg-white rounded-xl shadow-sm p-6 border border-slate-100 flex flex-col" itemScope itemType="https://schema.org/Review">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#eab308]/20 flex items-center justify-center font-bold text-[#0f172a]"><span aria-hidden>{r.author[0]}</span></div>
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
            <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 text-[11px] text-slate-400 hover:text-[#0f172a] underline decoration-[#eab308] decoration-2 underline-offset-2">{dict.social?.sourceLink || 'Voir sur TripAdvisor'}</a>
          </article>
        ))}
      </div>
      <div className="text-center mt-10" itemScope itemType="https://schema.org/AggregateRating">
        <p className="text-sm text-slate-600">{dict.social?.aggregatePrefix} <span className="font-semibold" itemProp="ratingValue">{aggregate.ratingValue}</span>/5 – <span itemProp="reviewCount">{aggregate.reviewCount}</span> {dict.social?.reviewsLabel}.</p>
        <meta itemProp="bestRating" content={String(aggregate.bestRating)} />
        <meta itemProp="worstRating" content={String(aggregate.worstRating)} />
        <a href="https://www.tripadvisor.fr/Attraction_Review-g187073-d3404197" target="_blank" rel="noopener noreferrer" className="inline-block mt-4 text-[#0f172a] bg-[#eab308] px-6 py-3 rounded-full font-bold text-sm hover:bg-white transition shadow-md">{dict.social?.cta}</a>
      </div>
    </div>
  )
}
