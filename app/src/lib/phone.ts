// Telegram Mini App phone-share helper. Uses `WebApp.requestContact(callback)`
// when available (Bot API 6.9+). On the bot side, the contact arrives as a
// service message — your tg-bot-webhook function should handle `message.contact`
// and persist `phone_number` on the public.users row.
//
// For browsers without Telegram, we expose a fallback: prompt for phone manually.

import { getTg, haptic, notify } from './telegram'

export type PhoneShareResult =
  | { ok: true; via: 'telegram' }
  | { ok: true; via: 'manual'; phone: string }
  | { ok: false; reason: 'cancelled' | 'unavailable' | 'error' }

export async function requestTelegramContact(): Promise<PhoneShareResult> {
  const tg = getTg()
  haptic('medium')
  if (tg && typeof (tg as any).requestContact === 'function') {
    return new Promise(resolve => {
      try {
        (tg as any).requestContact((shared: boolean) => {
          if (shared) {
            notify('success')
            resolve({ ok: true, via: 'telegram' })
          } else {
            resolve({ ok: false, reason: 'cancelled' })
          }
        })
      } catch {
        resolve({ ok: false, reason: 'error' })
      }
    })
  }
  return { ok: false, reason: 'unavailable' }
}

/** For non-Telegram browsers: just collect manually. UI handles input. */
export function manualPhoneAccept(phone: string): PhoneShareResult {
  if (!phone || !/^\+?\d[\d\s()-]{6,}/.test(phone)) {
    return { ok: false, reason: 'error' }
  }
  return { ok: true, via: 'manual', phone: phone.trim() }
}

/** Format a phone for display: "+998 95 952 97 67" */
export function fmtPhone(p: string | null | undefined): string {
  if (!p) return ''
  const d = p.replace(/\D/g, '')
  // UZ: +998 XX XXX XX XX
  if (d.startsWith('998') && d.length === 12) {
    return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`
  }
  return p.startsWith('+') ? p : '+' + p
}
