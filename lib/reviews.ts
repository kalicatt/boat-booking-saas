// Static curated excerpts of real TripAdvisor-style reviews.
// IMPORTANT: Avoid automated scraping to respect TripAdvisor Terms of Use.
// Keep excerpts short (< 90 chars) and always link to the original source.
// For SEO we expose aggregate rating separately.

export interface ReviewExcerpt {
  id: string
  author: string
  language: 'fr' | 'en' | 'de'
  excerpt: string
  rating: number // 1..5
  date: string // ISO string
  sourceUrl: string
}

export const AGGREGATE_RATING = {
  ratingValue: 4.9,
  reviewCount: 340, // manual sync with TripAdvisor listing
  bestRating: 5,
  worstRating: 1
}

export const REVIEWS: ReviewExcerpt[] = [
  {
    id: 'tp-1',
    author: 'Sophie',
    language: 'fr',
    excerpt: 'Magique, on redécouvre Colmar sous un angle apaisant.',
    rating: 5,
    date: '2025-07-12',
    sourceUrl: 'https://www.tripadvisor.fr/Attraction_Review-g187073-d3404197'
  },
  {
    id: 'tp-2',
    author: 'Mark',
    language: 'en',
    excerpt: 'Highlight of our weekend – authentic, calm, picturesque.',
    rating: 5,
    date: '2025-06-03',
    sourceUrl: 'https://www.tripadvisor.fr/Attraction_Review-g187073-d3404197'
  },
  {
    id: 'tp-3',
    author: 'Anna',
    language: 'de',
    excerpt: 'Kinder waren begeistert; sehr schöne, entspannte Fahrt.',
    rating: 5,
    date: '2025-05-21',
    sourceUrl: 'https://www.tripadvisor.fr/Attraction_Review-g187073-d3404197'
  },
  {
    id: 'tp-4',
    author: 'Julien',
    language: 'fr',
    excerpt: 'Silence, beauté, histoire – un vrai moment suspendu.',
    rating: 5,
    date: '2025-04-11',
    sourceUrl: 'https://www.tripadvisor.fr/Attraction_Review-g187073-d3404197'
  }
]

// Helper to pick a subset (e.g. rotate daily via maintenance script)
// Deterministic daily rotation based on day-of-year as fallback
function getDailyOffset(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = (date.getTime() - start.getTime()) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000)
  const day = Math.floor(diff / (1000 * 60 * 60 * 24))
  return day % REVIEWS.length
}

export function pickFeatured(count = 3, date = new Date()): ReviewExcerpt[] {
  const offset = getDailyOffset(date)
  const selected: ReviewExcerpt[] = []
  for (let i = 0; i < Math.min(count, REVIEWS.length); i++) {
    selected.push(REVIEWS[(offset + i) % REVIEWS.length])
  }
  return selected
}

