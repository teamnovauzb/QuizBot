import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader, Card } from '../../components/Shell'
import { fetchBotConfig, updateBotConfig } from '../../lib/api2'
import { SUPABASE_ENABLED } from '../../lib/supabase'
import { CheckIcon } from '../../components/Icons'
import { haptic } from '../../lib/telegram'

const KEYS = [
  { key: 'welcome_message_uz', label: "Salomlash matni (UZ)", multiline: true },
  { key: 'welcome_message_ru', label: 'Приветствие (RU)', multiline: true },
  { key: 'welcome_message_en', label: 'Welcome message (EN)', multiline: true },
  { key: 'miniapp_url', label: 'Mini App URL' },
  { key: 'daily_reminder_hour', label: 'Daily reminder hour (UTC, 0-23)', number: true },
  { key: 'daily_reminder_enabled', label: 'Daily reminder enabled', boolean: true },
  { key: 'default_quiz_count', label: 'Default quiz count', number: true },
  { key: 'default_time_per_q', label: 'Default time per question (s)', number: true },
]

export default function BotConfig() {
  const { t } = useTranslation()
  const [vals, setVals] = useState<Record<string, any>>({})
  const [savedKey, setSavedKey] = useState<string | null>(null)

  async function reload() {
    if (!SUPABASE_ENABLED) return
    const r = await fetchBotConfig()
    if (r.ok) setVals(r.data)
  }
  useEffect(() => { reload() }, [])

  async function save(key: string, value: any) {
    haptic('medium')
    await updateBotConfig(key, value)
    setSavedKey(key)
    setTimeout(() => setSavedKey(null), 1200)
  }

  return (
    <div className="pb-32">
      <PageHeader eyebrow={t('super.title')} title={t('nav.botConfig')} />
      <div className="px-5 mt-2 space-y-3">
        {KEYS.map(k => {
          const cur = vals[k.key]
          return (
            <Card key={k.key} className="p-4">
              <div className="text-[10px] uppercase font-mono tracking-[0.18em] text-[var(--ink-soft)] mb-2">{k.label}</div>
              {k.boolean ? (
                <button
                  onClick={() => save(k.key, !cur)}
                  className={'inline-flex items-center gap-2 rounded-full px-3 py-1.5 ' + (cur ? 'bg-[var(--accent)] text-[var(--ink)]' : 'border border-[var(--hairline)] text-[var(--ink-soft)]')}
                >
                  {cur ? '✓ ON' : 'OFF'}
                </button>
              ) : k.multiline ? (
                <textarea
                  rows={3}
                  defaultValue={typeof cur === 'string' ? cur : JSON.stringify(cur ?? '')}
                  onBlur={e => save(k.key, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--hairline)] bg-[var(--paper)] text-sm resize-none"
                />
              ) : (
                <input
                  type={k.number ? 'number' : 'text'}
                  defaultValue={typeof cur === 'string' ? cur : (cur ?? '')}
                  onBlur={e => save(k.key, k.number ? Number(e.target.value) : e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--hairline)] bg-[var(--paper)]"
                />
              )}
              {savedKey === k.key && (
                <div className="mt-2 flex items-center gap-1 text-[10px] uppercase font-mono tracking-[0.18em] text-[#4ADE80]">
                  <CheckIcon className="w-3 h-3" /> saved
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
