import { Activity, Cpu } from '../icons'
import type { ServicesHealth } from '../api'

function dot(ok: boolean, warn: boolean) {
  if (ok) return 'bg-emerald-500'
  if (warn) return 'bg-amber-500'
  return 'bg-red-500'
}

export function HealthStrip({ data }: { data: ServicesHealth | null }) {
  const gwOk = data?.gateway === 'ok'
  const ml = data?.ml
  const mlOk = ml === 'ok'
  const mlOff = ml === 'disabled' || ml === 'unknown'

  return (
    <div
      className="flex flex-wrap items-center gap-4 rounded-2xl border px-4 py-3 text-sm"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4" style={{ color: 'var(--muted)' }} />
        <span className="font-medium">Gateway</span>
        <span className={`h-2 w-2 rounded-full ${dot(gwOk, false)}`} />
        <span style={{ color: 'var(--muted)' }}>{data ? data.gateway : '…'}</span>
      </div>
      <div className="flex items-center gap-2">
        <Cpu className="h-4 w-4" style={{ color: 'var(--muted)' }} />
        <span className="font-medium">ML service</span>
        <span
          className={`h-2 w-2 rounded-full ${dot(mlOk, mlOff)}`}
        />
        <span style={{ color: 'var(--muted)' }}>{data ? data.ml : '…'}</span>
      </div>
    </div>
  )
}
