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

const PARIS_TIME_ZONE = 'Europe/Paris'

export function parseParisWallDate(date: string, time: string) {
  const [year, month, day] = date.split('-').map((value) => parseInt(value, 10))
  const [hour, minute] = time.split(':').map((value) => parseInt(value, 10))
  const naiveUtcMs = Date.UTC(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0, 0)
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone: PARIS_TIME_ZONE,
    timeZoneName: 'shortOffset'
  })
  const parts = formatter.formatToParts(new Date(naiveUtcMs))
  const tzToken = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'UTC+00'
  const match = tzToken.match(/([+-])(\d{1,2})(?::?(\d{2}))?/)
  let offsetMinutes = 0
  if (match) {
    const sign = match[1] === '-' ? -1 : 1
    const hours = parseInt(match[2], 10)
    const minutesPart = match[3] ? parseInt(match[3], 10) : 0
    offsetMinutes = sign * (hours * 60 + minutesPart)
  }

  return {
    instant: new Date(naiveUtcMs - offsetMinutes * 60 * 1000),
    wallHour: hour || 0,
    wallMinute: minute || 0
  }
}
