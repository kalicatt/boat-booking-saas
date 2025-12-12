type MemoEntry = { value: unknown; expiresAt: number }

const memoCache: Map<string, MemoEntry> = new Map()
export const DEFAULT_MEMO_TTL_MS = 90 * 1000

export function memoGet<T>(key: string): T | null {
  const entry = memoCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    memoCache.delete(key)
    return null
  }
  return entry.value as T
}

export function memoSet<T>(key: string, value: T, ttlMs: number = DEFAULT_MEMO_TTL_MS) {
  memoCache.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export function memoInvalidateByPrefix(prefix: string) {
  for (const key of memoCache.keys()) {
    if (key.startsWith(prefix)) memoCache.delete(key)
  }
}

export function memoInvalidateByDate(date: string) {
  memoInvalidateByPrefix(`availability:${date}:`)
}