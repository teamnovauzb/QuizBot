import { supabase, SUPABASE_ENABLED } from './supabase'
import { getTg } from './telegram'

const TG_AUTH_FN = '/functions/v1/tg-auth'

export type AuthOutcome = {
  ok: boolean
  telegram_id?: number
  first_name?: string
  last_name?: string
  username?: string
  reason?: string
}

/**
 * Sign the user into Supabase using their Telegram WebApp `initData`.
 * Falls back to dev-mode login (uses the demo telegram_id) outside Telegram —
 * works only when the edge function is deployed with ALLOW_DEV_LOGIN=true.
 */
export async function signInWithTelegram(devTelegramId?: number, devName?: string): Promise<AuthOutcome> {
  if (!SUPABASE_ENABLED || !supabase) return { ok: false, reason: 'supabase_disabled' }

  const tg = getTg()
  const initData = tg?.initData
  const url = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/+$/, '') + TG_AUTH_FN
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

  const body: Record<string, unknown> = {}
  if (initData) {
    body.initData = initData
  } else if (devTelegramId) {
    body.telegram_id = devTelegramId
    if (devName) {
      const [first, ...rest] = devName.split(' ')
      body.first_name = first
      if (rest.length) body.last_name = rest.join(' ')
    }
  } else {
    return { ok: false, reason: 'no_credentials' }
  }

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
      body: JSON.stringify(body),
    })
  } catch (e) {
    return { ok: false, reason: 'fetch_failed' }
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    return { ok: false, reason: `http_${res.status}_${txt.slice(0, 80)}` }
  }

  const j = await res.json() as {
    access_token?: string
    refresh_token?: string
    user?: { telegram_id: number; first_name: string; last_name?: string; username?: string }
    error?: string
  }
  if (!j.access_token || !j.refresh_token) return { ok: false, reason: j.error ?? 'no_session' }

  const { error } = await supabase.auth.setSession({
    access_token: j.access_token,
    refresh_token: j.refresh_token,
  })
  if (error) return { ok: false, reason: 'set_session_failed' }

  return {
    ok: true,
    telegram_id: j.user?.telegram_id,
    first_name: j.user?.first_name,
    last_name: j.user?.last_name,
    username: j.user?.username,
  }
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut()
}
