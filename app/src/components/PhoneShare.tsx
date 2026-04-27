// Onboarding card for phone share. Shown on Profile when phone not yet
// verified. Calls Telegram WebApp.requestContact when running inside TG.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useStore } from '../store'
import { requestTelegramContact, manualPhoneAccept, fmtPhone } from '../lib/phone'
import { getTg, haptic, notify } from '../lib/telegram'
import { PhoneIcon, CheckBadgeIcon, SparkleIcon } from './Icons'
import { Card, FilledButton } from './Shell'

export function PhoneShareCard() {
  const { t } = useTranslation()
  const tgUser = useStore(s => s.tgUser)
  const setPhone = useStore(s => s.setPhone)
  const me = useStore(s => s.users.find(u => u.telegramId === tgUser?.id))

  const [busy, setBusy] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manualVal, setManualVal] = useState('+998 ')
  const [error, setError] = useState<string | null>(null)

  if (me?.phoneVerified || me?.phone) return null

  const inTelegram = !!getTg()?.initData

  async function shareViaTelegram() {
    if (!tgUser) return
    setBusy(true); setError(null)
    const r = await requestTelegramContact()
    setBusy(false)
    if (r.ok && r.via === 'telegram') {
      // Bot side will receive message.contact and update DB.
      // We optimistically mark — the real phone arrives via hydrate.
      setPhone(tgUser.id, '+998…')
    } else if (r.ok === false) {
      if (r.reason === 'unavailable') setManualMode(true)
      else if (r.reason === 'cancelled') setError(t('phone.cancelled'))
      else setError(t('phone.error'))
    }
  }

  function shareManual() {
    if (!tgUser) return
    const r = manualPhoneAccept(manualVal)
    if (r.ok && r.via === 'manual') {
      setPhone(tgUser.id, r.phone)
      notify('success'); haptic('light')
    } else {
      setError(t('phone.invalid'))
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-5 relative overflow-hidden" glow>
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-[var(--accent)] opacity-20 blur-3xl" />
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl glass border border-[var(--accent)]/40 grid place-items-center text-[var(--accent)] shrink-0">
            <PhoneIcon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display font-bold text-lg">{t('phone.title')}</h3>
              <SparkleIcon className="w-3.5 h-3.5 stroke-[var(--accent)]" />
            </div>
            <p className="text-sm text-[var(--text-muted)] leading-snug">{t('phone.subtitle')}</p>
          </div>
        </div>

        {!manualMode ? (
          <div className="mt-5 flex gap-2">
            <FilledButton
              onClick={shareViaTelegram}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <CheckBadgeIcon className="w-5 h-5" />
              {busy ? '...' : t('phone.share')}
            </FilledButton>
            {!inTelegram && (
              <button
                onClick={() => setManualMode(true)}
                className="px-4 py-3 rounded-2xl glass border border-[var(--hairline-strong)] text-sm text-[var(--text-muted)]"
              >
                {t('phone.manual')}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-5 space-y-2">
            <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-[var(--text-muted)]">{t('phone.enterManual')}</div>
            <div className="flex gap-2">
              <input
                value={manualVal}
                onChange={e => setManualVal(e.target.value)}
                inputMode="tel"
                placeholder="+998 95 123 45 67"
                className="flex-1 px-4 py-3 rounded-2xl glass border border-[var(--hairline-strong)] text-base font-mono"
              />
              <FilledButton onClick={shareManual} className="px-5">
                <CheckBadgeIcon className="w-5 h-5" />
              </FilledButton>
            </div>
            <div className="text-xs text-[var(--text-dim)] font-mono">→ {fmtPhone(manualVal)}</div>
          </div>
        )}

        {error && <div className="mt-3 text-xs text-[var(--danger)]">{error}</div>}
      </Card>
    </motion.div>
  )
}
