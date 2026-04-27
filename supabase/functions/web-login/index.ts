// Two web-login flows:
//
// (1) Telegram Login Widget — POST { mode: 'widget', payload: { id, first_name, ..., hash } }
//     Verifies HMAC of payload (different scheme from initData).
//
// (2) Code-based — POST { mode: 'code', code: '123456' }
//     User runs /login in the bot; bot stores a 6-digit token in login_tokens.
//     User pastes the code on the web; we look it up, sign them in.
//
// Returns the same shape as tg-auth: { access_token, refresh_token, user }.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const enc = new TextEncoder()

async function sha256(data: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', enc.encode(data))
}

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey('raw', key as ArrayBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data))
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function verifyWidgetPayload(payload: Record<string, any>, botToken: string): Promise<boolean> {
  const { hash, ...rest } = payload
  if (!hash) return false
  const dataCheck = Object.keys(rest).sort().map(k => `${k}=${rest[k]}`).join('\n')
  const secretKey = await sha256(botToken)  // widget uses sha256(botToken), NOT HMAC('WebAppData', token)
  const sig = await hmac(secretKey, dataCheck)
  if (bufToHex(sig) !== hash) return false
  // reject auth_date older than 24h
  if (rest.auth_date && Date.now() / 1000 - Number(rest.auth_date) > 86400) return false
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    const body = await req.json().catch(() => ({})) as { mode?: string; payload?: any; code?: string }

    let tgUser: { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string } | null = null

    if (body.mode === 'widget' && body.payload && botToken) {
      const ok = await verifyWidgetPayload(body.payload, botToken)
      if (!ok) return json({ error: 'invalid_widget_payload' }, 401)
      tgUser = {
        id: Number(body.payload.id),
        first_name: body.payload.first_name,
        last_name: body.payload.last_name,
        username: body.payload.username,
        photo_url: body.payload.photo_url,
      }
    } else if (body.mode === 'code' && body.code) {
      const { data: tok } = await admin.from('login_tokens').select('*').eq('token', body.code).eq('status', 'consumed').maybeSingle()
      if (!tok) return json({ error: 'invalid_code' }, 401)
      if (new Date(tok.expires_at) < new Date()) return json({ error: 'expired' }, 401)
      const { data: u } = await admin.from('users').select('telegram_id, name, username').eq('telegram_id', tok.user_id).single()
      if (!u) return json({ error: 'user_not_found' }, 404)
      tgUser = {
        id: u.telegram_id,
        first_name: u.name.split(' ')[0],
        last_name: u.name.split(' ').slice(1).join(' '),
        username: u.username ?? undefined,
      }
      // single-use
      await admin.from('login_tokens').delete().eq('token', body.code)
    } else {
      return json({ error: 'missing_payload' }, 400)
    }

    if (!tgUser) return json({ error: 'unauthorized' }, 401)

    const email = `tg-${tgUser.id}@shifokorat.invalid`
    const password = `tg-${tgUser.id}-${supabaseUrl.length}`

    let authUid: string | null = null
    const createRes = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { telegram_id: tgUser.id, first_name: tgUser.first_name },
    })
    if (createRes.data?.user) authUid = createRes.data.user.id
    else {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 } as any)
      authUid = list?.users.find(u => u.email === email)?.id ?? null
    }
    if (!authUid) return json({ error: 'auth_user_unavailable' }, 500)

    const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ').trim() || `User ${tgUser.id}`
    await admin.from('users').upsert({
      telegram_id: tgUser.id, auth_uid: authUid, name: fullName,
      username: tgUser.username ?? null, photo_url: tgUser.photo_url ?? null,
      last_active: new Date().toISOString(),
    }, { onConflict: 'telegram_id' })

    const { data: signed, error: signErr } = await admin.auth.signInWithPassword({ email, password })
    if (signErr || !signed.session) return json({ error: 'signin_failed' }, 500)

    return json({
      access_token: signed.session.access_token,
      refresh_token: signed.session.refresh_token,
      user: { telegram_id: tgUser.id, first_name: tgUser.first_name, last_name: tgUser.last_name, username: tgUser.username },
    })
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
