// Theme: 'auto' (follow Telegram color scheme), 'light', or 'dark'.
// Applied via [data-theme="..."] on <html>. We persist in localStorage.

export type Theme = 'auto' | 'light' | 'dark'

const KEY = 'shifokorat-theme'

export function getStoredTheme(): Theme {
  // Default → light (per user preference). User can switch to dark/auto in settings.
  if (typeof localStorage === 'undefined') return 'light'
  const v = localStorage.getItem(KEY)
  return v === 'light' || v === 'dark' || v === 'auto' ? v : 'light'
}

export function applyTheme(t: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  let resolved: 'light' | 'dark'
  if (t === 'auto') {
    // Auto = light by default, switches to dark only if Telegram or OS explicitly dark
    const tgScheme = (window as any).Telegram?.WebApp?.colorScheme as 'light' | 'dark' | undefined
    const sysDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    resolved = tgScheme === 'dark' || (tgScheme === undefined && sysDark) ? 'dark' : 'light'
  } else {
    resolved = t
  }
  root.setAttribute('data-theme', resolved)
  // Update theme-color meta for status bar
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#0A1814' : '#F2FAF6')
}

export function setTheme(t: Theme) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, t)
  applyTheme(t)
}

// Init early — before React renders
applyTheme(getStoredTheme())
