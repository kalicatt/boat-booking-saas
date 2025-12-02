export interface BoatTheme {
  badge: string
  indicator: string
  pax: string
}

export const getBoatTheme = (boatId: number | null): BoatTheme => {
  switch (boatId ?? null) {
    case 1:
      return {
        badge: 'bg-blue-100 text-blue-800',
        indicator: 'border-blue-400 text-blue-900 shadow-[0_0_0_3px_rgba(147,197,253,0.35)]',
        pax: 'bg-blue-600 text-white'
      }
    case 2:
      return {
        badge: 'bg-emerald-100 text-emerald-700',
        indicator: 'border-emerald-400 text-emerald-900 shadow-[0_0_0_3px_rgba(134,239,172,0.35)]',
        pax: 'bg-emerald-600 text-white'
      }
    case 3:
      return {
        badge: 'bg-purple-100 text-purple-800',
        indicator: 'border-purple-400 text-purple-900 shadow-[0_0_0_3px_rgba(216,180,254,0.35)]',
        pax: 'bg-purple-600 text-white'
      }
    default:
      return {
        badge: 'bg-orange-100 text-orange-800',
        indicator: 'border-orange-400 text-orange-900 shadow-[0_0_0_3px_rgba(253,186,116,0.35)]',
        pax: 'bg-orange-500 text-white'
      }
  }
}
