// Sends a broadcast via Telegram Bot API to all matching recipients,
// recording per-user delivery status.
//
// Body: { broadcast_id: string }   — must already exist in public.broadcasts
// Caller must be a super-admin (verified via JWT + RLS read on broadcasts).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { tgSend } from '../_shared/bot.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!
    const auth = req.headers.get('authorization') ?? ''
    if (!auth.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'unauthorized' }, 401)

    const { data: { user: meRow } } = await userClient.auth.getUser()
    if (!meRow) return json({ error: 'unauthorized' }, 401)

    // Verify super-admin
    const { data: meAppUser } = await userClient.from('users').select('role').eq('auth_uid', user.id).single()
    if (meAppUser?.role !== 'superadmin') return json({ error: 'forbidden' }, 403)

    const body = await req.json().catch(() => ({})) as { broadcast_id?: string }
    if (!body.broadcast_id) return json({ error: 'missing_broadcast_id' }, 400)

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    const { data: bc, error: bErr } = await admin.from('broadcasts').select('*').eq('id', body.broadcast_id).single()
    if (bErr || !bc) return json({ error: 'broadcast_not_found' }, 404)

    // Resolve recipients
    let q = admin.from('users').select('telegram_id').eq('blocked', false)
    if (bc.recipients === 'admins') q = q.in('role', ['admin', 'superadmin'])
    else if (bc.recipients === 'users') q = q.eq('role', 'user')
    const { data: recipients, error: rErr } = await q
    if (rErr) return json({ error: 'recipients_failed', detail: rErr.message }, 500)

    const text = `<b>${escapeHtml(bc.title)}</b>\n\n${escapeHtml(bc.body)}`

    let sent = 0, failed = 0
    for (const r of (recipients ?? [])) {
      const result = await tgSend(botToken, r.telegram_id, text)
      if (result.ok) {
        sent++
        await admin.from('broadcast_deliveries').insert({
          broadcast_id: bc.id, user_id: r.telegram_id, status: 'sent', sent_at: new Date().toISOString(),
        })
      } else {
        failed++
        const blocked = (result.description ?? '').toLowerCase().includes('blocked')
        await admin.from('broadcast_deliveries').insert({
          broadcast_id: bc.id, user_id: r.telegram_id,
          status: blocked ? 'blocked' : 'failed',
          error: result.description ?? null,
        })
      }
      // simple rate limit — Telegram allows ~30 msg/sec
      await new Promise(res => setTimeout(res, 40))
    }

    return json({ ok: true, sent, failed, total: (recipients ?? []).length }, 200)
  } catch (e) {
    return json({ error: 'internal', detail: String(e) }, 500)
  }
})

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}
