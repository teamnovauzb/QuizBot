type TgInset = { top: number; bottom: number; left: number; right: number }

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
  // Bot API 8.0+: device safe-area (notch / status bar)
  safeAreaInset?: TgInset
  // Bot API 8.0+: includes Telegram-injected UI (Close button, drag handle, ⋯ menu)
  contentSafeAreaInset?: TgInset
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
    setTgSafeAreas()
    tg.onEvent?.('viewportChanged', setTgViewport)
    // Bot API 8.0+ — fires when safe-area changes (rotation, controls show/hide)
    tg.onEvent?.('safeAreaChanged', setTgSafeAreas)
    tg.onEvent?.('contentSafeAreaChanged', setTgSafeAreas)
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

/**
 * Mirror Telegram's safe-area insets into CSS vars so layout can clear the
 * floating Telegram UI (Close button, ⋯ menu, drag handle) on iOS/Android.
 *
 * Per Telegram WebApp spec the two insets are RELATIVE — `contentSafeAreaInset`
 * sits inside `safeAreaInset` — so to get the absolute distance from the
 * top of the Mini App window we ADD them.
 *
 * - `--tg-safe-top`    = device inset (status bar / notch)
 * - `--tg-content-top` = absolute inset clearing Telegram's floating controls
 *
 * On Bot API < 8.0 the values are undefined; we fall back to a generous
 * platform default so the title doesn't get covered by the Close button.
 */
function setTgSafeAreas() {
  const tg = getTg()
  const root = typeof document !== 'undefined' ? document.documentElement : null
  if (!root) return
  const platform = tg?.platform ?? ''
  // Mobile clients (ios/android) host the floating controls.
  // Desktop/tdesktop don't, so 0 is fine there.
  const isMobile = platform === 'ios' || platform === 'android'
  // Pre-Bot-API-8.0 fallback. Status bar (~44px) + Telegram drag-handle area
  // and Close/⋯ buttons (~80px) ≈ 124px — leave a touch more for safety.
  const fallbackTotal = isMobile ? 130 : 0
  const fallbackSafe = isMobile ? 44 : 0

  const safeTop = tg?.safeAreaInset?.top
  const contentTop = tg?.contentSafeAreaInset?.top

  let absoluteTop: number
  if (typeof safeTop === 'number' && typeof contentTop === 'number') {
    // Both reported — add them since contentSafeAreaInset is relative
    absoluteTop = safeTop + contentTop
  } else if (typeof safeTop === 'number') {
    // Only device inset known — add a buffer for the floating controls
    absoluteTop = safeTop + (isMobile ? 80 : 0)
  } else {
    absoluteTop = fallbackTotal
  }

  root.style.setProperty('--tg-safe-top', `${safeTop ?? fallbackSafe}px`)
  root.style.setProperty('--tg-content-top', `${absoluteTop}px`)
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
