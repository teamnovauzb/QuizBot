type TgWebApp = {
  ready: () => void
  expand: () => void
  close: () => void
  initData: string
  initDataUnsafe: { user?: { id: number; first_name: string; last_name?: string; username?: string; language_code?: string; photo_url?: string } }
  themeParams: Record<string, string>
  colorScheme: 'light' | 'dark'
  HapticFeedback?: { impactOccurred: (s: 'light' | 'medium' | 'heavy') => void; notificationOccurred: (t: 'success' | 'error' | 'warning') => void; selectionChanged: () => void }
  BackButton?: { show: () => void; hide: () => void; onClick: (cb: () => void) => void; offClick: (cb: () => void) => void }
  MainButton?: { show: () => void; hide: () => void; setText: (t: string) => void; onClick: (cb: () => void) => void; offClick: (cb: () => void) => void; enable: () => void; disable: () => void }
  setHeaderColor: (c: string) => void
  setBackgroundColor: (c: string) => void
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
    tg.setHeaderColor('#0E1116')
    tg.setBackgroundColor('#0E1116')
  } catch { /* noop */ }
  return tg
}
