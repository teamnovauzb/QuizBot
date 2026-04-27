import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore, type Role } from '../store'
import { initTelegram, haptic } from '../lib/telegram'
import { Shell } from '../components/Shell'
import { LangSwitcher } from '../components/LangSwitcher'
import { ShieldIcon, UserIcon, UsersIcon, ArrowIcon, SparkleIcon } from '../components/Icons'
import { signInWithTelegram } from '../lib/auth'
import { SUPABASE_ENABLED } from '../lib/supabase'
import { TelegramCodeLogin, TelegramLoginWidget } from '../components/TelegramLogin'

const DEMO_USERS = [
  { id: 100001, role: 'superadmin' as Role, name: 'Asadbek K.', tag: '@asadbek', sub: 'Bosh admin' },
  { id: 200001, role: 'admin' as Role, name: 'Dilnoza Y.', tag: '@dilnoza_y', sub: 'Guruh 101' },
  { id: 300001, role: 'user' as Role, name: 'Madina I.', tag: '@madinai', sub: 'Talaba' },
]

export default function Entry() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const setTgUser = useStore(s => s.setTgUser)
  const tgUser = useStore(s => s.tgUser)
  const users = useStore(s => s.users)
  const syncing = useStore(s => s.syncing)
  const syncError = useStore(s => s.syncError)
  const hydrated = useStore(s => s.hydrated)

  const [authStatus, setAuthStatus] = useState<'idle' | 'signing-in' | 'signed-in' | 'failed'>('idle')
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const tg = initTelegram()
    if (tg?.initDataUnsafe?.user) {
      setTgUser(tg.initDataUnsafe.user)
      // If running inside Telegram and Supabase is configured, auth automatically.
      if (SUPABASE_ENABLED && tg.initData) {
        setAuthStatus('signing-in')
        signInWithTelegram().then(r => {
          if (r.ok) setAuthStatus('signed-in')
          else { setAuthStatus('failed'); setAuthError(r.reason ?? 'unknown') }
        })
      }
    }
  }, [setTgUser])

  async function pick(id: number) {
    haptic('medium')
    const u = users.find(u => u.telegramId === id)!
    setTgUser({ id: u.telegramId, first_name: u.name.split(' ')[0], last_name: u.name.split(' ').slice(1).join(' '), username: u.username })

    // dev-mode auth (only works if edge function has ALLOW_DEV_LOGIN=true)
    if (SUPABASE_ENABLED) {
      setAuthStatus('signing-in')
      const r = await signInWithTelegram(u.telegramId, u.name)
      if (r.ok) setAuthStatus('signed-in')
      else { setAuthStatus('failed'); setAuthError(r.reason ?? 'unknown') }
    }

    if (u.role === 'superadmin') navigate('/super')
    else if (u.role === 'admin') navigate('/admin')
    else navigate('/u')
  }

  function continueAsTg() {
    if (!tgUser) return
    const u = users.find(u => u.telegramId === tgUser.id)
    haptic('medium')
    if (u?.role === 'superadmin') navigate('/super')
    else if (u?.role === 'admin') navigate('/admin')
    else navigate('/u')
  }

  return (
    <Shell className="px-0">
      {/* HERO */}
      <div className="relative px-5 pt-[max(env(safe-area-inset-top),16px)] pb-6 paper-rise">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--ink-soft)] opacity-70">№ 001</span>
          </div>
          <LangSwitcher />
        </div>

        <div className="flex items-baseline gap-3 mb-2">
          <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-[var(--accent)]">— {t('app.tagline')}</span>
        </div>
        <h1 className="font-display text-[clamp(56px,15vw,84px)] leading-[0.86] tracking-[-0.02em] text-[var(--ink)]">
          Shifokorat
          <span className="block italic text-[var(--accent)]">savol-javob</span>
        </h1>
        <p className="mt-5 max-w-[28ch] text-[15px] leading-relaxed text-[var(--ink-soft)]">
          {t('home.motto')}. {t('home.welcome')} —{' '}
          <span className="font-display italic">102 savol</span>, 9 bo‘lim, 3 til.
        </p>

        {/* Backend status badge */}
        <div className="mt-4 inline-flex items-center gap-2">
          <span className={
            'w-1.5 h-1.5 rounded-full ' + (
              !SUPABASE_ENABLED ? 'bg-[var(--ink-soft)] opacity-40' :
              authStatus === 'signed-in' && hydrated ? 'bg-[#4ADE80]' :
              authStatus === 'failed' ? 'bg-[#F87171]' :
              'bg-[var(--accent)] animate-pulse'
            )
          } />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)] opacity-70">
            {!SUPABASE_ENABLED && 'offline · localStorage'}
            {SUPABASE_ENABLED && authStatus === 'idle' && 'supabase · ready'}
            {SUPABASE_ENABLED && authStatus === 'signing-in' && 'supabase · signing in...'}
            {SUPABASE_ENABLED && authStatus === 'signed-in' && (syncing ? 'supabase · syncing...' : hydrated ? 'supabase · live' : 'supabase · authed')}
            {SUPABASE_ENABLED && authStatus === 'failed' && `supabase · ${authError}`}
            {SUPABASE_ENABLED && syncError && ` · ${syncError.slice(0, 24)}`}
          </span>
        </div>
      </div>

      {/* HAIRLINE WITH ROMAN NUMERAL */}
      <div className="flex items-center gap-4 px-5">
        <span className="font-display text-[12px] tracking-[0.3em] text-[var(--ink-soft)]">I.</span>
        <div className="flex-1 h-px bg-[var(--hairline)]" />
        <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--ink-soft)] opacity-70">{t('role.select')}</span>
      </div>

      {/* TG USER (if connected) */}
      {tgUser && (
        <div className="px-5 mt-5">
          <button
            onClick={continueAsTg}
            className="w-full text-left rounded-2xl bg-[var(--ink)] text-[var(--paper)] p-5 flex items-center gap-4 active:scale-[0.99] transition-transform"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] grid place-items-center font-display text-2xl">
              {tgUser.first_name?.[0] ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-[0.18em] font-mono opacity-60">Telegram</div>
              <div className="font-display text-2xl truncate">{tgUser.first_name} {tgUser.last_name ?? ''}</div>
              {tgUser.username && <div className="text-xs opacity-70 font-mono">@{tgUser.username}</div>}
            </div>
            <span className="w-9 h-9 rounded-full bg-[var(--accent)] grid place-items-center">
              <ArrowIcon className="w-4 h-4 stroke-[var(--ink)]" />
            </span>
          </button>
        </div>
      )}

      {/* WEB LOGIN — for outside Telegram */}
      {SUPABASE_ENABLED && !tgUser && (
        <div className="px-5 mt-5 space-y-3 paper-rise">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--ink-soft)] opacity-70">{t('login.title')}</span>
            <SparkleIcon className="w-3 h-3 stroke-[var(--accent)]" />
          </div>
          <TelegramLoginWidget />
          <TelegramCodeLogin />
        </div>
      )}

      {/* DEMO ROLES — for development without Telegram */}
      <div className="px-5 mt-6 flex-1 ink-bleed">
        <div className="flex items-center gap-3 mb-4">
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--ink-soft)] opacity-70">Demo · select preview</span>
          <SparkleIcon className="w-3 h-3 stroke-[var(--accent)]" />
        </div>

        <ul className="flex flex-col gap-2">
          {DEMO_USERS.map((d, i) => {
            const Icon = d.role === 'superadmin' ? ShieldIcon : d.role === 'admin' ? UsersIcon : UserIcon
            return (
              <li key={d.id}>
                <button
                  onClick={() => pick(d.id)}
                  className="w-full group relative overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--paper-2)] p-4 flex items-center gap-4 text-left active:scale-[0.99] transition-transform paper-rise"
                  style={{ animationDelay: `${0.05 * i + 0.1}s` }}
                >
                  <div className="font-display text-[44px] leading-none w-10 text-center text-[var(--ink-soft)] opacity-30 numerals">
                    {(i + 1).toString().padStart(2, '0')}
                  </div>
                  <div className="w-10 h-10 rounded-xl border border-[var(--hairline)] grid place-items-center text-[var(--ink-soft)]">
                    <Icon className="w-5 h-5 stroke-current" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.18em] font-mono text-[var(--accent)]">{t(`role.${d.role}`)}</div>
                    <div className="font-display text-xl truncate">{d.name}</div>
                    <div className="text-xs text-[var(--ink-soft)] opacity-70 font-mono">{d.tag} · {d.sub}</div>
                  </div>
                  <ArrowIcon className="w-5 h-5 stroke-[var(--ink-soft)] group-hover:stroke-[var(--accent)] transition-colors" />
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* FOOTER */}
      <footer className="px-5 pt-6 pb-[max(env(safe-area-inset-bottom),20px)] flex items-center justify-between text-[10px] uppercase font-mono tracking-[0.22em] text-[var(--ink-soft)] opacity-60">
        <span>EST. 2026</span>
        <span>v0.2 · BETA</span>
      </footer>
    </Shell>
  )
}
