import { createStore, get, set, type UseStore } from 'idb-keyval'

const STORE_NAME = 'sn-mobile-cache'
const STORE_TABLE = 'resources'

let store: UseStore | null = null

const ensureStore = (): UseStore | null => {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return null
  }
  if (!store) {
    store = createStore(STORE_NAME, STORE_TABLE)
  }
  return store
}

export type CacheEnvelope<T> = {
  payload: T
  timestamp: number
}

export async function writeCache<T>(key: string, payload: T): Promise<void> {
  const target = ensureStore()
  if (!target) return
  try {
    await set(key, { payload, timestamp: Date.now() } as CacheEnvelope<T>, target)
  } catch (error) {
    console.warn('[mobile-cache] failed to write cache', error)
  }
}

export async function readCache<T>(key: string): Promise<CacheEnvelope<T> | null> {
  const target = ensureStore()
  if (!target) return null
  try {
    const value = (await get(key, target)) as CacheEnvelope<T> | undefined
    return value ?? null
  } catch (error) {
    console.warn('[mobile-cache] failed to read cache', error)
    return null
  }
}
