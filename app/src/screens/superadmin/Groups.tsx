import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useStore } from '../../store'
import { PageHeader, Card } from '../../components/Shell'
import { PlusIcon, XIcon, EditIcon, TrashIcon, UsersIcon, ShieldIcon } from '../../components/Icons'
import { haptic, confirmDialog } from '../../lib/telegram'
import clsx from 'clsx'

export default function Groups() {
  const { t } = useTranslation()
  const groups = useStore(s => s.groups)
  const users = useStore(s => s.users)
  const addGroup = useStore(s => s.addGroup)
  const removeGroup = useStore(s => s.removeGroup)
  const assignGroup = useStore(s => s.assignGroup)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [members, setMembers] = useState<string | null>(null) // group id whose members sheet is open

  const editing = useMemo(() => groups.find(g => g.id === editingId) ?? null, [groups, editingId])

  return (
    <div className="pb-32">
      <PageHeader
        eyebrow={`${groups.length} ${t('nav.groups').toLowerCase()}`}
        title={t('nav.groups')}
        right={
          <button
            onClick={() => { haptic('medium'); setCreating(true) }}
            className="rounded-full bg-[var(--ink)] text-[var(--paper)] w-12 h-12 grid place-items-center"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        }
      />

      <div className="px-5 mt-2 space-y-2">
        {groups.length === 0 ? (
          <div className="text-center py-10">
            <div className="font-display text-6xl text-[var(--ink-soft)] opacity-20 mb-2">∅</div>
            <div className="text-sm font-display italic text-[var(--ink-soft)]">{t('common.empty')}</div>
          </div>
        ) : groups.map((g, i) => {
          const admin = users.find(u => u.telegramId === g.adminId)
          const memberCount = users.filter(u => u.groupId === g.id).length
          return (
            <Card key={g.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className="font-display text-2xl numerals w-8 text-center text-[var(--ink-soft)] opacity-30">
                  {(i + 1).toString().padStart(2, '0')}
                </div>
                <div className="w-11 h-11 rounded-xl bg-[var(--accent-soft)] grid place-items-center text-[var(--accent)] shrink-0">
                  <UsersIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold text-base truncate">{g.name}</div>
                  <div className="text-xs text-[var(--ink-soft)] flex items-center gap-1.5">
                    <ShieldIcon className="w-3 h-3" />
                    <span className="truncate">{admin?.name ?? `id ${g.adminId}`}</span>
                  </div>
                  <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)] opacity-70 mt-0.5">
                    {memberCount} {t('admin.members').toLowerCase()}
                  </div>
                </div>
                <button onClick={() => setEditingId(g.id)} className="p-2 text-[var(--ink-soft)]"><EditIcon className="w-4 h-4" /></button>
                <button onClick={async () => {
                  if (!await confirmDialog(t('admin.confirmDelete'))) return
                  removeGroup(g.id); haptic('heavy'); toast.success(t('admin.deletedToast'))
                }} className="p-2 text-[var(--ink-soft)]"><TrashIcon className="w-4 h-4" /></button>
              </div>
              <button
                onClick={() => setMembers(g.id)}
                className="mt-3 pt-3 border-t border-[var(--hairline)] w-full text-xs text-[var(--accent)] flex items-center justify-center gap-1.5"
              >
                {t('groups.manageMembers')}
              </button>
            </Card>
          )
        })}
      </div>

      <AnimatePresence>
        {(creating || editing) && (
          <GroupEditor
            initial={editing}
            availableAdmins={users.filter(u => u.role === 'admin' || u.role === 'superadmin')}
            onClose={() => { setEditingId(null); setCreating(false) }}
            onSave={({ name, adminId }) => {
              if (editing) {
                // local update (rename + reassign)
                const updated = { ...editing, name, adminId }
                useStore.setState(s => ({ groups: s.groups.map(g => g.id === editing.id ? updated : g) }))
              } else {
                addGroup(name, adminId)
              }
              setEditingId(null); setCreating(false)
              toast.success(t('admin.savedToast'))
            }}
          />
        )}
        {members && (
          <MembersSheet
            groupId={members}
            allUsers={users}
            onClose={() => setMembers(null)}
            onToggle={(uid, currentlyMember) => {
              assignGroup(uid, currentlyMember ? undefined : members)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function GroupEditor({ initial, availableAdmins, onClose, onSave }: {
  initial: { id: string; name: string; adminId: number } | null
  availableAdmins: { telegramId: number; name: string; username?: string; role: string }[]
  onClose: () => void
  onSave: (v: { name: string; adminId: number }) => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial?.name ?? '')
  const [adminId, setAdminId] = useState<number | null>(initial?.adminId ?? availableAdmins[0]?.telegramId ?? null)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-end bg-black/50" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="w-full max-h-[88dvh] bg-[var(--paper)] rounded-t-3xl pb-[max(env(safe-area-inset-bottom),20px)] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="pt-3"><div className="w-10 h-1 rounded-full bg-[var(--hairline)] mx-auto" /></div>
        <div className="px-5 py-3 flex items-center justify-between">
          <h3 className="font-display text-2xl">{initial ? t('groups.edit') : t('groups.new')}</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full border border-[var(--hairline)] grid place-items-center"><XIcon className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 space-y-4">
          <Field label={t('groups.name')}>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder={t('groups.namePlaceholder')}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--hairline)] bg-[var(--paper-2)]" />
          </Field>
          <Field label={t('groups.assignAdmin')}>
            <ul className="space-y-1.5 max-h-[40vh] overflow-y-auto">
              {availableAdmins.map(u => (
                <button key={u.telegramId} type="button" onClick={() => setAdminId(u.telegramId)}
                  className={clsx(
                    'w-full text-left p-2.5 rounded-xl border text-sm flex items-center gap-2',
                    adminId === u.telegramId ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]' : 'border-[var(--hairline)]',
                  )}>
                  <span className="w-7 h-7 rounded-full bg-[var(--paper-2)] text-[var(--ink)] grid place-items-center font-display text-sm shrink-0">{u.name[0]}</span>
                  <span className="flex-1 font-display truncate">{u.name}</span>
                  <span className="font-mono text-[10px] opacity-60 truncate">@{u.username ?? u.telegramId}</span>
                </button>
              ))}
            </ul>
          </Field>
        </div>

        <div className="px-5 pt-3">
          <button
            onClick={() => adminId && onSave({ name, adminId })}
            disabled={!name || !adminId}
            className="w-full rounded-2xl py-3 bg-[var(--ink)] text-[var(--paper)] disabled:opacity-50 font-display"
          >
            {t('admin.save')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function MembersSheet({ groupId, allUsers, onClose, onToggle }: {
  groupId: string
  allUsers: { telegramId: number; name: string; username?: string; groupId?: string; role: string }[]
  onClose: () => void
  onToggle: (uid: number, currentlyMember: boolean) => void
}) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const list = allUsers
    .filter(u => u.role === 'user')
    .filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-end bg-black/50" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="w-full max-h-[88dvh] bg-[var(--paper)] rounded-t-3xl pb-[max(env(safe-area-inset-bottom),20px)] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="pt-3"><div className="w-10 h-1 rounded-full bg-[var(--hairline)] mx-auto" /></div>
        <div className="px-5 py-3 flex items-center justify-between">
          <h3 className="font-display text-2xl">{t('groups.manageMembers')}</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full border border-[var(--hairline)] grid place-items-center"><XIcon className="w-4 h-4" /></button>
        </div>
        <div className="px-5 mb-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('common.search')}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--hairline)] bg-[var(--paper-2)] text-sm" />
        </div>
        <div className="flex-1 overflow-y-auto px-5 space-y-1.5 pb-3">
          {list.map(u => {
            const isMember = u.groupId === groupId
            return (
              <button key={u.telegramId} type="button"
                onClick={() => onToggle(u.telegramId, isMember)}
                className={clsx(
                  'w-full text-left p-3 rounded-xl border flex items-center gap-3',
                  isMember ? 'bg-[var(--accent-soft)] border-[var(--accent)]/30' : 'border-[var(--hairline)] bg-[var(--paper-2)]',
                )}>
                <span className="w-9 h-9 rounded-full bg-[var(--ink)] text-[var(--paper)] grid place-items-center font-display shrink-0">{u.name[0]}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm truncate">{u.name}</div>
                  <div className="font-mono text-[10px] text-[var(--ink-soft)]">@{u.username ?? u.telegramId}</div>
                </div>
                {isMember && <span className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--accent)]">✓ {t('groups.member')}</span>}
                {u.groupId && u.groupId !== groupId && (
                  <span className="text-[9px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)] opacity-60">{t('groups.inOther')}</span>
                )}
              </button>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)] mb-1.5">{label}</div>
      {children}
    </div>
  )
}
