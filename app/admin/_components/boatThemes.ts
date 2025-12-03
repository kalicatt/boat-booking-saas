export interface BoatTheme {
  badge: string
  indicator: string
  pax: string
}

export const getBoatTheme = (boatId: number | null): BoatTheme => {
  switch (boatId ?? null) {
    case 1:
      return {
        badge: 'border border-blue-200 bg-blue-50 text-blue-700',
        indicator: 'border-blue-300 text-blue-700 shadow-[0_0_0_3px_rgba(191,219,254,0.6)]',
        pax: 'border border-blue-300 bg-blue-500 text-white'
      }
    case 2:
      return {
        badge: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
        indicator: 'border-emerald-300 text-emerald-700 shadow-[0_0_0_3px_rgba(167,243,208,0.6)]',
        pax: 'border border-emerald-300 bg-emerald-500 text-white'
      }
    case 3:
      return {
        badge: 'border border-purple-200 bg-purple-50 text-purple-700',
        indicator: 'border-purple-300 text-purple-700 shadow-[0_0_0_3px_rgba(233,213,255,0.6)]',
        pax: 'border border-purple-300 bg-purple-500 text-white'
      }
    default:
      return {
        badge: 'border border-orange-200 bg-orange-50 text-orange-700',
        indicator: 'border-orange-300 text-orange-700 shadow-[0_0_0_3px_rgba(254,215,170,0.55)]',
        pax: 'border border-orange-300 bg-orange-500 text-white'
      }
  }
}
