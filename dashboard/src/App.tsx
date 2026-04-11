import {
  Activity,
  AlertTriangle,
  Gauge,
  Globe,
  LayoutDashboard,
  Moon,
  RefreshCw,
  Shield,
  Sun,
  Timer,
} from './icons'
import { useCallback, useEffect, useState } from 'react'
import type {
  LabelsResponse,
  RangeKey,
  RecentResponse,
  ServicesHealth,
  Summary,
  Timeseries,
  TopIpsResponse,
} from './api'
import {
  fetchLabels,
  fetchRecent,
  fetchServicesHealth,
  fetchSummary,
  fetchTimeseries,
  fetchTopIps,
} from './api'
import { LabelsPie, TimeseriesChart } from './components/ChartsBlock'
import { FeatureModal } from './components/FeatureModal'
import { HealthStrip } from './components/HealthStrip'
import { KpiCard } from './components/KpiCard'
import { RecentLogsTable } from './components/RecentLogsTable'
import { TopIpsChart } from './components/TopIpsChart'
import { ThemeProvider, useTheme } from './context/ThemeContext'

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '1h', label: '1h' },
  { key: '24h', label: '24h' },
  { key: '7d', label: '7d' },
]

function DashboardApp() {
  const { theme, toggle } = useTheme()
  const [range, setRange] = useState<RangeKey>('24h')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [ts, setTs] = useState<Timeseries | null>(null)
  const [labels, setLabels] = useState<LabelsResponse | null>(null)
  const [topIps, setTopIps] = useState<TopIpsResponse | null>(null)
  const [recent, setRecent] = useState<RecentResponse | null>(null)
  const [health, setHealth] = useState<ServicesHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [featureIp, setFeatureIp] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const load = useCallback(async () => {
    setErr(null)
    setLoading(true)
    try {
      const [s, t, l, tip, rec, h] = await Promise.all([
        fetchSummary(range),
        fetchTimeseries(range),
        fetchLabels(range),
        fetchTopIps(range),
        fetchRecent(80),
        fetchServicesHealth(),
      ])
      setSummary(s)
      setTs(t)
      setLabels(l)
      setTopIps(tip)
      setRecent(rec)
      setHealth(h)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const id = setInterval(load, 15000)
    return () => clearInterval(id)
  }, [load])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div className="mx-auto flex max-w-[1600px]">
        <aside
          className={`relative sticky top-0 hidden h-screen shrink-0 border-r transition-[width] md:block ${
            sidebarOpen ? 'w-56' : 'w-16'
          }`}
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <div className="flex h-14 items-center gap-2 border-b px-4" style={{ borderColor: 'var(--border)' }}>
            <Shield className="h-7 w-7 shrink-0 text-blue-600" />
            {sidebarOpen ? (
              <span className="font-semibold tracking-tight">Traffic Intel</span>
            ) : null}
          </div>
          <nav className="p-3">
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              <LayoutDashboard className="h-4 w-4" />
              {sidebarOpen ? 'Overview' : null}
            </div>
          </nav>
          <button
            type="button"
            className="absolute bottom-4 left-3 rounded-lg border px-2 py-1 text-xs"
            style={{ borderColor: 'var(--border)' }}
            onClick={() => setSidebarOpen((o) => !o)}
          >
            {sidebarOpen ? '«' : '»'}
          </button>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Gateway overview</h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
                Adaptive API gateway · MongoDB logs · ML-assisted limits
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="flex rounded-xl border p-1"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                {RANGES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRange(r.key)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      range === r.key ? 'bg-blue-600 text-white shadow' : ''
                    }`}
                    style={range === r.key ? {} : { color: 'var(--muted)' }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition hover:opacity-90"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={toggle}
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </header>

          <div className="mb-6">
            <HealthStrip data={health} />
          </div>

          {err ? (
            <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {err} — is the gateway running on :3000?
            </div>
          ) : null}

          {summary ? (
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                index={0}
                title="Total requests"
                value={summary.totalRequests.toLocaleString()}
                sub={`Window: ${summary.range}`}
                icon={Activity}
              />
              <KpiCard
                index={1}
                title="Blocked rate"
                value={`${(summary.blockedRate * 100).toFixed(1)}%`}
                sub={`${summary.blocked} blocked`}
                icon={AlertTriangle}
                accentClass="text-amber-600"
              />
              <KpiCard
                index={2}
                title="Avg latency"
                value={`${summary.avgLatencyMs} ms`}
                sub="Gateway observed"
                icon={Timer}
              />
              <KpiCard
                index={3}
                title="Unique IPs"
                value={String(summary.uniqueIps)}
                sub="Distinct clients"
                icon={Globe}
              />
            </div>
          ) : null}

          <div className="mb-6 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">{ts ? <TimeseriesChart points={ts.points} /> : null}</div>
            <div>{labels ? <LabelsPie labels={labels.labels} /> : null}</div>
          </div>

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            {topIps ? <TopIpsChart ips={topIps.ips} onSelectIp={setFeatureIp} /> : null}
            <div className="card-surface flex flex-col justify-center p-6">
              <Gauge className="mb-3 h-8 w-8 text-blue-600" />
              <h3 className="text-lg font-semibold">Policy snapshot</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                Rate limits follow ML labels: normal (100), suspicious (40), malicious (0) per
                window. Data here is read-only; tune via gateway env{' '}
                <code className="rounded bg-black/5 px-1 dark:bg-white/10">RLIMIT_*</code>.
              </p>
            </div>
          </div>

          {recent ? <RecentLogsTable logs={recent.logs} onIpClick={setFeatureIp} /> : null}
        </main>
      </div>

      <FeatureModal ip={featureIp} onClose={() => setFeatureIp(null)} />

      <div className="fixed bottom-4 right-4 md:hidden">
        <button
          type="button"
          onClick={toggle}
          className="rounded-full border p-3 shadow-lg"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <DashboardApp />
    </ThemeProvider>
  )
}
