import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TopIp } from '../api'

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  color: 'var(--text)',
}

export function TopIpsChart({
  ips,
  onSelectIp,
}: {
  ips: TopIp[]
  onSelectIp: (ip: string) => void
}) {
  const data = [...ips]
    .reverse()
    .map((r) => ({
      ...r,
      short: r.ip.length > 18 ? `${r.ip.slice(0, 16)}…` : r.ip,
    }))

  return (
    <div className="card-surface p-5">
      <h3 className="mb-1 text-lg font-semibold">Top client IPs</h3>
      <p className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>
        Click a bar to inspect ML features (60s window)
      </p>
      <div className="h-80 w-full">
        {data.length === 0 ? (
          <p className="py-16 text-center text-sm" style={{ color: 'var(--muted)' }}>
            No data in range
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 11 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="short"
                width={100}
                tick={{ fill: 'var(--muted)', fontSize: 10 }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="total"
                name="Requests"
                fill="#3b82f6"
                radius={[0, 6, 6, 0]}
                className="cursor-pointer"
                onClick={(item: { payload?: { ip?: string } }) => {
                  const ip = item?.payload?.ip
                  if (ip) onSelectIp(ip)
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
