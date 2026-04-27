// Telegram Bot webhook — handles incoming messages.
//
// Commands:
//   /start          — welcome + Mini App link
//   /start <token>  — deep-link login (from web flow)
//   /login          — generates a 6-digit code, replies with it
//   /score          — sends user's current stats
//   /help           — list commands
//   /lang <uz|ru|en>— change preferred language
//
// Required secrets:
//   TELEGRAM_BOT_TOKEN
//   TELEGRAM_WEBHOOK_SECRET   (used to verify X-Telegram-Bot-Api-Secret-Token)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { tgSend } from '../_shared/bot.ts'

type TgUser = { id: number; first_name: string; last_name?: string; username?: string; language_code?: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const expectedSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')
  const headerSecret = req.headers.get('x-telegram-bot-api-secret-token')
  if (expectedSecret && headerSecret !== expectedSecret) {
    return new Response('forbidden', { status: 403 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  let update: any
  try { update = await req.json() } catch { return new Response('bad json', { status: 400 }) }

  const msg = update.message ?? update.edited_message
  if (!msg) return ok()
  const chatId: number = msg.chat?.id
  const from: TgUser = msg.from
  const text: string = msg.text ?? ''
  if (!from || !chatId) return ok()

  // Upsert user row (best-effort)
  const fullName = [from.first_name, from.last_name].filter(Boolean).join(' ').trim() || `User ${from.id}`
  await admin.from('users').upsert({
    telegram_id: from.id,
    name: fullName,
    username: from.username ?? null,
    language: from.language_code ?? 'uz',
    last_active: new Date().toISOString(),
  }, { onConflict: 'telegram_id' })

  // Resolve preferred language
  const lang = await getLang(admin, from.id)

  // Routing
  if (text.startsWith('/start')) {
    const parts = text.split(/\s+/, 2)
    const param = parts[1]
    if (param) {
      // Deep-link auth: /start auth_<token>
      if (param.startsWith('auth_')) {
        const token = param.slice(5)
        const { data } = await admin.from('login_tokens').select('*').eq('token', token).single()
        if (!data) {
          await tgSend(botToken, chatId, t(lang, 'login_token_invalid'))
        } else if (new Date(data.expires_at) < new Date()) {
          await tgSend(botToken, chatId, t(lang, 'login_token_expired'))
        } else {
          await admin.from('login_tokens').update({ user_id: from.id, status: 'consumed' }).eq('token', token)
          await tgSend(botToken, chatId, t(lang, 'login_token_done'))
        }
        return ok()
      }
    }
    const url = await getMiniappUrl(admin)
    await tgSend(botToken, chatId, await welcome(admin, lang), {
      reply_markup: {
        inline_keyboard: [[{ text: t(lang, 'open_app'), url }]],
      },
    })
    return ok()
  }

  if (text === '/login') {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    await admin.from('login_tokens').insert({
      token: code,
      user_id: from.id,
      status: 'pending',
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })
    await tgSend(botToken, chatId, t(lang, 'login_code', { code }))
    return ok()
  }

  if (text === '/score' || text === '/stats') {
    const [{ data: streak }, { data: avg }, { data: total }] = await Promise.all([
      admin.rpc('user_streak', { uid: from.id }),
      admin.rpc('user_avg_pct', { uid: from.id }),
      admin.rpc('user_total_correct', { uid: from.id }),
    ])
    await tgSend(botToken, chatId, t(lang, 'score', {
      streak: streak ?? 0, avg: avg ?? 0, total: total ?? 0,
    }))
    return ok()
  }

  if (text === '/help') {
    await tgSend(botToken, chatId, t(lang, 'help'))
    return ok()
  }

  if (text.startsWith('/lang')) {
    const code = text.split(/\s+/, 2)[1]
    if (['uz', 'ru', 'en'].includes(code)) {
      await admin.from('users').update({ language: code }).eq('telegram_id', from.id)
      await tgSend(botToken, chatId, t(code as any, 'lang_set'))
    } else {
      await tgSend(botToken, chatId, t(lang, 'lang_usage'))
    }
    return ok()
  }

  // Default: nudge to open the Mini App
  const url = await getMiniappUrl(admin)
  await tgSend(botToken, chatId, t(lang, 'nudge'), {
    reply_markup: { inline_keyboard: [[{ text: t(lang, 'open_app'), url }]] },
  })
  return ok()
})

function ok() { return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'content-type': 'application/json' } }) }

async function getLang(admin: any, telegramId: number): Promise<'uz' | 'ru' | 'en'> {
  const { data } = await admin.from('users').select('language').eq('telegram_id', telegramId).single()
  const l = data?.language
  return l === 'ru' || l === 'en' ? l : 'uz'
}

async function getMiniappUrl(admin: any): Promise<string> {
  const { data } = await admin.from('bot_config').select('value').eq('key', 'miniapp_url').single()
  if (typeof data?.value === 'string') return data.value
  return 'https://shifokorat.vercel.app'
}

async function welcome(admin: any, lang: 'uz' | 'ru' | 'en'): Promise<string> {
  const { data } = await admin.from('bot_config').select('value').eq('key', `welcome_message_${lang}`).single()
  if (typeof data?.value === 'string') return data.value
  return t(lang, 'welcome')
}

const STRINGS: Record<string, Record<string, string>> = {
  uz: {
    welcome: 'Salom! Shifokoratga xush kelibsiz.\nBilim sinovini boshlash uchun ilovani oching.',
    open_app: '📚 Ilovani ochish',
    nudge: 'Sinovni boshlash uchun ilovani oching.',
    help: '<b>Buyruqlar</b>\n/start — boshlash\n/login — veb-tizimga kirish kodi\n/score — statistika\n/lang uz|ru|en — tilni almashtirish',
    login_code: '🔑 Sizning kirish kodingiz: <b>{code}</b>\n5 daqiqa amal qiladi.',
    login_token_invalid: '❌ Kod yaroqsiz.',
    login_token_expired: '⏰ Kod muddati tugadi. Yangi kod oling.',
    login_token_done: '✅ Kirildi! Brauzerga qayting.',
    score: '📊 Sizning natijangiz\nKetma-ket kunlar: <b>{streak}</b>\nO‘rtacha: <b>{avg}%</b>\nJami toʻgʻri: <b>{total}</b>',
    lang_set: '✅ Til o‘zgartirildi.',
    lang_usage: 'Foydalanish: /lang uz|ru|en',
  },
  ru: {
    welcome: 'Привет! Добро пожаловать в Шифокорат.\nОткройте приложение, чтобы начать тест.',
    open_app: '📚 Открыть приложение',
    nudge: 'Откройте приложение, чтобы начать.',
    help: '<b>Команды</b>\n/start — начать\n/login — код для веб-входа\n/score — статистика\n/lang uz|ru|en — сменить язык',
    login_code: '🔑 Ваш код: <b>{code}</b>\nДействителен 5 минут.',
    login_token_invalid: '❌ Неверный код.',
    login_token_expired: '⏰ Срок действия истёк.',
    login_token_done: '✅ Готово! Вернитесь в браузер.',
    score: '📊 Ваша статистика\nДней подряд: <b>{streak}</b>\nСредний: <b>{avg}%</b>\nВсего верных: <b>{total}</b>',
    lang_set: '✅ Язык изменён.',
    lang_usage: 'Использование: /lang uz|ru|en',
  },
  en: {
    welcome: 'Hi! Welcome to Shifokorat.\nOpen the Mini App to start a quiz.',
    open_app: '📚 Open app',
    nudge: 'Open the Mini App to start a quiz.',
    help: '<b>Commands</b>\n/start — begin\n/login — web login code\n/score — your stats\n/lang uz|ru|en — change language',
    login_code: '🔑 Your login code: <b>{code}</b>\nValid for 5 minutes.',
    login_token_invalid: '❌ Invalid code.',
    login_token_expired: '⏰ Code expired.',
    login_token_done: '✅ Signed in! Return to your browser.',
    score: '📊 Your stats\nStreak: <b>{streak}</b>\nAvg: <b>{avg}%</b>\nTotal correct: <b>{total}</b>',
    lang_set: '✅ Language changed.',
    lang_usage: 'Usage: /lang uz|ru|en',
  },
}

function t(lang: 'uz' | 'ru' | 'en', key: string, vars: Record<string, string | number> = {}): string {
  let s = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
  return s
}
