import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type Theme = 'light' | 'dark'

const ThemeContext = createContext<{
  theme: Theme
  toggle: () => void
} | null>(null)

const KEY = 'ti-dashboard-theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof localStorage === 'undefined') return 'dark'
    const s = localStorage.getItem(KEY) as Theme | null
    if (s === 'light' || s === 'dark') return s
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(KEY, theme)
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  const v = useMemo(() => ({ theme, toggle }), [theme, toggle])

  return <ThemeContext.Provider value={v}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const c = useContext(ThemeContext)
  if (!c) throw new Error('useTheme outside ThemeProvider')
  return c
}
