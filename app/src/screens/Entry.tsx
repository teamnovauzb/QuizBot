// Entry — clean intro + single Share CTA. Tapping share triggers the
// Telegram contact-share popup (or manual entry on web), then redirects
// straight to /u. Admin/super users auto-route based on their stored role.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'

import { useStore } from '../store'
import { initTelegram, haptic, isTelegram } from '../lib/telegram'
import { Shell } from '../components/Shell'
import { LangSwitcher } from '../components/LangSwitcher'
import {
  ArrowIcon, BookIcon, ChartIcon, FlameIcon, PhoneIcon, SparkleIcon, CheckBadgeIcon,
} from '../components/Icons'
import {
  requestTelegramContact, manualPhoneAccept, fmtPhone, markCached, saveContactToDb, isCachedShared,
} from '../lib/phone'
import { supabase, SUPABASE_ENABLED } from '../lib/supabase'

export default function Entry() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const setTgUser = useStore(s => s.setTgUser)
  const setPhone = useStore(s => s.setPhone)
  const tgUser = useStore(s => s.tgUser)
  const users = useStore(s => s.users)

  const upsertUser = useStore(s => s.upsertUser)
  const [busy, setBusy] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [phoneVal, setPhoneVal] = useState('+998 ')
  const [nameVal, setNameVal] = useState('')

  const signedOut = useStore(s => s.signedOut)

  // 1. Connect Telegram on mount — but only if user hasn't explicitly logged out
  useEffect(() => {
    const tg = initTelegram()
    if (signedOut) return
    if (tg?.initDataUnsafe?.user) setTgUser(tg.initDataUnsafe.user)
  }, [setTgUser, signedOut])

  // 2. Auto-route when we recognize the user (skipped after explicit logout)
  useEffect(() => {
    if (!tgUser || signedOut) return
    const u = users.find(x => x.telegramId === tgUser.id)
    if (u?.role === 'superadmin') navigate('/super', { replace: true })
    else if (u?.role === 'admin') navigate('/admin', { replace: true })
    else if (u && (u.phone || isCachedShared(tgUser.id))) navigate('/u', { replace: true })
  }, [tgUser?.id, users, navigate, signedOut])

  async function shareViaTelegram() {
    haptic('medium')
    setBusy(true)
    const r = await requestTelegramContact()
    setBusy(false)

    if (!r.ok || r.via !== 'telegram') {
      if (r.ok === false) {
        if (r.reason === 'unavailable') setShowManual(true)
        else if (r.reason === 'cancelled') toast(t('phone.cancelled'))
        else toast.error(t('phone.error'))
      }
      return
    }

    // Tap-Share completed. Mark verified IMMEDIATELY — Telegram's contactRequested
    // event often arrives without a phone string (the actual number goes to the bot,
    // not the WebApp). The bot's webhook will persist the real phone server-side;
    // we backfill it from the DB in the background below.
    const optimisticPhone = r.phone || '+998…'
    if (tgUser) {
      markCached(tgUser.id, optimisticPhone)
      setPhone(tgUser.id, optimisticPhone)
      if (r.phone) saveContactToDb(tgUser.id, r.phone)
    }
    toast.success(t('phone.thanks'))
    navigate('/u', { replace: true })

    // Background: pull the real phone the bot just stored. Try a few times because
    // the bot webhook fires async; the DB row might be one Telegram round-trip behind.
    const sb = supabase
    if (SUPABASE_ENABLED && sb && tgUser) {
      const tid = tgUser.id
      let tries = 0
      const tick = async () => {
        tries++
        try {
          const { data } = await sb
            .from('users')
            .select('phone, phone_verified')
            .eq('telegram_id', tid)
            .maybeSingle()
          if (data?.phone) {
            markCached(tid, data.phone)
            setPhone(tid, data.phone)
            return
          }
        } catch { /* ignore */ }
        if (tries < 5) setTimeout(tick, 1200)
      }
      setTimeout(tick, 800)
    }
  }

  function shareManual() {
    const r = manualPhoneAccept(phoneVal)
    if (!r.ok || r.via !== 'manual') {
      toast.error(t('phone.invalid'))
      return
    }
    const trimmed = nameVal.trim()
    if (trimmed.length < 2) {
      toast.error(t('phone.nameRequired'))
      return
    }
    // Fresh manual user: random tg_id in 9xxxxxxx range, no clash with seed/demo users
    const tid = tgUser?.id ?? Math.floor(900_000_000 + Math.random() * 99_000_000)
    const parts = trimmed.split(/\s+/)
    const first = parts[0]
    const last = parts.slice(1).join(' ') || undefined
    const username = first.toLowerCase().replace(/[^a-z0-9_]/g, '') || `u${tid}`

    setTgUser({
      id: tid,
      first_name: first,
      last_name: last,
      username,
    })
    upsertUser({
      telegramId: tid,
      name: trimmed,
      username,
      role: 'user',
      joinedAt: Date.now(),
      lastActive: Date.now(),
      phone: r.phone,
      phoneVerified: true,
    })
    markCached(tid, r.phone)
    setPhone(tid, r.phone)
    saveContactToDb(tid, r.phone)
    toast.success(t('phone.thanks'))
    navigate('/u', { replace: true })
  }


  return (
    <Shell>
      <div className="min-h-[100svh] flex flex-col px-6 pt-[max(env(safe-area-inset-top),20px)] pb-[max(env(safe-area-inset-bottom),24px)]">
        {/* Top bar */}
        <div className="flex items-center justify-end mb-2">
          <LangSwitcher />
        </div>

        {/* Hero — vertically centered */}
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto w-full">
          <div className="relative mx-auto mb-6 w-24 h-24 fade-up">
            <div className="absolute inset-0 rounded-[28px] bg-[var(--accent)] opacity-30 blur-2xl" />
            <img src="/logo.svg" alt="Shifokor" className="relative w-full h-full drop-shadow-[0_8px_24px_rgba(93,229,168,0.35)]" />
          </div>

          <h1 className="font-display font-bold text-[36px] leading-tight tracking-tight fade-up" style={{ animationDelay: '0.05s' }}>
            Shifokor
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1.5 fade-up" style={{ animationDelay: '0.1s' }}>
            {t('app.tagline')}
          </p>

          {/* Feature trio */}
          <div className="mt-10 w-full space-y-2.5 fade-up" style={{ animationDelay: '0.15s' }}>
            <Feature icon={<BookIcon className="w-5 h-5" />} title={t('entry.f1.title')} desc={t('entry.f1.desc')} />
            <Feature icon={<FlameIcon className="w-5 h-5" />} title={t('entry.f2.title')} desc={t('entry.f2.desc')} />
            <Feature icon={<ChartIcon className="w-5 h-5" />} title={t('entry.f3.title')} desc={t('entry.f3.desc')} />
          </div>
        </div>

        {/* CTA — sticky bottom area */}
        <div className="mt-8 max-w-sm mx-auto w-full fade-up" style={{ animationDelay: '0.25s' }}>
          {!showManual ? (
            <>
              <button
                onClick={shareViaTelegram}
                disabled={busy}
                className="w-full rounded-2xl py-4 bg-[var(--accent)] text-[var(--bg)] font-display font-bold text-base flex items-center justify-center gap-2 active:scale-[0.99] shadow-[0_8px_32px_-8px_var(--accent-glow)] disabled:opacity-50"
              >
                <PhoneIcon className="w-5 h-5" />
                {busy ? '...' : t('entry.shareCta')}
                <ArrowIcon className="w-5 h-5" />
              </button>
              {!isTelegram() && (
                <button
                  onClick={() => setShowManual(true)}
                  className="mt-2.5 w-full text-xs text-[var(--text-muted)] underline-offset-2 hover:underline"
                >
                  {t('entry.manualLink')}
                </button>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-[0.22em] font-mono text-[var(--text-muted)] text-center">
                {t('phone.manualHint')}
              </div>
              <input
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                placeholder={t('phone.namePlaceholder')}
                className="w-full px-4 py-3.5 rounded-2xl glass border border-[var(--hairline-strong)] text-base"
                autoFocus
              />
              <input
                value={phoneVal}
                onChange={e => setPhoneVal(e.target.value)}
                inputMode="tel"
                placeholder="+998 95 123 45 67"
                className="w-full px-4 py-3.5 rounded-2xl glass border border-[var(--hairline-strong)] text-center font-mono text-base"
              />
              <div className="text-xs text-[var(--text-dim)] font-mono text-center">→ {fmtPhone(phoneVal)}</div>
              <button
                onClick={shareManual}
                className="w-full rounded-2xl py-4 bg-[var(--accent)] text-[var(--bg)] font-display font-bold text-base flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                <CheckBadgeIcon className="w-5 h-5" />
                {t('phone.confirm')}
              </button>
              <button
                onClick={() => setShowManual(false)}
                className="w-full text-xs text-[var(--text-muted)]"
              >
                ← {t('phone.back')}
              </button>
            </div>
          )}

          <div className="mt-4 text-center text-[10px] uppercase font-mono tracking-[0.3em] text-[var(--text-dim)]">
            v0.4 · {new Date().getFullYear()}
          </div>
        </div>
      </div>

    </Shell>
  )
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl glass border border-[var(--hairline)] p-3.5 flex items-center gap-3 text-left">
      <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] grid place-items-center text-[var(--accent)] shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-sm">{title}</div>
        <div className="text-xs text-[var(--text-muted)] truncate">{desc}</div>
      </div>
      <SparkleIcon className="w-3.5 h-3.5 stroke-[var(--accent)] opacity-60" />
    </div>
  )
}
