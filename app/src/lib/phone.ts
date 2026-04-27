// Telegram Mini App phone-share helper.
// Uses the event-based `requestContact` API (Bot API 6.9+):
//   tg.onEvent('contactRequested', cb) → status 'sent' | 'cancelled'
//   tg.requestContact()                ← no callback arg
//
// On the bot side, the user sees a popup; on accept, the contact arrives at
// our `tg-bot-webhook` Edge Function and `phone_verified=true` is persisted.
// The frontend listener fires too, with the phone number, so we can
// optimistically mark the local store + cache.

import { getTg, haptic, notify } from './telegram'
import { supabase } from './supabase'

export type PhoneShareResult =
  | { ok: true; via: 'telegram'; phone: string }
  | { ok: true; via: 'manual'; phone: string }
  | { ok: false; reason: 'cancelled' | 'unavailable' | 'error' }

const cacheKey = (id: number) => `tg_contact_${id}`

export function getCachedPhone(telegramId: number | undefined): string {
  if (!telegramId || typeof localStorage === 'undefined') return ''
  try {
    const raw = localStorage.getItem(cacheKey(telegramId))
    if (!raw) return ''
    return JSON.parse(raw).phone || ''
  } catch {
    return ''
  }
}

export function isCachedShared(telegramId: number | undefined): boolean {
  if (!telegramId || typeof localStorage === 'undefined') return false
  return localStorage.getItem(cacheKey(telegramId)) !== null
}

export function markCached(telegramId: number, phone: string) {
  if (!telegramId || typeof localStorage === 'undefined') return
  try { localStorage.setItem(cacheKey(telegramId), JSON.stringify({ phone })) } catch {}
}

/** Request via Telegram WebApp. Returns when the user accepts or cancels. */
export function requestTelegramContact(): Promise<PhoneShareResult> {
  const tg = getTg() as any
  haptic('medium')
  if (!tg || typeof tg.requestContact !== 'function' || typeof tg.onEvent !== 'function') {
    return Promise.resolve({ ok: false, reason: 'unavailable' })
  }
  return new Promise(resolve => {
    let resolved = false
    const handler = (data: any) => {
      if (resolved) return
      if (data?.status === 'sent') {
        resolved = true
        const phone =
          data.contact?.phone_number ||
          data.responseUnsafe?.contact?.phone_number ||
          ''
        const formatted = phone ? (phone.startsWith('+') ? phone : '+' + phone) : ''
        try { tg.offEvent('contactRequested', handler) } catch {}
        notify('success')
        resolve({ ok: true, via: 'telegram', phone: formatted })
      } else if (data?.status === 'cancelled') {
        resolved = true
        try { tg.offEvent('contactRequested', handler) } catch {}
        resolve({ ok: false, reason: 'cancelled' })
      }
    }
    try {
      tg.onEvent('contactRequested', handler)
      tg.requestContact()
      // Safety timeout — if no event fires in 60s, give up
      setTimeout(() => {
        if (!resolved) {
          resolved = true
          try { tg.offEvent('contactRequested', handler) } catch {}
          resolve({ ok: false, reason: 'cancelled' })
        }
      }, 60_000)
    } catch {
      try { tg.offEvent('contactRequested', handler) } catch {}
      resolve({ ok: false, reason: 'error' })
    }
  })
}

/** Manual entry (web fallback). */
export function manualPhoneAccept(phone: string): PhoneShareResult {
  if (!phone || !/^\+?\d[\d\s()-]{6,}/.test(phone)) {
    return { ok: false, reason: 'error' }
  }
  return { ok: true, via: 'manual', phone: phone.trim() }
}

/** Best-effort persist to DB (writes through RLS as the authed user). */
export async function saveContactToDb(telegramId: number, phone: string): Promise<void> {
  if (!supabase) return
  try {
    const { error } = await supabase.from('users')
      .update({
        phone,
        phone_verified: true,
        phone_shared_at: new Date().toISOString(),
      })
      .eq('telegram_id', telegramId)
    if (error) console.warn('[phone] save failed:', error.message)
  } catch (e) {
    console.warn('[phone] save threw:', e)
  }
}

/** Format a phone for display: "+998 95 952 97 67" */
export function fmtPhone(p: string | null | undefined): string {
  if (!p) return ''
  const d = p.replace(/\D/g, '')
  if (d.startsWith('998') && d.length === 12) {
    return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`
  }
  return p.startsWith('+') ? p : '+' + p
}
