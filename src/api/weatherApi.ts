import type {
  WeatherFamily,
  WeatherTelemetry,
} from '../types/suit'

export type WeatherApiErrorCode =
  | 'missing-city'
  | 'geocode-failed'
  | 'network'
  | 'http'
  | 'shape'

export class WeatherApiError extends Error {
  readonly code: WeatherApiErrorCode
  readonly status: number | undefined

  constructor(code: WeatherApiErrorCode, message: string, status?: number) {
    super(message)
    this.name = 'WeatherApiError'
    this.code = code
    this.status = status
  }
}

interface GeocodeResponse {
  results?: Array<{
    latitude?: number
    longitude?: number
    name?: string
  }>
}

interface ForecastResponse {
  current?: {
    temperature_2m?: number
    weather_code?: number
  }
}

// Maps WMO weather_code ranges to a coarse family (drives the icon) and a
// suit-language label (drives the text). Reference:
// https://open-meteo.com/en/docs#weathervariables
function classifyWmo(code: number): {
  family: WeatherFamily
  label: string
} {
  if (code === 0 || code === 1) {
    return { family: 'clear', label: 'ATMOSPHERIC CONDITIONS: NOMINAL' }
  }
  if (code === 2 || code === 3) {
    return { family: 'cloud', label: 'OVERCAST — VISIBILITY DEGRADED' }
  }
  if (code === 45 || code === 48) {
    return { family: 'fog', label: 'LOW VISIBILITY — RECOMMEND THERMAL VISION' }
  }
  if (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82)
  ) {
    return { family: 'rain', label: 'PRECIPITATION DETECTED' }
  }
  if (
    (code >= 71 && code <= 77) ||
    code === 85 ||
    code === 86
  ) {
    return { family: 'snow', label: 'ICE CRYSTAL INTERFERENCE' }
  }
  if (code >= 95 && code <= 99) {
    return { family: 'storm', label: 'ELECTRICAL STORM — CAUTION' }
  }
  return { family: 'cloud', label: 'ATMOSPHERIC DATA INCONCLUSIVE' }
}

// Module-scoped geocode cache — the city only changes when the user edits
// .env.local, so one lookup per session is plenty. Keyed by city so a stale
// cache for the wrong city can't return wrong coords.
let cachedCoords: {
  city: string
  lat: number
  lon: number
} | null = null

async function geocode(
  city: string,
  signal?: AbortSignal,
): Promise<{ lat: number; lon: number }> {
  if (cachedCoords && cachedCoords.city === city) {
    return { lat: cachedCoords.lat, lon: cachedCoords.lon }
  }
  const url =
    'https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=' +
    encodeURIComponent(city)
  let response: Response
  try {
    response = await fetch(url, { signal })
  } catch (err) {
    throw new WeatherApiError(
      'network',
      `Network error geocoding "${city}": ${(err as Error).message}`,
    )
  }
  if (!response.ok) {
    throw new WeatherApiError(
      'http',
      `Open-Meteo geocoding returned ${response.status}`,
      response.status,
    )
  }
  let payload: GeocodeResponse
  try {
    payload = (await response.json()) as GeocodeResponse
  } catch (err) {
    throw new WeatherApiError(
      'shape',
      `Geocoding response was not valid JSON: ${(err as Error).message}`,
    )
  }
  const top = payload.results?.[0]
  if (
    !top ||
    typeof top.latitude !== 'number' ||
    typeof top.longitude !== 'number'
  ) {
    throw new WeatherApiError(
      'geocode-failed',
      `No geocoding results for "${city}"`,
    )
  }
  cachedCoords = { city, lat: top.latitude, lon: top.longitude }
  return { lat: top.latitude, lon: top.longitude }
}

export async function fetchWeatherTelemetry(
  signal?: AbortSignal,
): Promise<WeatherTelemetry> {
  const city = import.meta.env.VITE_WEATHER_CITY
  if (!city) {
    throw new WeatherApiError(
      'missing-city',
      'VITE_WEATHER_CITY is not set — add it to .env.local',
    )
  }

  const { lat, lon } = await geocode(city, signal)

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,weather_code'

  let response: Response
  try {
    response = await fetch(url, { signal })
  } catch (err) {
    throw new WeatherApiError(
      'network',
      `Network error fetching weather: ${(err as Error).message}`,
    )
  }
  if (!response.ok) {
    throw new WeatherApiError(
      'http',
      `Open-Meteo forecast returned ${response.status}`,
      response.status,
    )
  }
  let payload: ForecastResponse
  try {
    payload = (await response.json()) as ForecastResponse
  } catch (err) {
    throw new WeatherApiError(
      'shape',
      `Forecast response was not valid JSON: ${(err as Error).message}`,
    )
  }
  if (
    !payload.current ||
    typeof payload.current.temperature_2m !== 'number' ||
    typeof payload.current.weather_code !== 'number'
  ) {
    throw new WeatherApiError(
      'shape',
      'Forecast response was missing temperature_2m or weather_code',
    )
  }

  const { family, label } = classifyWmo(payload.current.weather_code)
  return {
    city,
    tempC: payload.current.temperature_2m,
    family,
    conditionLabel: label,
  }
}
