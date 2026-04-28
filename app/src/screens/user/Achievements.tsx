import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { PageHeader, Card } from '../../components/Shell'
import { fetchAchievements, fetchUserAchievements, type AchievementDef } from '../../lib/api2'
import { SUPABASE_ENABLED } from '../../lib/supabase'
import { SparkleIcon, FlameIcon, BookIcon, CheckIcon } from '../../components/Icons'
import clsx from 'clsx'

const FALLBACK_ACHS: AchievementDef[] = [
  { slug: 'first_quiz', name_uz: 'Birinchi qadam', name_ru: 'Первый шаг', name_en: 'First step', icon: 'flag', threshold: 1, kind: 'first', desc_uz: 'Birinchi sinov', desc_ru: 'Первый тест', desc_en: 'First quiz' },
  { slug: 'perfect_10', name_uz: 'Toza-besh', name_ru: 'Идеально', name_en: 'Flawless', icon: 'star', threshold: 10, kind: 'perfect', desc_uz: '10/10', desc_ru: '10 из 10', desc_en: '10 out of 10' },
  { slug: 'streak_7', name_uz: 'Bir hafta', name_ru: 'Неделя', name_en: 'Seven-day', icon: 'flame', threshold: 7, kind: 'streak', desc_uz: '7 kun', desc_ru: '7 дней', desc_en: '7 days' },
  { slug: 'attempts_50', name_uz: 'Yarim asr', name_ru: 'Пятидесятка', name_en: 'Half-century', icon: 'book', threshold: 50, kind: 'attempts', desc_uz: '50 sinov', desc_ru: '50 тестов', desc_en: '50 quizzes' },
  { slug: 'attempts_100', name_uz: 'Yuzlik', name_ru: 'Сотня', name_en: 'Centurion', icon: 'book', threshold: 100, kind: 'attempts', desc_uz: '100 sinov', desc_ru: '100 тестов', desc_en: '100 quizzes' },
  { slug: 'total_correct_500', name_uz: 'Yarim ming', name_ru: 'Полтыщи', name_en: 'Half-thousand', icon: 'check', threshold: 500, kind: 'total_correct', desc_uz: '500 togri', desc_ru: '500 верных', desc_en: '500 correct' },
]

const ICON: Record<string, (p: { className?: string }) => any> = {
  flame: FlameIcon, sparkle: SparkleIcon, book: BookIcon, check: CheckIcon, star: SparkleIcon, flag: SparkleIcon,
}

export default function Achievements() {
  const { t, i18n } = useTranslation()
  const tgUser = useStore(s => s.tgUser)
  const _attemptsRaw = useStore(s => s.attempts)
  const attempts = useMemo(() => _attemptsRaw.filter(a => a.userId === tgUser?.id), [_attemptsRaw, tgUser?.id])
  const [defs, setDefs] = useState<AchievementDef[]>(FALLBACK_ACHS)
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!SUPABASE_ENABLED || !tgUser) return
    fetchAchievements().then(r => { if (r.ok) setDefs(r.data) })
    fetchUserAchievements(tgUser.id).then(r => { if (r.ok) setUnlocked(new Set(r.data.map(x => x.slug))) })
  }, [tgUser?.id])

  // also detect locally
  const localUnlocked = computeLocal(attempts, defs)
  const all = new Set([...unlocked, ...localUnlocked])

  const lang = i18n.language as 'uz' | 'ru' | 'en'

  return (
    <div className="pb-28">
      <PageHeader eyebrow={`${all.size}/${defs.length} ${t('common.unlocked')}`} title={t('nav.achievements')} />

      <div className="px-5 mt-3 grid grid-cols-2 gap-3">
        {defs.map(d => {
          const Icon = ICON[d.icon] ?? SparkleIcon
          const isOn = all.has(d.slug)
          return (
            <Card key={d.slug} className={clsx('p-4 relative overflow-hidden', !isOn && 'opacity-50 grayscale')}>
              <div className={clsx('w-10 h-10 rounded-xl grid place-items-center mb-2', isOn ? 'bg-[var(--accent)] text-[var(--ink)]' : 'bg-[var(--paper)] border border-[var(--hairline)]')}>
                <Icon className="w-5 h-5 stroke-current" />
              </div>
              <div className="font-display text-lg leading-tight">{(d as any)[`name_${lang}`] ?? d.name_en}</div>
              <div className="text-xs text-[var(--ink-soft)] mt-1 font-mono">{(d as any)[`desc_${lang}`] ?? d.desc_en ?? ''}</div>
              {!isOn && <div className="text-[10px] uppercase font-mono tracking-[0.22em] text-[var(--ink-soft)] mt-2 opacity-60">{t('common.locked')}</div>}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function computeLocal(attempts: any[], defs: AchievementDef[]): Set<string> {
  const out = new Set<string>()
  if (attempts.length === 0) return out
  const totalCorrect = attempts.reduce((s, a) => s + a.score, 0)
  const perfects = attempts.filter(a => a.score === a.total).length
  for (const d of defs) {
    if (d.kind === 'first' && attempts.length >= 1) out.add(d.slug)
    if (d.kind === 'attempts' && attempts.length >= d.threshold) out.add(d.slug)
    if (d.kind === 'total_correct' && totalCorrect >= d.threshold) out.add(d.slug)
    if (d.kind === 'perfect' && perfects >= 1) out.add(d.slug)
  }
  return out
}
