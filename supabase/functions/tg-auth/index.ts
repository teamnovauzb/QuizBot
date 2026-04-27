// Verifies Telegram WebApp `initData` HMAC, upserts the user, returns
// a Supabase session token that the frontend uses to authenticate
// all subsequent queries (RLS-gated).
//
// Required Edge Function secrets (set via `supabase secrets set ...`):
//   TELEGRAM_BOT_TOKEN   — from @BotFather (NEVER bundled into the client)
//   SUPABASE_URL         — auto-populated
//   SUPABASE_SERVICE_ROLE_KEY — auto-populated
//   ALLOW_DEV_LOGIN      — "true" to permit dev-mode login by telegram_id only
//
// Dev mode (no Telegram): POST { telegram_id: 300001 } with Authorization:
// Bearer <anon key>. Only works when ALLOW_DEV_LOGIN=true.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const enc = new TextEncoder()

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data))
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function verifyInitData(initData: string, botToken: string): Promise<{ ok: boolean; user?: any; authDate?: number }> {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return { ok: false }
  params.delete('hash')

  const dataCheck = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const secretKey = await hmac(enc.encode('WebAppData'), botToken)
  const sig = await hmac(secretKey, dataCheck)
  if (bufToHex(sig) !== hash) return { ok: false }

  const userJson = params.get('user')
  const authDate = parseInt(params.get('auth_date') ?? '0', 10)
  if (!userJson) return { ok: false }
  // reject anything older than 24h
  if (Date.now() / 1000 - authDate > 86400) return { ok: false }

  return { ok: true, user: JSON.parse(userJson), authDate }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const allowDev = (Deno.env.get('ALLOW_DEV_LOGIN') ?? 'false') === 'true'

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    const body = await req.json().catch(() => ({})) as { initData?: string; telegram_id?: number; first_name?: string; last_name?: string; username?: string }

    let tgUser: { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string; language_code?: string } | null = null

    if (body.initData && botToken) {
      const result = await verifyInitData(body.initData, botToken)
      if (!result.ok) return json({ error: 'invalid_init_data' }, 401)
      tgUser = result.user
    } else if (allowDev && body.telegram_id) {
      tgUser = {
        id: body.telegram_id,
        first_name: body.first_name ?? 'Dev',
        last_name: body.last_name,
        username: body.username,
      }
    } else {
      return json({ error: 'no_init_data' }, 400)
    }

    if (!tgUser) return json({ error: 'unauthorized' }, 401)

    // Upsert user row, link auth_uid
    const email = `tg-${tgUser.id}@shifokorat.invalid`
    const password = `tg-${tgUser.id}-${supabaseUrl.length}` // deterministic, never user-facing

    // Try to fetch the existing auth user by email; if not, create one.
    let authUid: string | null = null
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1, } as any)
    // listUsers can't filter by email; iterate the small chance of collision via createUser then fallback.
    const createRes = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        telegram_id: tgUser.id,
        first_name: tgUser.first_name,
        last_name: tgUser.last_name ?? null,
        username: tgUser.username ?? null,
      },
    })
    if (createRes.data?.user) {
      authUid = createRes.data.user.id
    } else {
      // already exists — fetch it
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 } as any)
      authUid = list?.users.find(u => u.email === email)?.id ?? null
    }
    if (!authUid) return json({ error: 'auth_user_unavailable' }, 500)

    // Upsert public.users row
    const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ').trim() || `User ${tgUser.id}`
    const { error: upsertErr } = await admin.from('users').upsert({
      telegram_id: tgUser.id,
      auth_uid: authUid,
      name: fullName,
      username: tgUser.username ?? null,
      photo_url: tgUser.photo_url ?? null,
      language: tgUser.language_code ?? 'uz',
      last_active: new Date().toISOString(),
    }, { onConflict: 'telegram_id' })
    if (upsertErr) return json({ error: 'user_upsert_failed', detail: upsertErr.message }, 500)

    // Generate a sign-in session for the auth user — frontend uses access_token to authenticate.
    const { data: sessionData, error: sessErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    if (sessErr || !sessionData) return json({ error: 'session_failed', detail: sessErr?.message }, 500)

    // Better: use signInWithPassword from anon client — deterministic password we set above.
    const { data: signed, error: signErr } = await admin.auth.signInWithPassword({ email, password })
    if (signErr || !signed.session) return json({ error: 'signin_failed', detail: signErr?.message }, 500)

    return json({
      access_token: signed.session.access_token,
      refresh_token: signed.session.refresh_token,
      expires_at: signed.session.expires_at,
      user: {
        telegram_id: tgUser.id,
        first_name: tgUser.first_name,
        last_name: tgUser.last_name,
        username: tgUser.username,
      },
    }, 200)
  } catch (e) {
    return json({ error: 'internal', detail: String(e) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}
