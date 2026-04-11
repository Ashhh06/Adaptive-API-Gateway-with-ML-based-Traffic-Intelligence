import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { LabelSlice, TimeseriesPoint } from '../api'

const LABEL_COLORS: Record<string, string> = {
  normal: '#16a34a',
  suspicious: '#ca8a04',
  malicious: '#dc2626',
  unknown: '#64748b',
}

function labelColor(name: string) {
  const k = name.toLowerCase()
  return LABEL_COLORS[k] || LABEL_COLORS.unknown
}

function formatTick(t: string) {
  const d = new Date(t)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  color: 'var(--text)',
}

export function TimeseriesChart({ points }: { points: TimeseriesPoint[] }) {
  const data = points.map((p) => ({
    ...p,
    label: formatTick(p.t),
  }))

  return (
    <div className="card-surface p-5">
      <h3 className="mb-4 text-lg font-semibold">Traffic over time</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fillAllowed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillBlocked" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#dc2626" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Area
              type="monotone"
              dataKey="allowed"
              name="Allowed"
              stroke="#2563eb"
              fill="url(#fillAllowed)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="blocked"
              name="Blocked"
              stroke="#dc2626"
              fill="url(#fillBlocked)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function LabelsPie({ labels }: { labels: LabelSlice[] }) {
  const data = labels.map((l) => ({
    name: l.label,
    value: l.count,
    color: labelColor(l.label),
  }))

  return (
    <div className="card-surface p-5">
      <h3 className="mb-2 text-lg font-semibold">ML labels</h3>
      <p className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>
        Distribution in selected window (unknown = non-API routes)
      </p>
      <div className="h-72 w-full">
        {data.length === 0 ? (
          <p className="py-20 text-center text-sm" style={{ color: 'var(--muted)' }}>
            No data
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={96}
                paddingAngle={2}
              >
                {data.map((e) => (
                  <Cell key={e.name} fill={e.color} stroke="var(--border)" />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
