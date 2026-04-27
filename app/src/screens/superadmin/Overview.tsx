import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { PageHeader, Card } from '../../components/Shell'
import { LangSwitcher } from '../../components/LangSwitcher'
import { ShieldIcon, QuestionIcon, ChartIcon, FlameIcon } from '../../components/Icons'
import { relTime } from '../../lib/time'

export default function SuperOverview() {
  const { t } = useTranslation()
  const users = useStore(s => s.users)
  const questions = useStore(s => s.questions)
  const attempts = useStore(s => s.attempts)
  const audit = useStore(s => s.audit)

  const admins = users.filter(u => u.role === 'admin')
  const supers = users.filter(u => u.role === 'superadmin')
  const regulars = users.filter(u => u.role === 'user')

  const heatmap = useMemo(() => {
    // 7 days x 24 hours, count attempts
    const m: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
    for (const a of attempts) {
      const d = new Date(a.startedAt)
      const days = Math.floor((Date.now() - a.startedAt) / 86400000)
      if (days < 0 || days >= 7) continue
      m[6 - days][d.getHours()]++
    }
    const max = Math.max(1, ...m.flat())
    return { m, max }
  }, [attempts])

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <PageHeader
        eyebrow={`${t('role.superadmin').toUpperCase()} · SYS`}
        title={t('super.title')}
        right={<LangSwitcher />}
      />

      {/* Hero metrics */}
      <div className="px-5 mt-2 grid grid-cols-2 gap-3">
        <Hero label={t('super.totalUsers')} value={regulars.length} subtitle={`+${admins.length + supers.length} staff`} accent />
        <Hero label={t('super.totalAdmins')} value={admins.length + supers.length} subtitle={`${supers.length} super`} icon={<ShieldIcon />} />
        <Hero label={t('super.totalAttempts')} value={attempts.length} subtitle="lifetime" icon={<FlameIcon />} />
        <Hero label={t('admin.totalQuestions')} value={questions.length} subtitle="bank" icon={<QuestionIcon />} />
      </div>

      {/* Activity heatmap */}
      <div className="px-5 mt-7">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-display text-[12px] tracking-[0.3em] text-[var(--ink-soft)]">I.</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">Activity heatmap · 7d × 24h</span>
        </div>
        <Card className="p-4 overflow-x-auto">
          <div className="space-y-1 min-w-[480px]">
            {heatmap.m.map((row, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="w-6 font-mono text-[9px] text-[var(--ink-soft)] opacity-70 text-right">
                  {new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2)}
                </div>
                {row.map((v, h) => {
                  const intensity = v / heatmap.max
                  return (
                    <div
                      key={h}
                      className="flex-1 aspect-square rounded-[3px] border border-[var(--hairline)]"
                      style={{
                        background: v === 0 ? 'transparent' : `color-mix(in oklab, var(--accent) ${20 + intensity * 70}%, transparent)`,
                      }}
                      title={`${v}`}
                    />
                  )
                })}
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2 text-[9px] font-mono text-[var(--ink-soft)] opacity-70">
              <span>00</span><span className="flex-1 text-center">12</span><span>23</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Audit log */}
      <div className="px-5 mt-7">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-display text-[12px] tracking-[0.3em] text-[var(--ink-soft)]">II.</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">{t('super.auditLog')}</span>
        </div>
        <Card>
          {audit.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm font-display italic text-[var(--ink-soft)]">— {t('common.empty')}</div>
          ) : (
            <ul className="divide-y divide-[var(--hairline)]">
              {audit.slice(0, 8).map(e => (
                <li key={e.id} className="px-4 py-3 flex items-center gap-3 text-xs">
                  <ChartIcon className="w-3 h-3 stroke-[var(--ink-soft)] shrink-0" />
                  <span className="font-mono text-[var(--ink-soft)] opacity-60 shrink-0">{relTime(e.ts, t)}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)] shrink-0">{e.actorRole}</span>
                  <span className="font-display flex-1 truncate">{e.action}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* User distribution */}
      <div className="px-5 mt-7">
        <div className="flex items-center gap-3 mb-3">
          <span className="font-display text-[12px] tracking-[0.3em] text-[var(--ink-soft)]">III.</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">{t('admin.activeUsers')}</span>
        </div>
        <Card className="p-5">
          <div className="flex items-baseline gap-1 mb-4">
            <span className="font-display text-[64px] leading-none numerals">{users.length}</span>
            <span className="text-xs text-[var(--ink-soft)] font-mono">total</span>
          </div>
          <Bar label={t('role.user')} value={regulars.length} total={users.length} color="var(--ink)" />
          <Bar label={t('role.admin')} value={admins.length} total={users.length} color="var(--accent)" />
          <Bar label={t('role.superadmin')} value={supers.length} total={users.length} color="var(--ink-soft)" />
        </Card>
      </div>
    </div>
  )
}

function Hero({ label, value, subtitle, icon, accent }: { label: string; value: number | string; subtitle?: string; icon?: React.ReactNode; accent?: boolean }) {
  return (
    <div className={'rounded-2xl p-4 border relative overflow-hidden ' + (accent ? 'bg-[var(--accent)] text-[var(--ink)] border-transparent' : 'bg-[var(--paper-2)] border-[var(--hairline)]')}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase font-mono tracking-[0.18em] opacity-70">{label}</span>
        {icon && <span className="w-3.5 h-3.5 opacity-60">{icon}</span>}
      </div>
      <div className="font-display text-[44px] leading-none numerals">{value}</div>
      {subtitle && <div className="text-[10px] uppercase font-mono tracking-[0.18em] mt-1 opacity-60">{subtitle}</div>}
    </div>
  )
}

function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total ? (value / total) * 100 : 0
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-mono tracking-[0.18em] uppercase text-[var(--ink-soft)]">{label}</span>
        <span className="font-display text-base numerals">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--paper)] overflow-hidden">
        <div className="h-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}
