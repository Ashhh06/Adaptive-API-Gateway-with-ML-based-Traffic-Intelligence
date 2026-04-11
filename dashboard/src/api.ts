export type RangeKey = '1h' | '24h' | '7d'

export type Summary = {
  range: string
  from: string
  to: string
  totalRequests: number
  allowed: number
  blocked: number
  errorCount: number
  errorRate: number
  blockedRate: number
  avgLatencyMs: number
  uniqueIps: number
}

export type TimeseriesPoint = {
  t: string
  count: number
  blocked: number
  allowed: number
  avgLatencyMs: number
}

export type Timeseries = {
  range: string
  bucketMs: number
  points: TimeseriesPoint[]
}

export type LabelSlice = { label: string; count: number }

export type LabelsResponse = {
  range: string
  labels: LabelSlice[]
}

export type TopIp = {
  ip: string
  total: number
  allowed: number
  blocked: number
  dominantLabel: string
}

export type TopIpsResponse = {
  range: string
  ips: TopIp[]
}

export type LogRow = {
  id: string
  ip: string
  endpoint: string
  timestamp: string
  status: number
  latency: number
  decision: string
  mlLabel: string | null
  mlConfidence: number | null
}

export type RecentResponse = { logs: LogRow[] }

export type ServicesHealth = { gateway: string; ml: string }

const prefix = '/api/dashboard'

async function j<T>(path: string): Promise<T> {
  const r = await fetch(`${prefix}${path}`)
  if (!r.ok) throw new Error(`${path} ${r.status}`)
  return r.json() as Promise<T>
}

export function fetchSummary(range: RangeKey) {
  return j<Summary>(`/summary?range=${range}`)
}

export function fetchTimeseries(range: RangeKey) {
  return j<Timeseries>(`/timeseries?range=${range}`)
}

export function fetchLabels(range: RangeKey) {
  return j<LabelsResponse>(`/labels?range=${range}`)
}

export function fetchTopIps(range: RangeKey, limit = 12) {
  return j<TopIpsResponse>(`/top-ips?range=${range}&limit=${limit}`)
}

export function fetchRecent(limit = 80) {
  return j<RecentResponse>(`/recent?limit=${limit}`)
}

export function fetchServicesHealth() {
  return j<ServicesHealth>('/health')
}

export type FeaturesPayload = {
  ip: string
  requests_per_minute: number
  avg_inter_request_time: number
  unique_endpoints_hit: number
  error_rate: number
  burst_ratio: number
}

export async function fetchFeatures(ip: string): Promise<FeaturesPayload> {
  const r = await fetch(`/features/${encodeURIComponent(ip)}`)
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || r.statusText)
  }
  return r.json() as Promise<FeaturesPayload>
}
