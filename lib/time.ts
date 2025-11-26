export function getParisNowParts() {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(new Date())
  const safe = (type: string, fallback: string) => parts.find(p => p.type === type)?.value || fallback
  const y = Number(safe('year', String(new Date().getUTCFullYear())))
  const m = Number(safe('month', String(new Date().getUTCMonth() + 1)))
  const d = Number(safe('day', String(new Date().getUTCDate())))
  const hh = Number(safe('hour', String(new Date().getUTCHours())))
  const mm = Number(safe('minute', String(new Date().getUTCMinutes())))
  return { y, m, d, hh, mm }
}

export function getParisTodayISO() {
  const { y, m, d } = getParisNowParts()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${y}-${pad(m)}-${pad(d)}`
}

export function getParisNowMinutes() {
  const { hh, mm } = getParisNowParts()
  return hh * 60 + mm
}
