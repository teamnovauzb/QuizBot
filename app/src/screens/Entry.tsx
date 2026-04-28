// Simplified entry — just logo + 3 demo role tiles. Web/dev users tap a
// role to enter. Inside Telegram, users get auto-redirected via initData.

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore, type Role } from '../store'
import { initTelegram, haptic, isTelegram } from '../lib/telegram'
import { Shell } from '../components/Shell'
import { LangSwitcher } from '../components/LangSwitcher'
import { ShieldIcon, UserIcon, UsersIcon, ArrowIcon } from '../components/Icons'

const DEMO_USERS = [
  { id: 100001, role: 'superadmin' as Role, name: 'Asadbek K.', username: 'asadbek' },
  { id: 200001, role: 'admin' as Role, name: 'Dilnoza Y.', username: 'dilnoza_y' },
  { id: 300001, role: 'user' as Role, name: 'Madina I.', username: 'madinai' },
]

export default function Entry() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const setTgUser = useStore(s => s.setTgUser)
  const tgUser = useStore(s => s.tgUser)
  const users = useStore(s => s.users)

  // If inside actual Telegram, the WebApp gives us the user — auto-route.
  useEffect(() => {
    const tg = initTelegram()
    if (tg?.initDataUnsafe?.user) {
      setTgUser(tg.initDataUnsafe.user)
    }
  }, [setTgUser])

  useEffect(() => {
    if (!tgUser || !isTelegram()) return
    const u = users.find(x => x.telegramId === tgUser.id)
    if (u?.role === 'superadmin') navigate('/super', { replace: true })
    else if (u?.role === 'admin') navigate('/admin', { replace: true })
    else navigate('/u', { replace: true })
  }, [tgUser?.id, users, navigate])

  function pick(id: number) {
    haptic('medium')
    const u = users.find(u => u.telegramId === id)
    if (!u) return
    setTgUser({ id: u.telegramId, first_name: u.name.split(' ')[0], last_name: u.name.split(' ').slice(1).join(' '), username: u.username })
    if (u.role === 'superadmin') navigate('/super')
    else if (u.role === 'admin') navigate('/admin')
    else navigate('/u')
  }

  return (
    <Shell>
      <div className="px-6 pt-[max(env(safe-area-inset-top),28px)] pb-12">
        {/* Top bar */}
        <div className="flex items-center justify-end mb-10">
          <LangSwitcher />
        </div>

        {/* Hero */}
        <div className="text-center max-w-sm mx-auto mb-12 fade-up">
          <div className="relative mx-auto mb-6 w-20 h-20">
            <div className="absolute inset-0 rounded-3xl bg-[var(--accent)] opacity-25 blur-2xl" />
            <div className="relative w-full h-full rounded-3xl glass-strong grid place-items-center">
              <span className="font-display font-bold text-4xl italic text-[var(--accent)]">Sh</span>
            </div>
          </div>
          <h1 className="font-display font-bold text-[34px] leading-tight tracking-tight">Shifokorat</h1>
          <p className="text-[var(--text-muted)] text-sm mt-2">{t('app.tagline')}</p>
        </div>

        {/* Tg user shortcut */}
        {tgUser && (
          <div className="max-w-sm mx-auto mb-4 fade-up" style={{ animationDelay: '0.05s' }}>
            <button
              onClick={() => {
                const u = users.find(x => x.telegramId === tgUser.id)
                if (u?.role === 'superadmin') navigate('/super')
                else if (u?.role === 'admin') navigate('/admin')
                else navigate('/u')
              }}
              className="w-full rounded-2xl bg-[var(--accent)] text-[var(--bg)] p-4 flex items-center gap-3 active:scale-[0.99] shadow-[0_8px_24px_-8px_var(--accent-glow)]"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--bg)]/20 grid place-items-center font-display text-xl font-bold">
                {tgUser.first_name?.[0] ?? 'U'}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="font-display font-bold text-base truncate">{tgUser.first_name} {tgUser.last_name ?? ''}</div>
                {tgUser.username && <div className="text-xs opacity-70">@{tgUser.username}</div>}
              </div>
              <ArrowIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Demo role tiles */}
        <div className="max-w-sm mx-auto space-y-2.5">
          <div className="text-[10px] uppercase tracking-[0.22em] font-mono text-[var(--text-muted)] mb-2 text-center">
            {t('role.select')}
          </div>
          {DEMO_USERS.map((d, i) => {
            const Icon = d.role === 'superadmin' ? ShieldIcon : d.role === 'admin' ? UsersIcon : UserIcon
            return (
              <button
                key={d.id}
                onClick={() => pick(d.id)}
                className="w-full rounded-2xl glass border border-[var(--hairline-strong)] p-4 flex items-center gap-3 active:scale-[0.99] transition-transform fade-up"
                style={{ animationDelay: `${0.1 + i * 0.05}s` }}
              >
                <div className="w-11 h-11 rounded-xl bg-[var(--accent-soft)] grid place-items-center text-[var(--accent)] shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-display font-bold text-base">{t(`role.${d.role}`)}</div>
                  <div className="text-xs text-[var(--text-muted)] font-mono truncate">{d.name} · @{d.username}</div>
                </div>
                <ArrowIcon className="w-5 h-5 stroke-[var(--text-muted)]" />
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-[10px] uppercase font-mono tracking-[0.3em] text-[var(--text-dim)]">
          v0.3 · 2026
        </div>
      </div>
    </Shell>
  )
}
