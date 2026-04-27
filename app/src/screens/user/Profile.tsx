import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { PageHeader, Card } from '../../components/Shell'
import { LangSwitcher } from '../../components/LangSwitcher'
import { ShieldIcon, UsersIcon, SettingsIcon, ArrowIcon } from '../../components/Icons'

export default function Profile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const tgUser = useStore(s => s.tgUser)
  const me = useStore(s => s.users.find(u => u.telegramId === tgUser?.id))
  const attempts = useStore(s => s.attempts.filter(a => a.userId === tgUser?.id))
  const groups = useStore(s => s.groups)
  const myGroup = groups.find(g => g.id === me?.groupId)

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <PageHeader eyebrow={t('nav.profile')} title={tgUser?.first_name ?? '—'} right={<LangSwitcher />} />

      {/* Identity card */}
      <div className="px-5 mt-2 paper-rise">
        <Card className="p-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[var(--ink)] text-[var(--paper)] grid place-items-center font-display text-3xl">
            {tgUser?.first_name?.[0] ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--accent)]">{t(`role.${me?.role ?? 'user'}`)}</div>
            <div className="font-display text-2xl truncate">{tgUser?.first_name} {tgUser?.last_name ?? ''}</div>
            <div className="text-xs text-[var(--ink-soft)] font-mono">@{tgUser?.username ?? '—'} · ID {tgUser?.id}</div>
            {myGroup && <div className="text-xs text-[var(--ink-soft)] mt-1 italic font-display">{myGroup.name}</div>}
          </div>
        </Card>
      </div>

      {/* Stat strip */}
      <div className="px-5 mt-4 grid grid-cols-3 gap-2">
        <StatCol label={t('home.completed')} value={attempts.length} />
        <StatCol label={t('home.bestScore')} value={attempts.length ? Math.max(...attempts.map(a => Math.round(a.score / a.total * 100))) + '%' : '—'} />
        <StatCol label={t('home.accuracy')} value={attempts.length ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.reduce((s, a) => s + a.total, 0) * 100) + '%' : '—'} />
      </div>

      {/* Settings */}
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

      {/* Role switcher (if user has elevated role) */}
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

function StatCol({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--hairline)] bg-[var(--paper-2)] p-3">
      <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)] opacity-70 mb-1">{label}</div>
      <div className="font-display text-2xl numerals">{value}</div>
    </div>
  )
}
