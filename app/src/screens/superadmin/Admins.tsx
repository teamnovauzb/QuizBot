import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'
import { PageHeader, Card } from '../../components/Shell'
import { PlusIcon, ShieldIcon, XIcon } from '../../components/Icons'
import { relTime } from '../../lib/time'
import { haptic } from '../../lib/telegram'
import clsx from 'clsx'

export default function Admins() {
  const { t } = useTranslation()
  const users = useStore(s => s.users)
  const groups = useStore(s => s.groups)
  const setUserRole = useStore(s => s.setUserRole)
  const upsertUser = useStore(s => s.upsertUser)
  const log = useStore(s => s.log)

  const admins = users.filter(u => u.role === 'admin' || u.role === 'superadmin')
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="pb-32">
      <PageHeader
        eyebrow={`${admins.length} ${t('nav.admins').toLowerCase()}`}
        title={t('nav.admins')}
        right={
          <button
            onClick={() => { haptic('medium'); setAddOpen(true) }}
            className="rounded-full bg-[var(--ink)] text-[var(--paper)] w-12 h-12 grid place-items-center"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      <div className="px-5 mt-2 space-y-2">
        {admins.map((a, i) => {
          const group = groups.find(g => g.adminId === a.telegramId)
          return (
            <Card key={a.telegramId} className="p-4 flex items-center gap-3 paper-rise">
              <div className="font-display text-2xl numerals w-8 text-[var(--ink-soft)] opacity-30 text-center">
                {(i + 1).toString().padStart(2, '0')}
              </div>
              <div className={clsx(
                'w-11 h-11 rounded-full grid place-items-center font-display text-xl shrink-0',
                a.role === 'superadmin' ? 'bg-[var(--accent)] text-[var(--ink)]' : 'bg-[var(--ink)] text-[var(--paper)]'
              )}>
                {a.role === 'superadmin' ? <ShieldIcon className="w-5 h-5" /> : a.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-display text-base truncate">{a.name}</div>
                  {a.role === 'superadmin' && (
                    <span className="text-[9px] uppercase font-mono tracking-[0.18em] bg-[var(--accent)]/20 text-[var(--accent)] px-1.5 py-0.5 rounded">SUPER</span>
                  )}
                </div>
                <div className="text-xs text-[var(--ink-soft)] font-mono">@{a.username ?? a.telegramId}</div>
                {group && <div className="text-xs italic font-display text-[var(--ink-soft)] mt-0.5">{group.name} · {group.memberIds.length} {t('admin.members').toLowerCase()}</div>}
                <div className="text-[10px] font-mono text-[var(--ink-soft)] opacity-60 mt-0.5">{relTime(a.lastActive, t)}</div>
              </div>
              {a.role === 'admin' && (
                <button
                  onClick={() => { setUserRole(a.telegramId, 'user'); log('demoted admin', String(a.telegramId)) }}
                  className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)] underline-offset-2 hover:underline"
                >{t('admin.demote')}</button>
              )}
            </Card>
          )
        })}
      </div>

      <AnimatePresence>
        {addOpen && <AddAdmin onClose={() => setAddOpen(false)} onAdd={(id, name) => {
          upsertUser({
            telegramId: id, name, role: 'admin', joinedAt: Date.now(), lastActive: Date.now(),
          })
          log('added admin', String(id))
          setAddOpen(false)
        }} promote={(id) => { setUserRole(id, 'admin'); log('promoted to admin', String(id)); setAddOpen(false) }} />}
      </AnimatePresence>
    </div>
  )
}

function AddAdmin({ onClose, onAdd, promote }: { onClose: () => void; onAdd: (id: number, name: string) => void; promote: (id: number) => void }) {
  const { t } = useTranslation()
  const users = useStore(s => s.users)
  const [tab, setTab] = useState<'new' | 'promote'>('promote')
  const [tid, setTid] = useState('')
  const [name, setName] = useState('')

  const candidates = users.filter(u => u.role === 'user' && !u.blocked)

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-end bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="w-full max-h-[88dvh] bg-[var(--paper)] rounded-t-3xl pb-[max(env(safe-area-inset-bottom),20px)] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="pt-3"><div className="w-10 h-1 rounded-full bg-[var(--hairline)] mx-auto" /></div>
        <div className="px-5 py-3 flex items-center justify-between">
          <h3 className="font-display text-2xl">{t('admin.addAdmin')}</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full border border-[var(--hairline)] grid place-items-center"><XIcon className="w-4 h-4" /></button>
        </div>
        <div className="px-5 mb-2 inline-flex">
          <div className="inline-flex bg-[var(--paper-2)] rounded-full border border-[var(--hairline)] p-0.5">
            {(['promote', 'new'] as const).map(k => (
              <button key={k} onClick={() => setTab(k)} className={clsx(
                'px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-[0.18em]',
                tab === k ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--ink-soft)]'
              )}>{k}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5">
          {tab === 'promote' ? (
            <ul className="space-y-2">
              {candidates.map(u => (
                <button key={u.telegramId} onClick={() => promote(u.telegramId)} className="w-full text-left rounded-2xl border border-[var(--hairline)] bg-[var(--paper-2)] p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--ink)] text-[var(--paper)] grid place-items-center font-display">{u.name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-base truncate">{u.name}</div>
                    <div className="text-xs font-mono text-[var(--ink-soft)]">@{u.username ?? u.telegramId}</div>
                  </div>
                  <span className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--accent)]">{t('admin.promote')}</span>
                </button>
              ))}
            </ul>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)] mb-1.5">{t('admin.telegramId')}</div>
                <input value={tid} onChange={e => setTid(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-[var(--hairline)] bg-[var(--paper-2)]" placeholder="123456789" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)] mb-1.5">{t('admin.name')}</div>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-[var(--hairline)] bg-[var(--paper-2)]" placeholder="Ism Familiya" />
              </div>
              <button
                onClick={() => onAdd(parseInt(tid, 10), name)}
                disabled={!tid || !name}
                className="w-full rounded-2xl py-3 bg-[var(--ink)] text-[var(--paper)] disabled:opacity-50 font-display text-base"
              >
                {t('admin.save')}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
