import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store'
import { PageHeader, Card } from '../../components/Shell'
import { SearchIcon, ArrowIcon } from '../../components/Icons'
import { relTime } from '../../lib/time'
import clsx from 'clsx'
import { haptic } from '../../lib/telegram'

export default function AdminUsers() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const tgUser = useStore(s => s.tgUser)
  const users = useStore(s => s.users)
  const groups = useStore(s => s.groups)
  const attempts = useStore(s => s.attempts)
  const toggleBlock = useStore(s => s.toggleBlock)

  const myGroup = groups.find(g => g.adminId === tgUser?.id)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'all' | 'active' | 'blocked'>('all')

  const list = useMemo(() => {
    let pool = myGroup ? users.filter(u => myGroup.memberIds.includes(u.telegramId)) : users.filter(u => u.role === 'user')
    if (tab === 'active') pool = pool.filter(u => !u.blocked)
    if (tab === 'blocked') pool = pool.filter(u => u.blocked)
    if (search) pool = pool.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.username?.toLowerCase().includes(search.toLowerCase()))
    return pool.sort((a, b) => b.lastActive - a.lastActive)
  }, [users, myGroup, search, tab])

  function exportCsv() {
    const rows = list.map(u => {
      const ua = attempts.filter(a => a.userId === u.telegramId)
      const total = ua.reduce((s, a) => s + a.total, 0)
      const correct = ua.reduce((s, a) => s + a.score, 0)
      const avg = total ? Math.round((correct / total) * 100) : 0
      return [u.telegramId, u.name, u.username ?? '', u.role, u.blocked ? '1' : '0', ua.length, avg, new Date(u.lastActive).toISOString()]
    })
    const header = ['telegram_id', 'name', 'username', 'role', 'blocked', 'attempts', 'avg_pct', 'last_active']
    const csv = [header, ...rows].map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shifokorat-users-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <PageHeader
        eyebrow={myGroup?.name ?? t('common.all')}
        title={t('nav.users')}
        right={
          <button onClick={exportCsv} className="rounded-full border border-[var(--hairline)] px-3 py-2 text-[10px] uppercase font-mono tracking-[0.18em]">
            CSV
          </button>
        }
      />

      <div className="px-5 mt-2">
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-[var(--hairline)] bg-[var(--paper-2)]">
          <SearchIcon className="w-4 h-4 stroke-[var(--ink-soft)]" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('common.search')}
            className="flex-1 bg-transparent text-sm placeholder:text-[var(--ink-soft)] placeholder:opacity-60"
          />
        </div>
      </div>

      <div className="px-5 mt-3 inline-flex">
        <div className="inline-flex bg-[var(--paper-2)] rounded-full border border-[var(--hairline)] p-0.5">
          {(['all', 'active', 'blocked'] as const).map(k => (
            <button key={k} onClick={() => setTab(k)} className={clsx(
              'px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-[0.18em] transition-colors',
              tab === k ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--ink-soft)]'
            )}>{k}</button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-4 space-y-2">
        {list.map((u, i) => {
          const userAttempts = attempts.filter(a => a.userId === u.telegramId)
          const avg = userAttempts.length ? Math.round(userAttempts.reduce((s, a) => s + a.score / a.total * 100, 0) / userAttempts.length) : 0
          return (
            <Card key={u.telegramId} className="p-4 paper-rise" onClick={() => navigate(`/admin/users/${u.telegramId}`)}>
              <div className="flex items-center gap-3">
                <div className="font-display text-2xl numerals w-8 text-[var(--ink-soft)] opacity-30 text-center">
                  {(i + 1).toString().padStart(2, '0')}
                </div>
                <div className="w-11 h-11 rounded-full bg-[var(--ink)] text-[var(--paper)] grid place-items-center font-display text-xl shrink-0">
                  {u.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-base truncate flex items-center gap-2">
                    {u.name}
                    {u.blocked && <span className="text-[9px] uppercase font-mono tracking-[0.18em] bg-[#F87171]/20 text-[#F87171] px-1.5 py-0.5 rounded">blocked</span>}
                  </div>
                  <div className="text-xs text-[var(--ink-soft)] font-mono">@{u.username ?? u.telegramId} · {relTime(u.lastActive, t)}</div>
                </div>
                <div className="text-right">
                  <div className={clsx('font-display text-2xl numerals', avg >= 70 ? 'text-[var(--ink)]' : avg >= 40 ? 'text-[var(--accent)]' : 'text-[var(--ink-soft)]')}>{avg}%</div>
                  <div className="text-[9px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)] opacity-60">{userAttempts.length} {t('home.completed').toLowerCase()}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--hairline)]" onClick={e => e.stopPropagation()}>
                <a
                  href={u.username ? `https://t.me/${u.username}` : '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 rounded-xl py-2 text-xs border border-[var(--hairline)] text-[var(--ink-soft)] text-center"
                >
                  {t('admin.dm')}
                </a>
                <button
                  onClick={() => { toggleBlock(u.telegramId); haptic('medium') }}
                  className={clsx(
                    'flex-1 rounded-xl py-2 text-xs',
                    u.blocked ? 'bg-[var(--accent)] text-[var(--ink)]' : 'border border-[var(--hairline)] text-[var(--ink-soft)]'
                  )}
                >
                  {u.blocked ? t('admin.unblock') : t('admin.block')}
                </button>
                <ArrowIcon className="w-4 h-4 stroke-[var(--ink-soft)] ml-1" />
              </div>
            </Card>
          )
        })}
        {list.length === 0 && (
          <div className="text-center py-12">
            <div className="font-display text-6xl text-[var(--ink-soft)] opacity-20 mb-2">∅</div>
            <div className="text-sm font-display italic text-[var(--ink-soft)]">{t('common.empty')}</div>
          </div>
        )}
      </div>
    </div>
  )
}
