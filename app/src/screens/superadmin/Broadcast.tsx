import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store'
import { PageHeader, Card } from '../../components/Shell'
import { SendIcon, CheckIcon } from '../../components/Icons'
import { haptic, notify } from '../../lib/telegram'
import { createAndSendBroadcast } from '../../lib/api2'
import { SUPABASE_ENABLED } from '../../lib/supabase'
import clsx from 'clsx'

type Mode = 'all' | 'admins' | 'users'

export default function Broadcast() {
  const { t } = useTranslation()
  const users = useStore(s => s.users)
  const log = useStore(s => s.log)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [mode, setMode] = useState<Mode>('all')
  const [sent, setSent] = useState<{ count: number; failed?: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const me = useStore(s => s.tgUser)

  const recipients = mode === 'all' ? users : mode === 'admins' ? users.filter(u => u.role === 'admin' || u.role === 'superadmin') : users.filter(u => u.role === 'user')

  async function send() {
    haptic('heavy'); setBusy(true); setError(null)
    log(`broadcast → ${mode}`, title)

    if (SUPABASE_ENABLED && me) {
      const r = await createAndSendBroadcast(me.id, mode, recipients.length, title, body)
      setBusy(false)
      if (r.ok) {
        notify('success')
        setSent({ count: r.data.sent, failed: r.data.failed })
      } else {
        notify('error')
        setError(r.error)
      }
    } else {
      setBusy(false)
      notify('success')
      setSent({ count: recipients.length })
    }
    setTimeout(() => {
      setSent(null); setTitle(''); setBody(''); setError(null)
    }, 3500)
  }

  return (
    <div className="pb-28">
      <PageHeader eyebrow={t('super.title').toUpperCase()} title={t('super.broadcast')} />

      <div className="px-5 mt-2 space-y-4">
        {/* Mode */}
        <Card className="p-4">
          <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)] mb-2">Recipients</div>
          <div className="grid grid-cols-3 gap-2">
            {(['all', 'admins', 'users'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={clsx(
                  'rounded-xl py-3 text-center border text-xs uppercase font-mono tracking-[0.18em] transition-colors',
                  mode === m ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]' : 'border-[var(--hairline)] bg-[var(--paper-2)] text-[var(--ink-soft)]'
                )}
              >
                <div className="font-display text-2xl numerals">
                  {m === 'all' ? users.length : m === 'admins' ? users.filter(u => u.role !== 'user').length : users.filter(u => u.role === 'user').length}
                </div>
                <div className="mt-1">{m}</div>
              </button>
            ))}
          </div>
        </Card>

        {/* Form */}
        <Card className="p-4 space-y-3">
          <div>
            <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)] mb-1.5">{t('super.broadcastTitle')}</div>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--hairline)] bg-[var(--paper)] text-base"
              placeholder="—"
            />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)] mb-1.5">{t('super.broadcastMessage')}</div>
            <textarea
              value={body} onChange={e => setBody(e.target.value)}
              rows={5}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--hairline)] bg-[var(--paper)] text-sm resize-none"
              placeholder="—"
            />
          </div>
        </Card>

        {/* Preview */}
        {(title || body) && (
          <div>
            <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)] mb-2 px-1">Preview</div>
            <div className="rounded-2xl bg-[var(--ink)] text-[var(--paper)] p-5">
              {title && <div className="font-display text-2xl mb-2">{title}</div>}
              {body && <div className="text-sm leading-relaxed opacity-90 whitespace-pre-wrap">{body}</div>}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10 text-[10px] uppercase font-mono tracking-[0.18em] opacity-60">
                <SendIcon className="w-3 h-3" />
                <span>via Shifokor · → {recipients.length}</span>
              </div>
            </div>
          </div>
        )}

        <button
          disabled={!title || !body || busy}
          onClick={send}
          className="w-full rounded-2xl py-4 bg-[var(--accent)] text-[var(--ink)] disabled:opacity-50 font-display text-xl flex items-center justify-center gap-2"
        >
          <SendIcon className="w-5 h-5" />
          {busy ? '...' : `${t('super.send')} → ${recipients.length}`}
        </button>
        {error && <div className="text-xs text-[#F87171] font-mono">{error}</div>}
      </div>

      <AnimatePresence>
        {sent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/60"
          >
            <motion.div
              initial={{ y: 20 }} animate={{ y: 0 }}
              className="bg-[var(--paper)] rounded-3xl p-8 text-center max-w-xs"
            >
              <div className="w-16 h-16 rounded-full bg-[var(--accent)] grid place-items-center mx-auto mb-3">
                <CheckIcon className="w-8 h-8 stroke-[var(--ink)]" />
              </div>
              <div className="font-display text-3xl">Sent</div>
              <div className="font-mono text-xs text-[var(--ink-soft)] mt-1">→ {sent.count} delivered{typeof sent.failed === 'number' ? ` · ${sent.failed} failed` : ''}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
