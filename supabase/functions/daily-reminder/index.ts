// Daily reminder: sends a nudge to users who haven't taken a quiz today.
// Trigger via pg_cron or external scheduler hitting this URL once per hour
// with header `X-Cron-Token: <secret>`. The function checks the configured
// reminder hour, and only fires once per local hour.
//
// Required secrets:
//   TELEGRAM_BOT_TOKEN
//   CRON_TOKEN

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { tgSend } from '../_shared/bot.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const cronToken = Deno.env.get('CRON_TOKEN') ?? ''
  if (req.headers.get('x-cron-token') !== cronToken) {
    return new Response('forbidden', { status: 403 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  // Read config
  const { data: cfg } = await admin.from('bot_config').select('key, value').in('key', ['daily_reminder_hour', 'daily_reminder_enabled'])
  const map = new Map<string, any>((cfg ?? []).map((r: any) => [r.key, r.value]))
  if (!map.get('daily_reminder_enabled')) return new Response(JSON.stringify({ skipped: 'disabled' }))
  const targetHour = Number(map.get('daily_reminder_hour') ?? 19)

  const now = new Date()
  if (now.getUTCHours() !== targetHour) {
    return new Response(JSON.stringify({ skipped: 'wrong_hour', utc_hour: now.getUTCHours(), target: targetHour }))
  }

  // Find users who:
  //  - role = user
  //  - not blocked
  //  - haven't done a quiz in the last 22 hours
  const cutoff = new Date(Date.now() - 22 * 3600 * 1000).toISOString()
  const { data: users } = await admin
    .from('users')
    .select('telegram_id, language, name')
    .eq('role', 'user')
    .eq('blocked', false)

  let sent = 0
  for (const u of (users ?? [])) {
    const { data: recent } = await admin
      .from('attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', u.telegram_id)
      .gte('started_at', cutoff)
    if ((recent as any)?.length > 0) continue

    const lang = ['uz', 'ru', 'en'].includes(u.language) ? u.language : 'uz'
    const text = REMINDER[lang as 'uz' | 'ru' | 'en'](u.name?.split(' ')[0] ?? '')
    const r = await tgSend(botToken, u.telegram_id, text)
    if (r.ok) sent++
    await new Promise(res => setTimeout(res, 40))
  }

  return new Response(JSON.stringify({ ok: true, sent, target_hour: targetHour }))
})

const REMINDER: Record<'uz' | 'ru' | 'en', (name: string) => string> = {
  uz: (n) => `Salom${n ? `, ${n}` : ''}! 📚\nBugun bitta sinov bajardingizmi? Bilim — har kuni bir qadam.\n\n/start — boshlash`,
  ru: (n) => `Привет${n ? `, ${n}` : ''}! 📚\nСделали сегодня тест? Знание — это шаг каждый день.\n\n/start — начать`,
  en: (n) => `Hi${n ? `, ${n}` : ''}! 📚\nDid you take a quiz today? Knowledge — one step every day.\n\n/start — begin`,
}
