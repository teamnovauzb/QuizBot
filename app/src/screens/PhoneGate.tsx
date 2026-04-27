// Mandatory phone-share gate — shown when user is in /u and has no phone.
// Pattern from yashil-uyim: instead of a dismissible card, force the share
// step before granting access to the quiz panel.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Shell, FilledButton } from '../components/Shell'
import { PhoneIcon, CheckBadgeIcon, SparkleIcon, ArrowIcon } from '../components/Icons'
import { useStore } from '../store'
import {
  requestTelegramContact, manualPhoneAccept, fmtPhone, markCached, saveContactToDb,
} from '../lib/phone'
import { isTelegram } from '../lib/telegram'

export default function PhoneGate() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const tgUser = useStore(s => s.tgUser)
  const setPhone = useStore(s => s.setPhone)

  const [busy, setBusy] = useState(false)
  const [manual, setManual] = useState(false)
  const [val, setVal] = useState('+998 ')

  const inTg = isTelegram()

  async function shareViaTelegram() {
    if (!tgUser) return
    setBusy(true)
    const r = await requestTelegramContact()
    setBusy(false)
    if (r.ok && r.via === 'telegram') {
      const phone = r.phone || ''
      if (phone) {
        markCached(tgUser.id, phone)
        setPhone(tgUser.id, phone)
        await saveContactToDb(tgUser.id, phone)
      }
      toast.success(t('phone.thanks'))
      navigate('/u', { replace: true })
    } else if (r.ok === false) {
      if (r.reason === 'unavailable') setManual(true)
      else if (r.reason === 'cancelled') toast(t('phone.cancelled'))
      else toast.error(t('phone.error'))
    }
  }

  function shareManual() {
    if (!tgUser) return
    const r = manualPhoneAccept(val)
    if (r.ok && r.via === 'manual') {
      markCached(tgUser.id, r.phone)
      setPhone(tgUser.id, r.phone)
      saveContactToDb(tgUser.id, r.phone)
      toast.success(t('phone.thanks'))
      navigate('/u', { replace: true })
    } else {
      toast.error(t('phone.invalid'))
    }
  }

  function skip() {
    // Mark "skipped" so we don't keep prompting this session
    if (tgUser) markCached(tgUser.id, '')
    navigate('/u', { replace: true })
  }

  return (
    <Shell>
      <div className="flex-1 flex flex-col px-6 pt-[max(env(safe-area-inset-top),24px)] pb-[max(env(safe-area-inset-bottom),24px)]">
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
          <div className="relative mb-8 w-24 h-24">
            <div className="absolute inset-0 rounded-3xl bg-[var(--accent)] opacity-25 blur-2xl animate-pulse" />
            <div className="relative w-full h-full rounded-3xl glass-strong grid place-items-center text-[var(--accent)]">
              <PhoneIcon className="w-10 h-10" />
            </div>
            <SparkleIcon className="absolute -top-2 -right-2 w-5 h-5 stroke-[var(--accent)]" />
          </div>

          <h1 className="font-display font-bold text-3xl tracking-tight mb-3">{t('phone.title')}</h1>
          <p className="text-base text-[var(--text-muted)] leading-relaxed mb-8">{t('phone.subtitle')}</p>

          {!manual ? (
            <div className="w-full space-y-3">
              <FilledButton
                onClick={shareViaTelegram}
                disabled={busy}
                className="w-full text-base py-4 flex items-center justify-center gap-2"
              >
                <CheckBadgeIcon className="w-5 h-5" />
                {busy ? '...' : t('phone.share')}
                <ArrowIcon className="w-5 h-5" />
              </FilledButton>
              {!inTg && (
                <button
                  onClick={() => setManual(true)}
                  className="w-full rounded-2xl py-3 glass border border-[var(--hairline-strong)] text-sm font-medium text-[var(--text-muted)]"
                >
                  {t('phone.manual')}
                </button>
              )}
              <button
                onClick={skip}
                className="w-full text-xs text-[var(--text-dim)] underline-offset-2 hover:underline"
              >
                {t('phone.skip')}
              </button>
            </div>
          ) : (
            <div className="w-full space-y-3">
              <input
                value={val}
                onChange={e => setVal(e.target.value)}
                inputMode="tel"
                placeholder="+998 95 123 45 67"
                className="w-full px-4 py-4 rounded-2xl glass border border-[var(--hairline-strong)] text-center font-mono text-base"
              />
              <div className="text-xs text-[var(--text-dim)] font-mono">→ {fmtPhone(val)}</div>
              <FilledButton onClick={shareManual} className="w-full text-base py-4">
                <CheckBadgeIcon className="w-5 h-5 mr-2 inline-block" />
                {t('phone.confirm')}
              </FilledButton>
              <button
                onClick={() => setManual(false)}
                className="w-full text-xs text-[var(--text-muted)]"
              >
                ← {t('phone.back')}
              </button>
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}
