import { X } from '../icons'
import { useEffect, useState } from 'react'
import { fetchFeatures, type FeaturesPayload } from '../api'

export function FeatureModal({
  ip,
  onClose,
}: {
  ip: string | null
  onClose: () => void
}) {
  const [data, setData] = useState<FeaturesPayload | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!ip) {
      setData(null)
      setErr(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setErr(null)
    fetchFeatures(ip)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e: Error) => {
        if (!cancelled) setErr(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ip])

  if (!ip) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.55)' }}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="card-surface max-h-[90vh] w-full max-w-md overflow-auto p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Features</h3>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {ip} · last 60s window
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 transition hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Loading…
          </p>
        ) : err ? (
          <p className="text-sm text-red-600 dark:text-red-400">{err}</p>
        ) : data ? (
          <ul className="space-y-3 text-sm">
            <Row k="requests_per_minute" v={data.requests_per_minute} />
            <Row k="avg_inter_request_time" v={data.avg_inter_request_time} />
            <Row k="unique_endpoints_hit" v={data.unique_endpoints_hit} />
            <Row k="error_rate" v={data.error_rate} />
            <Row k="burst_ratio" v={data.burst_ratio} />
          </ul>
        ) : null}
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: number }) {
  return (
    <li
      className="flex justify-between gap-4 rounded-xl border px-3 py-2"
      style={{ borderColor: 'var(--border)' }}
    >
      <span style={{ color: 'var(--muted)' }}>{k}</span>
      <span className="font-mono font-medium">{typeof v === 'number' ? v.toFixed(4) : v}</span>
    </li>
  )
}
