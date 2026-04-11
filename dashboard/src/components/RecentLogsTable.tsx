import type { LogRow } from '../api'

function badge(label: string | null) {
  const l = (label || 'unknown').toLowerCase()
  if (l === 'malicious') return 'bg-red-500/15 text-red-700 dark:text-red-300'
  if (l === 'suspicious') return 'bg-amber-500/15 text-amber-800 dark:text-amber-200'
  if (l === 'normal') return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
  return 'bg-slate-500/15 text-slate-700 dark:text-slate-300'
}

export function RecentLogsTable({
  logs,
  onIpClick,
}: {
  logs: LogRow[]
  onIpClick: (ip: string) => void
}) {
  return (
    <div className="card-surface overflow-hidden">
      <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
        <h3 className="text-lg font-semibold">Recent requests</h3>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Latest from MongoDB · click IP for features
        </p>
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead
            className="sticky top-0 z-10 text-xs uppercase tracking-wide"
            style={{ background: 'var(--surface)', color: 'var(--muted)' }}
          >
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">IP</th>
              <th className="px-4 py-3 font-medium">Endpoint</th>
              <th className="px-4 py-3 font-medium">St</th>
              <th className="px-4 py-3 font-medium">ms</th>
              <th className="px-4 py-3 font-medium">Decision</th>
              <th className="px-4 py-3 font-medium">ML</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((r) => (
              <tr
                key={r.id}
                className="border-b transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                style={{ borderColor: 'var(--border)' }}
              >
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">
                  {new Date(r.timestamp).toLocaleTimeString()}
                </td>
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    className="font-mono text-xs text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                    onClick={() => onIpClick(r.ip)}
                  >
                    {r.ip}
                  </button>
                </td>
                <td
                  className="max-w-[200px] truncate px-4 py-2.5 text-xs"
                  title={r.endpoint}
                >
                  {r.endpoint}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">{r.status}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{r.latency}</td>
                <td className="px-4 py-2.5 text-xs">{r.decision}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge(r.mlLabel)}`}>
                    {r.mlLabel ?? '—'}
                  </span>
                  {r.mlConfidence != null ? (
                    <span className="ml-1 text-xs" style={{ color: 'var(--muted)' }}>
                      {(r.mlConfidence * 100).toFixed(0)}%
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 ? (
          <p className="py-12 text-center text-sm" style={{ color: 'var(--muted)' }}>
            No logs yet
          </p>
        ) : null}
      </div>
    </div>
  )
}
