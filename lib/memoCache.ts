type MemoValue = { date: string | null; availableSlots: string[] }
type MemoEntry = { value: MemoValue; expiresAt: number }

const memoCache: Map<string, MemoEntry> = new Map()
const MEMO_TTL_MS = 90 * 1000

export function memoGet(key: string): MemoValue | null {
  const e = memoCache.get(key)
  if (!e) return null
  if (Date.now() > e.expiresAt) { memoCache.delete(key); return null }
  return e.value
}

export function memoSet(key: string, value: MemoValue) {
  memoCache.set(key, { value, expiresAt: Date.now() + MEMO_TTL_MS })
}

export function memoInvalidateByDate(date: string) {
  const prefix = `availability:${date}:`
  for (const k of memoCache.keys()) {
    if (k.startsWith(prefix)) memoCache.delete(k)
  }
}