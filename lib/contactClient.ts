export type Lang = 'fr' | 'en' | 'de' | 'es' | 'it'

function deriveLangFromPath(pathname: string): Lang | undefined {
  const m = pathname.match(/\/(fr|en|de|es|it)(?:\/|$)/i)
  return (m?.[1]?.toLowerCase() as Lang) || undefined
}

export async function submitGroupRequest(payload: {
  firstName: string
  lastName: string
  email: string
  phone?: string
  message?: string
  people: number
  company?: string
  reason?: string
  eventDate?: string
  eventTime?: string
  budget?: string
  captchaToken: string
}, lang?: Lang) {
  const effectiveLang = lang || (typeof window !== 'undefined' ? deriveLangFromPath(window.location.pathname) : undefined)
  const body = JSON.stringify({ ...payload, lang: effectiveLang })
  const res = await fetch('/api/contact/group', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
  if (!res.ok) throw new Error(`Group request failed: ${res.status}`)
  return res.json()
}
