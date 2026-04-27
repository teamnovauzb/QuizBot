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
  } catch { /* noop */ }
  return tg
}

/** True when the page is rendered inside the Telegram app (not a regular browser). */
export function isTelegram(): boolean {
  const platform = getTg()?.platform
  return !!platform && platform !== 'unknown'
}
