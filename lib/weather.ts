const WEATHER_ENDPOINT_V3 = 'https://api.openweathermap.org/data/3.0/onecall'
const WEATHER_ENDPOINT_V2 = 'https://api.openweathermap.org/data/2.5/onecall'
const WEATHER_CACHE_TAG = 'admin-weather'
const DEFAULT_REVALIDATE_SECONDS = 900
const MS_TO_KMH = 3.6
const WEATHER_CACHE_WINDOW_MS = DEFAULT_REVALIDATE_SECONDS * 1000
const WEATHER_DAILY_LIMIT = 1000

type WeatherCacheState = {
  snapshot: AdminWeatherSnapshot | null
  expiresAt: number
  inFlight: Promise<AdminWeatherSnapshot> | null
  dateKey: string
  callCount: number
}

const WEATHER_GLOBAL_KEY = '__snWeatherCacheState'

const resolveWeatherState = (): WeatherCacheState => {
  const globalObject = globalThis as typeof globalThis & {
    [WEATHER_GLOBAL_KEY]?: WeatherCacheState
  }
  if (!globalObject[WEATHER_GLOBAL_KEY]) {
    globalObject[WEATHER_GLOBAL_KEY] = {
      snapshot: null,
      expiresAt: 0,
      inFlight: null,
      dateKey: '',
      callCount: 0
    }
  }
  return globalObject[WEATHER_GLOBAL_KEY]!
}

const parseEnvNumber = (value: string | undefined, fallbackMessage: string) => {
  const parsed = typeof value === 'string' ? Number(value) : Number.NaN
  if (Number.isFinite(parsed)) {
    return parsed
  }
  throw new Error(fallbackMessage)
}

const metersPerSecondToKilometersPerHour = (value: unknown) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0
  return Math.round(value * MS_TO_KMH * 10) / 10
}

export type AdminWeatherSnapshot = {
  updatedAt: string
  location: { lat: number; lon: number }
  thresholdWindKmh: number
  current: {
    temperature: number | null
    feelsLike: number | null
    description: string
    conditionCode: string
    humidity: number | null
    pressure: number | null
    windKmh: number
    gustKmh: number
    uvIndex: number | null
    sunRise: string | null
    sunSet: string | null
  }
  hourly: Array<{
    timestamp: string
    temperature: number | null
    windKmh: number
    gustKmh: number
    precipitationChance: number
    precipitationMm: number
    conditionCode: string
    description: string
  }>
  alerts: Array<{
    event: string
    start: string
    end: string
    description?: string
    sender?: string
  }>
  flags: {
    highWind: boolean
    imminentRain: boolean
  }
}

interface RawWeatherCondition {
  main?: string
  description?: string
  icon?: string
}

interface RawWeatherPoint {
  dt?: number
  temp?: number
  feels_like?: number
  wind_speed?: number
  wind_gust?: number
  humidity?: number
  pressure?: number
  uvi?: number
  sunrise?: number
  sunset?: number
  weather?: RawWeatherCondition[]
  pop?: number
  rain?: { [key: string]: number }
}

interface RawWeatherAlert {
  event?: string
  start?: number
  end?: number
  description?: string
  sender_name?: string
}

interface RawWeatherResponse {
  lat?: number
  lon?: number
  current?: RawWeatherPoint
  hourly?: RawWeatherPoint[]
  alerts?: RawWeatherAlert[]
}

const getThreshold = () => {
  const fallback = 25
  const raw = process.env.NEXT_PUBLIC_WIND_ALERT_THRESHOLD
  if (typeof raw === 'string' && raw.trim().length) {
    const parsed = Number(raw)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return fallback
}

type WeatherFetchError = Error & { status?: number; payload?: unknown }

const buildWeatherUrl = (endpoint: string, lat: number, lon: number, apiKey: string) => {
  const url = new URL(endpoint)
  url.searchParams.set('lat', lat.toString())
  url.searchParams.set('lon', lon.toString())
  url.searchParams.set('exclude', 'minutely')
  url.searchParams.set('units', 'metric')
  url.searchParams.set('lang', 'fr')
  url.searchParams.set('appid', apiKey)
  return url
}

const fetchWeather = async (url: URL): Promise<RawWeatherResponse> => {
  const response = await fetch(url, {
    next: { revalidate: DEFAULT_REVALIDATE_SECONDS, tags: [WEATHER_CACHE_TAG] }
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const extra = payload && typeof (payload as { message?: string }).message === 'string' ? `: ${(payload as { message?: string }).message}` : ''
    const error = new Error(`Weather fetch failed (${response.status}${extra})`) as WeatherFetchError
    error.status = response.status
    error.payload = payload
    throw error
  }

  return response.json() as Promise<RawWeatherResponse>
}

export async function getWeatherForecast(): Promise<RawWeatherResponse> {
  const apiKey = process.env.WEATHER_API_KEY
  if (!apiKey) {
    throw new Error('WEATHER_API_KEY is not configured')
  }
  const lat = parseEnvNumber(process.env.WEATHER_LAT, 'WEATHER_LAT is missing or invalid')
  const lon = parseEnvNumber(process.env.WEATHER_LON, 'WEATHER_LON is missing or invalid')
  const v3Url = buildWeatherUrl(WEATHER_ENDPOINT_V3, lat, lon, apiKey)
  try {
    return await fetchWeather(v3Url)
  } catch (error) {
    const status = (error as WeatherFetchError)?.status
    if (status === 401) {
      const v2Url = buildWeatherUrl(WEATHER_ENDPOINT_V2, lat, lon, apiKey)
      return fetchWeather(v2Url)
    }
    throw error
  }
}

export async function getAdminWeatherSnapshot(): Promise<AdminWeatherSnapshot> {
  const state = resolveWeatherState()
  const now = Date.now()

  if (state.snapshot && now < state.expiresAt) {
    return state.snapshot
  }

  if (state.inFlight) {
    return state.inFlight
  }

  const promise = (async () => {
    try {
      const raw = await fetchWeatherWithQuota(state)
      const snapshot = buildAdminSnapshot(raw)
      state.snapshot = snapshot
      state.expiresAt = Date.now() + WEATHER_CACHE_WINDOW_MS
      return snapshot
    } finally {
      state.inFlight = null
    }
  })()

  state.inFlight = promise
  return promise
}

const resetDailyCounter = (state: WeatherCacheState) => {
  const todayKey = new Date().toISOString().slice(0, 10)
  if (state.dateKey !== todayKey) {
    state.dateKey = todayKey
    state.callCount = 0
  }
}

const fetchWeatherWithQuota = async (state: WeatherCacheState) => {
  resetDailyCounter(state)
  if (state.callCount >= WEATHER_DAILY_LIMIT) {
    throw new Error('Weather daily quota reached (1000 calls).')
  }
  state.callCount += 1
  return getWeatherForecast()
}

const buildAdminSnapshot = (raw: RawWeatherResponse): AdminWeatherSnapshot => {
  const lat = typeof raw.lat === 'number' ? raw.lat : parseEnvNumber(process.env.WEATHER_LAT, 'WEATHER_LAT invalid')
  const lon = typeof raw.lon === 'number' ? raw.lon : parseEnvNumber(process.env.WEATHER_LON, 'WEATHER_LON invalid')
  const thresholdWindKmh = getThreshold()
  const current = raw.current ?? {}
  const currentCondition = Array.isArray(current.weather) && current.weather.length > 0 ? current.weather[0] : {}

  const hourly = Array.isArray(raw.hourly) ? raw.hourly.slice(0, 6) : []

  const serializedHourly = hourly
    .map((point) => {
      if (typeof point.dt !== 'number') return null
      const condition = Array.isArray(point.weather) && point.weather.length ? point.weather[0] : {}
      const rainVolume = typeof point.rain?.['1h'] === 'number' ? point.rain['1h'] : 0
      return {
        timestamp: new Date(point.dt * 1000).toISOString(),
        temperature: typeof point.temp === 'number' ? Math.round(point.temp) : null,
        windKmh: metersPerSecondToKilometersPerHour(point.wind_speed),
        gustKmh: metersPerSecondToKilometersPerHour(point.wind_gust),
        precipitationChance: typeof point.pop === 'number' ? Math.round(point.pop * 100) : 0,
        precipitationMm: rainVolume,
        conditionCode: condition.main ?? 'Unknown',
        description: condition.description ?? ''
      }
    })
    .filter((entry): entry is AdminWeatherSnapshot['hourly'][number] => entry !== null)

  const alerts = Array.isArray(raw.alerts)
    ? raw.alerts
        .map((alert) => {
          if (typeof alert.start !== 'number' || typeof alert.end !== 'number') return null
          return {
            event: alert.event ?? 'Alerte météo',
            start: new Date(alert.start * 1000).toISOString(),
            end: new Date(alert.end * 1000).toISOString(),
            description: alert.description,
            sender: alert.sender_name
          }
        })
        .filter((entry): entry is AdminWeatherSnapshot['alerts'][number] => entry !== null)
    : []

  const highWind = metersPerSecondToKilometersPerHour(current.wind_speed) >= thresholdWindKmh
  const imminentRain = serializedHourly.slice(0, 3).some((entry) => entry.precipitationChance >= 40 || entry.precipitationMm > 0)

  return {
    updatedAt: new Date().toISOString(),
    location: { lat, lon },
    thresholdWindKmh,
    current: {
      temperature: typeof current.temp === 'number' ? Math.round(current.temp) : null,
      feelsLike: typeof current.feels_like === 'number' ? Math.round(current.feels_like) : null,
      description: currentCondition.description ?? '',
      conditionCode: currentCondition.main ?? 'Unknown',
      humidity: typeof current.humidity === 'number' ? current.humidity : null,
      pressure: typeof current.pressure === 'number' ? current.pressure : null,
      windKmh: metersPerSecondToKilometersPerHour(current.wind_speed),
      gustKmh: metersPerSecondToKilometersPerHour(current.wind_gust),
      uvIndex: typeof current.uvi === 'number' ? current.uvi : null,
      sunRise: typeof current.sunrise === 'number' ? new Date(current.sunrise * 1000).toISOString() : null,
      sunSet: typeof current.sunset === 'number' ? new Date(current.sunset * 1000).toISOString() : null
    },
    hourly: serializedHourly,
    alerts,
    flags: {
      highWind,
      imminentRain
    }
  }
}
