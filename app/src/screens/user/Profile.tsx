import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { PageHeader, Card } from '../../components/Shell'
import { LangSwitcher } from '../../components/LangSwitcher'
import { ShieldIcon, UsersIcon, SettingsIcon, ArrowIcon, FlameIcon, SendIcon } from '../../components/Icons'
import { Heatmap } from '../../components/Heatmap'
import { Ring } from '../../components/Ring'
import { CATEGORIES } from '../../data/questions'
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

  // real streak calc
  const streak = useMemo(() => {
    if (!attempts.length) return 0
    const days = new Set(attempts.map(a => new Date(a.startedAt).toISOString().slice(0, 10)))
    let n = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 0; ; i++) {
      const d = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10)
      if (days.has(d)) n++
      else break
    }
    return n
  }, [attempts])

  const heatmap = useMemo(() => {
    const days: { day: string; count: number }[] = []
    const map = new Map<string, number>()
    for (const a of attempts) {
      const k = new Date(a.startedAt).toISOString().slice(0, 10)
      map.set(k, (map.get(k) ?? 0) + 1)
    }
    for (let i = 89; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      days.push({ day: d, count: map.get(d) ?? 0 })
    }
    return { days, max: Math.max(1, ...Array.from(map.values())) }
  }, [attempts])

  const catPct = useMemo(() => {
    return CATEGORIES.map(cat => {
      const ua = attempts.filter(a => a.category === cat)
      const total = ua.reduce((s, a) => s + a.total, 0)
      const correct = ua.reduce((s, a) => s + a.score, 0)
      const pct = total ? Math.round((correct / total) * 100) : 0
      return { cat, pct, count: ua.length }
    }).filter(x => x.count > 0)
  }, [attempts])

  function shareToTelegram() {
    haptic('medium')
    const totalCorrect = attempts.reduce((s, a) => s + a.score, 0)
    const total = attempts.reduce((s, a) => s + a.total, 0)
    const pct = total ? Math.round((totalCorrect / total) * 100) : 0
    const url = (typeof window !== 'undefined' && window.location.origin) || 'https://shifokorat.vercel.app'
    const text = encodeURIComponent(`📊 Shifokorat — ${attempts.length} sinov · ${pct}% aniqlik · ${streak} kun ketma-ket`)
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`, '_blank')
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <PageHeader eyebrow={t('nav.profile')} title={tgUser?.first_name ?? '—'} right={<LangSwitcher />} />

      <div className="px-5 mt-2 paper-rise">
        <Card className="p-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[var(--ink)] text-[var(--paper)] grid place-items-center font-display text-3xl overflow-hidden shrink-0">
            {photoUrl ? <img src={photoUrl} alt="" className="w-full h-full object-cover" /> : tgUser?.first_name?.[0] ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--accent)]">{t(`role.${me?.role ?? 'user'}`)}</div>
            <div className="font-display text-2xl truncate">{tgUser?.first_name} {tgUser?.last_name ?? ''}</div>
            <div className="text-xs text-[var(--ink-soft)] font-mono">@{tgUser?.username ?? '—'} · ID {tgUser?.id}</div>
            {myGroup && <div className="text-xs text-[var(--ink-soft)] mt-1 italic font-display">{myGroup.name}</div>}
          </div>
          <button onClick={shareToTelegram} className="w-10 h-10 rounded-full border border-[var(--hairline)] grid place-items-center text-[var(--ink-soft)]" aria-label="share">
            <SendIcon className="w-4 h-4" />
          </button>
        </Card>
      </div>

      <div className="px-5 mt-4 grid grid-cols-3 gap-2">
        <StatCol label={t('home.streak')} value={streak} icon={<FlameIcon className="w-3 h-3" />} />
        <StatCol label={t('home.bestScore')} value={attempts.length ? Math.max(...attempts.map(a => Math.round(a.score / a.total * 100))) + '%' : '—'} />
        <StatCol label={t('home.accuracy')} value={attempts.length ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.reduce((s, a) => s + a.total, 0) * 100) + '%' : '—'} />
      </div>

      {/* HEATMAP */}
      {attempts.length > 0 && (
        <div className="px-5 mt-7">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-display text-[12px] tracking-[0.3em] text-[var(--ink-soft)]">I.</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">{t('profile.heatmap')}</span>
          </div>
          <Card className="p-4 overflow-x-auto">
            <Heatmap days={heatmap.days} max={heatmap.max} />
          </Card>
        </div>
      )}

      {/* PER-CATEGORY RINGS */}
      {catPct.length > 0 && (
        <div className="px-5 mt-7">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-display text-[12px] tracking-[0.3em] text-[var(--ink-soft)]">II.</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">{t('profile.byCategory')}</span>
          </div>
          <Card className="p-4">
            <div className="grid grid-cols-4 gap-3">
              {catPct.map(c => (
                <Ring key={c.cat} pct={c.pct} label={c.cat} color={c.pct >= 80 ? 'var(--accent)' : c.pct >= 50 ? 'var(--ink)' : 'var(--ink-soft)'} />
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="px-5 mt-7">
        <div className="flex items-center gap-3 mb-3">
          <SettingsIcon className="w-3.5 h-3.5" />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">{t('nav.settings')}</span>
        </div>
        <div className="space-y-2">
          <Card className="p-4 flex items-center justify-between">
            <span className="font-display text-base">{t('common.language')}</span>
            <LangSwitcher />
          </Card>
        </div>
      </div>

      {(me?.role === 'admin' || me?.role === 'superadmin') && (
        <div className="px-5 mt-7">
          <div className="flex items-center gap-3 mb-3">
            <ShieldIcon className="w-3.5 h-3.5 stroke-[var(--accent)]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">{t('role.switch')}</span>
          </div>
          <div className="space-y-2">
            {me.role === 'admin' && (
              <Card className="p-4 flex items-center gap-3" onClick={() => navigate('/admin')}>
                <UsersIcon className="w-5 h-5" />
                <span className="font-display text-base flex-1">{t('role.admin')}</span>
                <ArrowIcon className="w-4 h-4" />
              </Card>
            )}
            {me.role === 'superadmin' && (
              <>
                <Card className="p-4 flex items-center gap-3" onClick={() => navigate('/super')}>
                  <ShieldIcon className="w-5 h-5 stroke-[var(--accent)]" />
                  <span className="font-display text-base flex-1">{t('role.superadmin')}</span>
                  <ArrowIcon className="w-4 h-4" />
                </Card>
                <Card className="p-4 flex items-center gap-3" onClick={() => navigate('/admin')}>
                  <UsersIcon className="w-5 h-5" />
                  <span className="font-display text-base flex-1">{t('role.admin')}</span>
                  <ArrowIcon className="w-4 h-4" />
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      <div className="px-5 mt-8">
        <button
          onClick={() => navigate('/')}
          className="w-full rounded-2xl border border-[var(--hairline)] py-3 text-sm font-mono uppercase tracking-[0.18em] text-[var(--ink-soft)]"
        >
          {t('common.back')}
        </button>
      </div>
    </div>
  )
}

function StatCol({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--hairline)] bg-[var(--paper-2)] p-3">
      <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)] opacity-70 mb-1 flex items-center gap-1">
        {icon}{label}
      </div>
      <div className="font-display text-2xl numerals">{value}</div>
    </div>
  )
}
