/**
 * Local stroke icons (Lucide-style paths, MIT-compatible) — avoids lucide-react's
 * thousands of files, which often break on WSL /mnt/e (Drvfs) installs.
 */
import type { ReactElement, ReactNode, SVGProps } from 'react'

export type TiIconProps = SVGProps<SVGSVGElement> & { strokeWidth?: number }

function I({
  children,
  strokeWidth = 2,
  className,
  ...rest
}: TiIconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      {children}
    </svg>
  )
}

export function Shield(props: TiIconProps) {
  return (
    <I {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </I>
  )
}

export function LayoutDashboard(props: TiIconProps) {
  return (
    <I {...props}>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </I>
  )
}

export function Activity(props: TiIconProps) {
  return (
    <I {...props}>
      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
    </I>
  )
}

export function AlertTriangle(props: TiIconProps) {
  return (
    <I {...props}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </I>
  )
}

export function Timer(props: TiIconProps) {
  return (
    <I {...props}>
      <line x1="10" x2="14" y1="2" y2="2" />
      <line x1="12" x2="15" y1="14" y2="11" />
      <circle cx="12" cy="14" r="8" />
    </I>
  )
}

export function Globe(props: TiIconProps) {
  return (
    <I {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </I>
  )
}

export function Gauge(props: TiIconProps) {
  return (
    <I {...props}>
      <path d="m12 14 4-4" />
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
    </I>
  )
}

export function RefreshCw(props: TiIconProps) {
  return (
    <I {...props}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </I>
  )
}

export function Moon(props: TiIconProps) {
  return (
    <I {...props}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </I>
  )
}

export function Sun(props: TiIconProps) {
  return (
    <I {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </I>
  )
}

export function Cpu(props: TiIconProps) {
  return (
    <I {...props}>
      <rect width="16" height="16" x="4" y="4" rx="2" />
      <rect width="6" height="6" x="9" y="9" rx="1" />
      <path d="M9 2v2" />
      <path d="M15 2v2" />
      <path d="M9 20v2" />
      <path d="M15 20v2" />
      <path d="M20 9h2" />
      <path d="M20 14h2" />
      <path d="M2 9h2" />
      <path d="M2 14h2" />
    </I>
  )
}

export function X(props: TiIconProps) {
  return (
    <I {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </I>
  )
}

/** For KpiCard: any of our icon components */
export type TiIcon = (props: TiIconProps) => ReactElement
