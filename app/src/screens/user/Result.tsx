import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Shell } from '../../components/Shell'
import { useStore } from '../../store'
import { ArrowIcon, CheckIcon, XIcon, BookIcon } from '../../components/Icons'
import { fmtMs } from '../../lib/time'
import { QUESTIONS } from '../../data/questions'
import clsx from 'clsx'

export default function Result() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const attempt = useStore(s => s.attempts.find(a => a.id === id))

  const pct = useMemo(() => attempt ? Math.round((attempt.score / attempt.total) * 100) : 0, [attempt])
  const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F'
  const verdict = pct >= 80 ? 'Ajoyib' : pct >= 60 ? "Yaxshi" : pct >= 40 ? "O‘rtacha" : "Mashq kerak"

  if (!attempt) {
    return (
      <Shell>
        <div className="flex-1 grid place-items-center px-8 text-center">
          <div>
            <div className="font-display text-6xl mb-2">—</div>
            <button onClick={() => navigate('/u', { replace: true })} className="rounded-2xl px-6 py-3 bg-[var(--ink)] text-[var(--paper)] mt-4">
              {t('common.backToHome')}
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  const ringCirc = 2 * Math.PI * 90

  return (
    <Shell className="overflow-y-auto pb-10">
      {/* Score hero */}
      <div className="px-5 pt-[max(env(safe-area-inset-top),16px)] pb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--ink-soft)] opacity-70">{t('result.title')}</span>
        <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--ink-soft)] opacity-70">№ {attempt.id.slice(-4).toUpperCase()}</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="relative mx-5 my-2 rounded-3xl bg-[var(--ink)] text-[var(--paper)] p-6 overflow-hidden"
      >
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-[var(--accent)] opacity-30 blur-3xl" />

        <div className="flex items-center gap-5">
          <div className="relative w-44 h-44 shrink-0">
            <svg viewBox="0 0 200 200" className="-rotate-90 w-full h-full">
              <circle cx="100" cy="100" r="90" stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
              <motion.circle
                cx="100" cy="100" r="90"
                stroke="var(--accent)" strokeWidth="8" fill="none" strokeLinecap="round"
                strokeDasharray={ringCirc}
                initial={{ strokeDashoffset: ringCirc }}
                animate={{ strokeDashoffset: ringCirc * (1 - pct / 100) }}
                transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1], delay: 0.2 }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }}>
                  <div className="font-display text-[68px] leading-none numerals">{pct}<span className="text-2xl opacity-60">%</span></div>
                  <div className="font-mono text-[10px] tracking-[0.3em] uppercase opacity-60 mt-1">{grade}-grade</div>
                </motion.div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-display italic text-[var(--accent)] text-2xl mb-1">{verdict}</div>
            <div className="font-display text-3xl">{attempt.score} <span className="opacity-50 text-xl">/ {attempt.total}</span></div>
            <div className="text-[11px] uppercase font-mono tracking-[0.18em] opacity-60 mt-2">{t('result.duration')}</div>
            <div className="font-mono text-sm">{fmtMs(attempt.durationMs)}</div>
          </div>
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-3 mt-5 pt-5 border-t border-white/10 text-center">
          <Stat label={t('result.correct')} value={attempt.score} icon={<CheckIcon className="w-3 h-3 stroke-[#4ADE80]" />} />
          <Stat label={t('result.incorrect')} value={attempt.answers.filter(a => a.chosenIndex !== null && !a.correct).length} icon={<XIcon className="w-3 h-3 stroke-[#F87171]" />} />
          <Stat label={t('result.skipped')} value={attempt.answers.filter(a => a.chosenIndex === null).length} />
        </div>
      </motion.div>

      {/* Action row */}
      <div className="px-5 mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => navigate('/u', { replace: true })}
          className="rounded-2xl py-3.5 border border-[var(--hairline)] bg-[var(--paper-2)] flex items-center justify-center gap-2"
        >
          <span className="font-display text-base">{t('result.home')}</span>
        </button>
        <button
          onClick={() => navigate('/u/quiz?count=' + attempt.total + '&time=30' + (attempt.category ? '&cat=' + encodeURIComponent(attempt.category) : ''))}
          className="rounded-2xl py-3.5 bg-[var(--accent)] text-[var(--ink)] flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <span className="font-display text-base">{t('result.again')}</span>
          <ArrowIcon className="w-4 h-4 stroke-[var(--ink)]" />
        </button>
      </div>

      {/* Review */}
      <div className="px-5 mt-7">
        <div className="flex items-center gap-3 mb-3">
          <BookIcon className="w-3.5 h-3.5 stroke-[var(--accent)]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">{t('result.review')}</span>
        </div>
        <ul className="space-y-2">
          {attempt.answers.map((a, i) => {
            const q = QUESTIONS.find(q => q.id === a.questionId) ?? attempt.questionIds.map(id => QUESTIONS.find(qq => qq.id === id)).filter(Boolean)[i]
            if (!q) return null
            return (
              <li key={a.questionId} className="rounded-2xl border border-[var(--hairline)] bg-[var(--paper-2)] p-4">
                <div className="flex items-start gap-3">
                  <span className={clsx(
                    'w-7 h-7 shrink-0 rounded-full grid place-items-center font-mono text-xs',
                    a.correct ? 'bg-[#4ADE80] text-[#0F2F1A]' : a.chosenIndex === null ? 'bg-[var(--ink-soft)] text-[var(--paper)]' : 'bg-[#F87171] text-[#3D1218]'
                  )}>
                    {a.correct ? <CheckIcon className="w-3.5 h-3.5 stroke-current" /> : <XIcon className="w-3.5 h-3.5 stroke-current" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)] opacity-70 mb-1">№{q.number} · {q.category}</div>
                    {q.imageUrl && (
                      <img src={q.imageUrl} alt="" className="w-full max-h-40 object-contain rounded-lg mb-2 bg-[var(--paper)]" loading="lazy" />
                    )}
                    <div className="text-sm leading-snug font-display">{q.question}</div>
                    {!a.correct && (
                      <div className="mt-2 text-xs text-[var(--accent)] flex items-start gap-1.5">
                        <span className="font-mono">→</span>
                        <span>{q.options[q.correctIndex]}</span>
                      </div>
                    )}
                    {q.explanation && (
                      <div className="mt-2 text-xs text-[var(--ink-soft)] italic font-display border-l-2 border-[var(--accent)] pl-2">
                        {q.explanation}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </Shell>
  )
}

function Stat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] uppercase font-mono tracking-[0.18em] opacity-60">{label}</span>
      </div>
      <div className="font-display text-2xl numerals">{value}</div>
    </div>
  )
}
