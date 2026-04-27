// Two web-login surfaces:
// (a) <TelegramLoginWidget /> — embeds Telegram's official login script
// (b) <TelegramCodeLogin />   — user runs /login in @shifokoratbot, types the
//     resulting 6-digit code here, we exchange it via /web-login

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { webLoginByCode, webLoginByWidget } from '../lib/api2'
import { useStore } from '../store'
import { haptic, notify } from '../lib/telegram'

const BOT_USERNAME = (import.meta.env.VITE_TG_BOT_USERNAME as string | undefined) ?? 'shifokoratbot'

export function TelegramLoginWidget() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    // Telegram widget posts a global window callback; we set ours then inject script
    ;(window as any).__shifokoratTgLogin = async (payload: Record<string, any>) => {
      const r = await webLoginByWidget(payload)
      if (r.ok) {
        await supabase?.auth.setSession({ access_token: r.data.access_token, refresh_token: r.data.refresh_token })
        notify('success')
        location.reload()
      } else {
        notify('error')
        alert('Login failed: ' + r.error)
      }
    }
    const s = document.createElement('script')
    s.async = true
    s.src = 'https://telegram.org/js/telegram-widget.js?22'
    s.setAttribute('data-telegram-login', BOT_USERNAME)
    s.setAttribute('data-size', 'large')
    s.setAttribute('data-radius', '14')
    s.setAttribute('data-onauth', '__shifokoratTgLogin(user)')
    s.setAttribute('data-request-access', 'write')
    ref.current.appendChild(s)
  }, [])
  return <div ref={ref} className="flex justify-center" />
}

export function TelegramCodeLogin() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setTgUser = useStore(s => s.setTgUser)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    if (code.length !== 6) return
    setBusy(true); setErr(null); haptic('light')
    const r = await webLoginByCode(code)
    setBusy(false)
    if (!r.ok) {
      setErr(r.error)
      notify('error')
      return
    }
    await supabase?.auth.setSession({ access_token: r.data.access_token, refresh_token: r.data.refresh_token })
    setTgUser({
      id: r.data.user.telegram_id,
      first_name: r.data.user.first_name,
      last_name: r.data.user.last_name,
      username: r.data.user.username,
    })
    notify('success')
    navigate('/u')
  }

  return (
    <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--paper-2)] p-4">
      <div className="text-[10px] uppercase font-mono tracking-[0.22em] text-[var(--ink-soft)] mb-1.5">
        {t('login.codeTitle')}
      </div>
      <div className="font-display text-base mb-2">
        {t('login.codeStep1', { bot: '@' + BOT_USERNAME })}
      </div>
      <div className="flex items-center gap-2">
        <input
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="flex-1 font-mono tracking-[0.4em] text-center text-2xl py-3 rounded-xl bg-[var(--paper)] border border-[var(--hairline)]"
        />
        <button
          onClick={submit}
          disabled={code.length !== 6 || busy}
          className="px-4 py-3 rounded-xl bg-[var(--ink)] text-[var(--paper)] font-display disabled:opacity-50"
        >
          {busy ? '...' : t('login.codeSubmit')}
        </button>
      </div>
      {err && <div className="text-xs text-[#F87171] mt-2 font-mono">{err}</div>}
    </div>
  )
}
