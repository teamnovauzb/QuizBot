import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { PageHeader, Card } from '../../components/Shell'
import { LangSwitcher } from '../../components/LangSwitcher'
import { FlameIcon, UsersIcon, QuestionIcon, ChartIcon } from '../../components/Icons'
import { relTime } from '../../lib/time'

export default function AdminOverview() {
  const { t } = useTranslation()
  const tgUser = useStore(s => s.tgUser)
  const users = useStore(s => s.users)
  const questions = useStore(s => s.questions)
  const attempts = useStore(s => s.attempts)
  const groups = useStore(s => s.groups)

  const myGroup = useMemo(() => groups.find(g => g.adminId === tgUser?.id), [groups, tgUser?.id])
  const myUsers = useMemo(() =>
    myGroup ? users.filter(u => myGroup.memberIds.includes(u.telegramId)) : users.filter(u => u.role === 'user'),
    [users, myGroup]
  )

  const myAttempts = useMemo(() =>
    myUsers.length ? attempts.filter(a => myUsers.some(u => u.telegramId === a.userId)) : attempts,
    [attempts, myUsers]
  )

  const avg = myAttempts.length
    ? Math.round(myAttempts.reduce((s, a) => s + (a.score / a.total) * 100, 0) / myAttempts.length)
    : 0

  // Trend data (last 7 days)
  const trend = useMemo(() => {
    const days: { day: string; v: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const start = Date.now() - i * 86400000
      const dayStart = new Date(start); dayStart.setHours(0,0,0,0)
      const dayEnd = new Date(start); dayEnd.setHours(23,59,59,999)
      const list = myAttempts.filter(a => a.startedAt >= dayStart.getTime() && a.startedAt <= dayEnd.getTime())
      const v = list.length ? list.reduce((s, a) => s + (a.score / a.total) * 100, 0) / list.length : 0
      days.push({ day: dayStart.toLocaleDateString(undefined, { weekday: 'short' }), v: Math.round(v) })
    }
    return days
  }, [myAttempts])

  return (
    <div className="pb-32">
      <PageHeader
        eyebrow={`${t('role.admin').toUpperCase()} · ${myGroup?.name ?? t('common.all')}`}
        title={t('admin.overview')}
        right={<LangSwitcher />}
      />

      <div className="px-5 mt-2 grid grid-cols-2 gap-3">
        <BigStat icon={<UsersIcon />} label={t('admin.activeUsers')} value={myUsers.length} accent />
        <BigStat icon={<QuestionIcon />} label={t('admin.totalQuestions')} value={questions.length} />
        <BigStat icon={<ChartIcon />} label={t('admin.avgScore')} value={`${avg}%`} />
        <BigStat icon={<FlameIcon />} label={t('home.completed')} value={myAttempts.length} />
      </div>

      {/* Trend */}
      <div className="px-5 mt-7">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-display text-[12px] tracking-[0.3em] text-[var(--ink-soft)]">I.</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">7-day trend</span>
        </div>
        <Card className="p-5 relative overflow-hidden">
          <div className="flex items-end gap-2 h-32">
            {trend.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 justify-end">
                <div className="w-full bg-[var(--accent)] rounded-t-md relative" style={{ height: `${d.v}%`, minHeight: '4px' }}>
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[9px] text-[var(--ink-soft)]">{d.v || ''}</div>
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--ink-soft)] opacity-70">{d.day}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent attempts table */}
      <div className="px-5 mt-7">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-display text-[12px] tracking-[0.3em] text-[var(--ink-soft)]">II.</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">{t('home.recent')}</span>
        </div>
        <Card className="overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2 text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)] opacity-70 bg-[var(--paper)]">
            <div className="col-span-5">{t('admin.user')}</div>
            <div className="col-span-3">{t('home.questions')}</div>
            <div className="col-span-2 text-right">{t('admin.score')}</div>
            <div className="col-span-2 text-right">{t('admin.lastActive')}</div>
          </div>
          {myAttempts.slice(0, 8).map(a => {
            const u = users.find(u => u.telegramId === a.userId)
            const pct = Math.round((a.score / a.total) * 100)
            return (
              <div key={a.id} className="grid grid-cols-12 px-4 py-3 border-t border-[var(--hairline)] items-center">
                <div className="col-span-5 truncate">
                  <div className="font-display text-sm truncate">{u?.name ?? '—'}</div>
                  <div className="text-[10px] font-mono opacity-60">@{u?.username ?? '—'}</div>
                </div>
                <div className="col-span-3 text-xs font-mono">{a.score}/{a.total}</div>
                <div className="col-span-2 text-right">
                  <span className={
                    'font-display text-base numerals ' +
                    (pct >= 70 ? 'text-[var(--ink)]' : pct >= 40 ? 'text-[var(--accent)]' : 'text-[var(--ink-soft)]')
                  }>{pct}%</span>
                </div>
                <div className="col-span-2 text-right text-[10px] font-mono opacity-60">{relTime(a.startedAt, t)}</div>
              </div>
            )
          })}
          {myAttempts.length === 0 && (
            <div className="px-4 py-8 text-center text-sm font-display italic text-[var(--ink-soft)]">{t('common.empty')}</div>
          )}
        </Card>
      </div>
    </div>
  )
}

function BigStat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={
      'rounded-2xl p-4 border ' +
      (accent ? 'bg-[var(--ink)] text-[var(--paper)] border-transparent' : 'bg-[var(--paper-2)] border-[var(--hairline)]')
    }>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase font-mono tracking-[0.18em] opacity-70">{label}</span>
        <span className="w-3.5 h-3.5 opacity-60">{icon}</span>
      </div>
      <div className="font-display font-bold text-[26px] leading-none tabular">{value}</div>
    </div>
  )
}
