// Entry — clean intro + single Share CTA. Tapping share triggers the
// Telegram contact-share popup (or manual entry on web), then redirects
// straight to /u. Admin/super users auto-route based on their stored role.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

import { useStore, type Role } from '../store'
import { initTelegram, haptic, isTelegram } from '../lib/telegram'
import { Shell } from '../components/Shell'
import { LangSwitcher } from '../components/LangSwitcher'
import {
  ArrowIcon, BookIcon, ChartIcon, FlameIcon, PhoneIcon, SparkleIcon,
  CheckBadgeIcon, XIcon, ShieldIcon, UserIcon, UsersIcon,
} from '../components/Icons'
import {
  requestTelegramContact, manualPhoneAccept, fmtPhone, markCached, saveContactToDb, isCachedShared,
} from '../lib/phone'

const DEMO_USERS = [
  { id: 100001, role: 'superadmin' as Role, name: 'Asadbek K.', username: 'asadbek' },
  { id: 200001, role: 'admin' as Role, name: 'Dilnoza Y.', username: 'dilnoza_y' },
  { id: 300001, role: 'user' as Role, name: 'Madina I.', username: 'madinai' },
]

export default function Entry() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const setTgUser = useStore(s => s.setTgUser)
  const setPhone = useStore(s => s.setPhone)
  const tgUser = useStore(s => s.tgUser)
  const users = useStore(s => s.users)

  const [busy, setBusy] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [showDevPicker, setShowDevPicker] = useState(false)
  const [phoneVal, setPhoneVal] = useState('+998 ')

  // 1. Connect Telegram on mount
  useEffect(() => {
    const tg = initTelegram()
    if (tg?.initDataUnsafe?.user) setTgUser(tg.initDataUnsafe.user)
  }, [setTgUser])

  // 2. Auto-route when we recognize the user
  useEffect(() => {
    if (!tgUser) return
    const u = users.find(x => x.telegramId === tgUser.id)
    if (u?.role === 'superadmin') navigate('/super', { replace: true })
    else if (u?.role === 'admin') navigate('/admin', { replace: true })
    else if (u && (u.phone || isCachedShared(tgUser.id))) navigate('/u', { replace: true })
  }, [tgUser?.id, users, navigate])

  async function shareViaTelegram() {
    haptic('medium')
    setBusy(true)
    const r = await requestTelegramContact()
    setBusy(false)

    if (r.ok && r.via === 'telegram') {
      // Inside Telegram: bot receives the contact too; locally optimistic
      const phone = r.phone || ''
      if (tgUser) {
        if (phone) markCached(tgUser.id, phone)
        if (phone) setPhone(tgUser.id, phone)
        if (phone) saveContactToDb(tgUser.id, phone)
      }
      toast.success(t('phone.thanks'))
      navigate('/u', { replace: true })
    } else if (r.ok === false) {
      if (r.reason === 'unavailable') setShowManual(true)
      else if (r.reason === 'cancelled') toast(t('phone.cancelled'))
      else toast.error(t('phone.error'))
    }
  }

  function shareManual() {
    const r = manualPhoneAccept(phoneVal)
    if (r.ok && r.via === 'manual') {
      // Manual flow needs a tg id — fall through to demo regular user
      const tid = tgUser?.id ?? 300001
      setTgUser({
        id: tid,
        first_name: tgUser?.first_name ?? 'Demo',
        last_name: tgUser?.last_name,
        username: tgUser?.username ?? 'demo',
      })
      markCached(tid, r.phone)
      setPhone(tid, r.phone)
      saveContactToDb(tid, r.phone)
      toast.success(t('phone.thanks'))
      navigate('/u', { replace: true })
    } else {
      toast.error(t('phone.invalid'))
    }
  }

  function pickDemo(d: typeof DEMO_USERS[number]) {
    haptic('medium')
    setTgUser({
      id: d.id,
      first_name: d.name.split(' ')[0],
      last_name: d.name.split(' ').slice(1).join(' '),
      username: d.username,
    })
    if (d.role === 'superadmin') navigate('/super')
    else if (d.role === 'admin') navigate('/admin')
    else {
      markCached(d.id, '+998 99 999 99 99')
      setPhone(d.id, '+998 99 999 99 99')
      navigate('/u')
    }
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
          <div className="relative mx-auto mb-6 w-20 h-20 fade-up">
            <div className="absolute inset-0 rounded-3xl bg-[var(--accent)] opacity-25 blur-2xl" />
            <div className="relative w-full h-full rounded-3xl glass-strong grid place-items-center">
              <span className="font-display font-bold text-4xl italic text-[var(--accent)]">Sh</span>
            </div>
          </div>

          <h1 className="font-display font-bold text-[34px] leading-tight tracking-tight fade-up" style={{ animationDelay: '0.05s' }}>
            Shifokorat
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
              {/* Dev escape hatch — only in dev builds */}
              {import.meta.env.DEV && (
                <button
                  onClick={() => setShowDevPicker(true)}
                  className="mt-2 w-full text-[10px] uppercase tracking-[0.22em] font-mono text-[var(--text-dim)]"
                >
                  · dev: select role ·
                </button>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-[0.22em] font-mono text-[var(--text-muted)] text-center">
                {t('phone.enterManual')}
              </div>
              <input
                value={phoneVal}
                onChange={e => setPhoneVal(e.target.value)}
                inputMode="tel"
                placeholder="+998 95 123 45 67"
                className="w-full px-4 py-4 rounded-2xl glass border border-[var(--hairline-strong)] text-center font-mono text-base"
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

      {/* Dev role picker — bottom sheet */}
      <AnimatePresence>
        {showDevPicker && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-end bg-black/40"
            onClick={() => setShowDevPicker(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              className="w-full bg-[var(--bg)] glass-strong rounded-t-3xl pb-[max(env(safe-area-inset-bottom),24px)] pt-3"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-[var(--hairline-strong)] mx-auto mb-3" />
              <div className="px-5 pb-3 flex items-center justify-between">
                <h3 className="font-display font-bold text-lg">Dev · pick role</h3>
                <button onClick={() => setShowDevPicker(false)} className="w-9 h-9 rounded-full glass border border-[var(--hairline-strong)] grid place-items-center">
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="px-5 space-y-2">
                {DEMO_USERS.map(d => {
                  const Icon = d.role === 'superadmin' ? ShieldIcon : d.role === 'admin' ? UsersIcon : UserIcon
                  return (
                    <button
                      key={d.id}
                      onClick={() => pickDemo(d)}
                      className="w-full rounded-2xl glass border border-[var(--hairline-strong)] p-3 flex items-center gap-3 active:scale-[0.99]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] grid place-items-center text-[var(--accent)]">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="font-display font-bold text-sm">{t(`role.${d.role}`)}</div>
                        <div className="text-xs text-[var(--text-muted)] font-mono truncate">{d.name} · @{d.username}</div>
                      </div>
                      <ArrowIcon className="w-4 h-4 stroke-[var(--text-muted)]" />
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
