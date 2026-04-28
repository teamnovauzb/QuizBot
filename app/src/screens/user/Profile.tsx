import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useStore } from '../../store'
import { Card } from '../../components/Shell'
import { LangSwitcher } from '../../components/LangSwitcher'
import { ThemeToggle } from '../../components/ThemeToggle'
import { PhoneShareCard } from '../../components/PhoneShare'
import {
  ShieldIcon, UsersIcon, ArrowIcon, SendIcon, PhoneIcon, IdIcon, CheckBadgeIcon,
  FlameIcon, SettingsIcon, LogoutIcon,
} from '../../components/Icons'
import { Heatmap } from '../../components/Heatmap'
import { Ring } from '../../components/Ring'
import { CATEGORIES } from '../../data/questions'
import { fmtPhone } from '../../lib/phone'
import { haptic } from '../../lib/telegram'

export default function Profile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const tgUser = useStore(s => s.tgUser)
  const users = useStore(s => s.users)
  const me = useMemo(() => users.find(u => u.telegramId === tgUser?.id), [users, tgUser?.id])
  const _attemptsRaw = useStore(s => s.attempts)
  const attempts = useMemo(() => _attemptsRaw.filter(a => a.userId === tgUser?.id), [_attemptsRaw, tgUser?.id])
  const groups = useStore(s => s.groups)
  const myGroup = groups.find(g => g.id === me?.groupId)
  const photoUrl = (tgUser as any)?.photo_url as string | undefined

  const streak = useMemo(() => {
    if (!attempts.length) return 0
    const days = new Set(attempts.map(a => new Date(a.startedAt).toISOString().slice(0, 10)))
    let n = 0
    const today = new Date(); today.setHours(0, 0, 0, 0)
    for (let i = 0; ; i++) {
      const d = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10)
      if (days.has(d)) n++; else break
    }
    return n
  }, [attempts])

  const heatmap = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of attempts) {
      const k = new Date(a.startedAt).toISOString().slice(0, 10)
      map.set(k, (map.get(k) ?? 0) + 1)
    }
    const days: { day: string; count: number }[] = []
    for (let i = 89; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      days.push({ day: d, count: map.get(d) ?? 0 })
    }
    return { days, max: Math.max(1, ...Array.from(map.values())) }
  }, [attempts])

  const catPct = useMemo(() => CATEGORIES.map(cat => {
    const ua = attempts.filter(a => a.category === cat)
    const total = ua.reduce((s, a) => s + a.total, 0)
    const correct = ua.reduce((s, a) => s + a.score, 0)
    const pct = total ? Math.round((correct / total) * 100) : 0
    return { cat, pct, count: ua.length }
  }).filter(x => x.count > 0), [attempts])

  const totalCorrect = attempts.reduce((s, a) => s + a.score, 0)
  const total = attempts.reduce((s, a) => s + a.total, 0)
  const avgPct = total ? Math.round((totalCorrect / total) * 100) : 0

  function shareToTelegram() {
    haptic('medium')
    const text = encodeURIComponent(`📊 Shifokorat — ${attempts.length} sinov · ${avgPct}% aniqlik · ${streak} kun ketma-ket`)
    const url = (typeof window !== 'undefined' && window.location.origin) || 'https://shifokorat.vercel.app'
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`, '_blank')
  }

  return (
    <div className="pb-28">
      {/* HERO with radial mint glow */}
      <div className="relative px-5 pt-[max(env(safe-area-inset-top),24px)] pb-32">
        <div className="absolute inset-x-0 top-0 h-[280px] -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent-soft)] via-transparent to-transparent" />
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[var(--accent)] opacity-15 blur-[120px]" />
        </div>

        <div className="flex items-center justify-end mb-2">
          <LangSwitcher />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 22, stiffness: 220, delay: 0.05 }}
          className="flex flex-col items-center gap-3 mt-2"
        >
          <div className="relative">
            <div className="w-32 h-32 rounded-full glass-strong overflow-hidden grid place-items-center text-5xl font-display font-bold text-[var(--text)]">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{tgUser?.first_name?.[0] ?? '?'}</span>
              )}
            </div>
            {me?.phoneVerified && (
              <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-[var(--accent)] grid place-items-center border-4 border-[var(--bg)]">
                <CheckBadgeIcon className="w-4 h-4 stroke-[var(--bg)]" />
              </div>
            )}
          </div>
          <div className="text-center">
            <h1 className="font-display font-bold text-3xl tracking-tight">
              {tgUser?.first_name ?? '—'} {tgUser?.last_name ?? ''}
            </h1>
            <div className="text-[var(--accent)] font-medium mt-0.5">@{tgUser?.username ?? me?.username ?? '—'}</div>
          </div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] font-mono text-[var(--text-muted)]">
            <span>{t(`role.${me?.role ?? 'user'}`)}</span>
            {myGroup && (<><span>·</span><span>{myGroup.name}</span></>)}
          </div>
        </motion.div>
      </div>

      {/* CONTENT — overlapping cards on the hero */}
      <div className="-mt-24 px-5 space-y-4 pb-28 relative z-10">
        {/* Phone share — only when not yet verified */}
        <PhoneShareCard />

        {/* Identity / contact card */}
        <Card className="p-4 fade-up">
          <InfoRow icon={<PhoneIcon className="w-5 h-5" />} label={t('profile.phone')}
            value={me?.phone ? fmtPhone(me.phone) : t('profile.notSet')}
            verified={me?.phoneVerified} />
          <Divider />
          <InfoRow icon={<IdIcon className="w-5 h-5" />} label={t('profile.tgId')}
            value={String(tgUser?.id ?? '—')} mono />
          <Divider />
          <InfoRow icon={<CheckBadgeIcon className="w-5 h-5" />} label={t('profile.status')}
            value={me?.phoneVerified ? t('profile.verified') : t('profile.unverified')}
            valueColor={me?.phoneVerified ? 'accent' : 'muted'} />
        </Card>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 fade-up" style={{ animationDelay: '0.05s' }}>
          <StatTile label={t('home.streak')} value={streak} icon={<FlameIcon className="w-3.5 h-3.5 stroke-[var(--accent)]" />} />
          <StatTile label={t('home.accuracy')} value={attempts.length ? avgPct + '%' : '—'} />
          <StatTile label={t('home.completed')} value={attempts.length} />
        </div>

        {/* Activity heatmap */}
        {attempts.length > 0 && (
          <div className="fade-up" style={{ animationDelay: '0.1s' }}>
            <SectionLabel>{t('profile.heatmap')}</SectionLabel>
            <Card className="p-4 overflow-x-auto"><Heatmap days={heatmap.days} max={heatmap.max} /></Card>
          </div>
        )}

        {/* Category mastery */}
        {catPct.length > 0 && (
          <div className="fade-up" style={{ animationDelay: '0.15s' }}>
            <SectionLabel>{t('profile.byCategory')}</SectionLabel>
            <Card className="p-4">
              <div className="grid grid-cols-4 gap-3">
                {catPct.map(c => (
                  <Ring key={c.cat} pct={c.pct} label={c.cat} color="var(--accent)" />
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* SETTINGS — matches the screenshot */}
        <div className="fade-up" style={{ animationDelay: '0.2s' }}>
          <SectionLabel>{t('nav.settings')}</SectionLabel>
          <Card className="p-5 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <SettingsIcon className="w-4 h-4 stroke-[var(--text-muted)]" />
                <span className="font-display font-semibold text-base">{t('common.theme')}</span>
              </div>
              <ThemeToggle />
            </div>

            <Divider />

            <div>
              <div className="flex items-center gap-2 mb-3">
                <SendIcon className="w-4 h-4 stroke-[var(--text-muted)]" />
                <span className="font-display font-semibold text-base">{t('common.language')}</span>
              </div>
              <LangSwitcher />
            </div>
          </Card>
        </div>

        {/* Role switcher */}
        {(me?.role === 'admin' || me?.role === 'superadmin') && (
          <div className="fade-up" style={{ animationDelay: '0.25s' }}>
            <SectionLabel>{t('role.switch')}</SectionLabel>
            <div className="space-y-2">
              {me.role === 'admin' && (
                <Card className="p-4 flex items-center gap-3" onClick={() => navigate('/admin')}>
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] grid place-items-center"><UsersIcon className="w-5 h-5 stroke-[var(--accent)]" /></div>
                  <span className="font-display font-semibold flex-1">{t('role.admin')}</span>
                  <ArrowIcon className="w-4 h-4 stroke-[var(--text-muted)]" />
                </Card>
              )}
              {me.role === 'superadmin' && (
                <>
                  <Card className="p-4 flex items-center gap-3" onClick={() => navigate('/super')}>
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] grid place-items-center"><ShieldIcon className="w-5 h-5 stroke-[var(--accent)]" /></div>
                    <span className="font-display font-semibold flex-1">{t('role.superadmin')}</span>
                    <ArrowIcon className="w-4 h-4 stroke-[var(--text-muted)]" />
                  </Card>
                  <Card className="p-4 flex items-center gap-3" onClick={() => navigate('/admin')}>
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] grid place-items-center"><UsersIcon className="w-5 h-5 stroke-[var(--accent)]" /></div>
                    <span className="font-display font-semibold flex-1">{t('role.admin')}</span>
                    <ArrowIcon className="w-4 h-4 stroke-[var(--text-muted)]" />
                  </Card>
                </>
              )}
            </div>
          </div>
        )}

        {/* Share + Sign out */}
        <div className="fade-up grid grid-cols-2 gap-2" style={{ animationDelay: '0.3s' }}>
          <button onClick={shareToTelegram} className="rounded-2xl py-3.5 glass border border-[var(--hairline-strong)] text-sm font-display font-semibold flex items-center justify-center gap-2 active:scale-[0.99]">
            <SendIcon className="w-4 h-4" /> {t('profile.share')}
          </button>
          <button onClick={() => navigate('/')} className="rounded-2xl py-3.5 glass border border-[var(--hairline-strong)] text-sm font-display font-semibold text-[var(--text-muted)] flex items-center justify-center gap-2 active:scale-[0.99]">
            <LogoutIcon className="w-4 h-4" /> {t('profile.signOut')}
          </button>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value, mono, verified, valueColor }: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
  verified?: boolean
  valueColor?: 'accent' | 'muted'
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-11 h-11 rounded-xl bg-[var(--accent-soft)] grid place-items-center text-[var(--accent)] shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[var(--text-muted)]">{label}</div>
        <div className={
          'font-display font-semibold text-base mt-0.5 truncate ' +
          (valueColor === 'accent' ? 'text-[var(--accent)]' : valueColor === 'muted' ? 'text-[var(--text-muted)]' : '') +
          (mono ? ' font-mono' : '')
        }>{value}</div>
      </div>
      {verified && <CheckBadgeIcon className="w-4 h-4 stroke-[var(--accent)]" />}
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-[var(--hairline)]" />
}

function StatTile({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-mono text-[var(--text-muted)] mb-1">
        {icon}<span>{label}</span>
      </div>
      <div className="font-display font-bold text-2xl tabular">{value}</div>
    </Card>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-1 pb-2 text-[10px] uppercase tracking-[0.22em] font-mono text-[var(--text-muted)]">
      {children}
    </div>
  )
}
