type TgWebApp = {
  ready: () => void
  expand: () => void
  close: () => void
  initData: string
  initDataUnsafe: { user?: { id: number; first_name: string; last_name?: string; username?: string; language_code?: string; photo_url?: string } }
  themeParams: Record<string, string>
  colorScheme: 'light' | 'dark'
  platform?: string
  version?: string
  viewportHeight?: number
  viewportStableHeight?: number
  isExpanded?: boolean
  HapticFeedback?: { impactOccurred: (s: 'light' | 'medium' | 'heavy') => void; notificationOccurred: (t: 'success' | 'error' | 'warning') => void; selectionChanged: () => void }
  BackButton?: { show: () => void; hide: () => void; onClick: (cb: () => void) => void; offClick: (cb: () => void) => void }
  MainButton?: { show: () => void; hide: () => void; setText: (t: string) => void; onClick: (cb: () => void) => void; offClick: (cb: () => void) => void; enable: () => void; disable: () => void }
  setHeaderColor: (c: string) => void
  setBackgroundColor: (c: string) => void
  disableVerticalSwipes?: () => void
  enableClosingConfirmation?: () => void
  requestContact?: () => void
  onEvent?: (event: string, cb: (data: any) => void) => void
  offEvent?: (event: string, cb: (data: any) => void) => void
  showConfirm?: (message: string, cb: (ok: boolean) => void) => void
  showAlert?: (message: string, cb?: () => void) => void
}

declare global { interface Window { Telegram?: { WebApp?: TgWebApp } } }

export function getTg(): TgWebApp | null {
  return window.Telegram?.WebApp ?? null
}

export function haptic(kind: 'light' | 'medium' | 'heavy' = 'light') {
  getTg()?.HapticFeedback?.impactOccurred(kind)
}

export function notify(kind: 'success' | 'error' | 'warning') {
  getTg()?.HapticFeedback?.notificationOccurred(kind)
}

export function initTelegram() {
  const tg = getTg()
  if (!tg) return null
  try {
    tg.ready()
    tg.expand()
    tg.setHeaderColor('#0A1814')
    tg.setBackgroundColor('#0A1814')
    // Prevent accidental swipe-to-close mid-quiz
    tg.disableVerticalSwipes?.()
    // Confirm before close
    tg.enableClosingConfirmation?.()
    // Track viewport height — Telegram mobile sometimes has the wrong svh,
    // so we mirror its `viewportStableHeight` into a CSS var. See main.tsx.
    setTgViewport()
    tg.onEvent?.('viewportChanged', setTgViewport)
  } catch { /* noop */ }
  return tg
}

function setTgViewport() {
  const tg = getTg()
  const root = typeof document !== 'undefined' ? document.documentElement : null
  if (!root) return
  const h = tg?.viewportStableHeight ?? tg?.viewportHeight ?? window.innerHeight
  if (h && h > 100) root.style.setProperty('--tg-vh', `${h}px`)
}

/** True when the page is rendered inside the Telegram app (not a regular browser). */
export function isTelegram(): boolean {
  const platform = getTg()?.platform
  return !!platform && platform !== 'unknown'
}

/**
 * Cross-platform confirm. Telegram WebApp blocks `window.confirm` on
 * iOS, so we route to its native `showConfirm` when present, falling
 * back to the browser dialog otherwise.
 */
export function confirmDialog(message: string): Promise<boolean> {
  const tg = getTg()
  if (tg && typeof tg.showConfirm === 'function') {
    return new Promise(resolve => {
      try { tg.showConfirm!(message, (ok: boolean) => resolve(!!ok)) }
      catch { resolve(true) }
    })
  }
  // browser fallback
  try { return Promise.resolve(window.confirm(message)) }
  catch { return Promise.resolve(true) }
}
