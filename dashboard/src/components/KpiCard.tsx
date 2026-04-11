import { motion } from 'framer-motion'
import type { TiIcon } from '../icons'

type Props = {
  title: string
  value: string
  sub?: string
  icon: TiIcon
  accentClass?: string
  index: number
}

export function KpiCard({ title, value, sub, icon: Icon, accentClass = 'text-accent', index }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      className="card-surface p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
            {title}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          {sub ? (
            <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
              {sub}
            </p>
          ) : null}
        </div>
        <div
          className={`rounded-xl p-2.5 ${accentClass}`}
          style={{ background: 'var(--accent-soft)' }}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      </div>
    </motion.div>
  )
}
