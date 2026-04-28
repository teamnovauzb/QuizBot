import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { PageHeader, Card } from '../../components/Shell'
import { SearchIcon } from '../../components/Icons'
import { relTime } from '../../lib/time'
import { haptic } from '../../lib/telegram'
import clsx from 'clsx'

export default function AllUsers() {
  const { t } = useTranslation()
  const users = useStore(s => s.users)
  const groups = useStore(s => s.groups)
  const toggleBlock = useStore(s => s.toggleBlock)
  const setUserRole = useStore(s => s.setUserRole)
  const log = useStore(s => s.log)

  const [search, setSearch] = useState('')
  const [role, setRole] = useState<'all' | 'user' | 'admin' | 'superadmin'>('all')

  const list = users
    .filter(u => role === 'all' || u.role === role)
    .filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.username?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.lastActive - a.lastActive)

  return (
    <div className="pb-28">
      <PageHeader eyebrow={`${users.length} ${t('nav.users').toLowerCase()}`} title={t('nav.users')} />

      <div className="px-5 mt-2">
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-[var(--hairline)] bg-[var(--paper-2)]">
          <SearchIcon className="w-4 h-4 stroke-[var(--ink-soft)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('common.search')} className="flex-1 bg-transparent text-sm" />
        </div>
      </div>

      <div className="px-5 mt-3 inline-flex">
        <div className="inline-flex bg-[var(--paper-2)] rounded-full border border-[var(--hairline)] p-0.5">
          {(['all', 'user', 'admin', 'superadmin'] as const).map(k => (
            <button key={k} onClick={() => setRole(k)} className={clsx(
              'px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-[0.18em]',
              role === k ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--ink-soft)]'
            )}>{k}</button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-4 space-y-2">
        {list.map((u, i) => {
          const group = groups.find(g => g.id === u.groupId)
          return (
            <Card key={u.telegramId} className="p-4">
              <div className="flex items-center gap-3">
                <div className="font-display text-2xl numerals w-8 text-[var(--ink-soft)] opacity-30 text-center">
                  {(i + 1).toString().padStart(2, '0')}
                </div>
                <div className="w-11 h-11 rounded-full bg-[var(--ink)] text-[var(--paper)] grid place-items-center font-display text-xl shrink-0">{u.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-display text-base truncate">{u.name}</div>
                    <span className={clsx(
                      'text-[9px] uppercase font-mono tracking-[0.18em] px-1.5 py-0.5 rounded',
                      u.role === 'superadmin' ? 'bg-[var(--accent)]/20 text-[var(--accent)]' :
                      u.role === 'admin' ? 'bg-[var(--ink)] text-[var(--paper)]' :
                      'bg-[var(--paper-2)] text-[var(--ink-soft)] border border-[var(--hairline)]'
                    )}>{u.role}</span>
                    {u.blocked && <span className="text-[9px] uppercase font-mono tracking-[0.18em] bg-[#F87171]/20 text-[#F87171] px-1.5 py-0.5 rounded">blocked</span>}
                  </div>
                  <div className="text-xs text-[var(--ink-soft)] font-mono">@{u.username ?? u.telegramId} · {relTime(u.lastActive, t)}</div>
                  {group && <div className="text-xs italic font-display text-[var(--ink-soft)] mt-0.5 truncate">{group.name}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--hairline)]">
                {u.role === 'user' && (
                  <button onClick={() => { setUserRole(u.telegramId, 'admin'); log('promoted', String(u.telegramId)); haptic('medium') }} className="flex-1 rounded-xl py-2 text-xs border border-[var(--hairline)] text-[var(--accent)]">{t('admin.promote')}</button>
                )}
                {u.role === 'admin' && (
                  <button onClick={() => { setUserRole(u.telegramId, 'user'); log('demoted', String(u.telegramId)); haptic('medium') }} className="flex-1 rounded-xl py-2 text-xs border border-[var(--hairline)] text-[var(--ink-soft)]">{t('admin.demote')}</button>
                )}
                <button
                  onClick={() => { toggleBlock(u.telegramId); log(u.blocked ? 'unblocked' : 'blocked', String(u.telegramId)); haptic('heavy') }}
                  className={clsx(
                    'flex-1 rounded-xl py-2 text-xs',
                    u.blocked ? 'bg-[var(--accent)] text-[var(--ink)]' : 'border border-[var(--hairline)] text-[var(--ink-soft)]'
                  )}
                >{u.blocked ? t('admin.unblock') : t('admin.block')}</button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
