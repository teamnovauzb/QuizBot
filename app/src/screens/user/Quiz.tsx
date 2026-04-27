import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Shell } from '../../components/Shell'
import { CheckIcon, XIcon, ArrowIcon, BookIcon } from '../../components/Icons'
import { pickQuiz, type Question, QUESTIONS } from '../../data/questions'
import { useStore, type Attempt } from '../../store'
import { haptic, notify } from '../../lib/telegram'
import { recordAssignmentCompletion } from '../../lib/api2'
import { SUPABASE_ENABLED } from '../../lib/supabase'
import clsx from 'clsx'

type AnswerRecord = { questionId: string; chosenIndex: number | null; correct: boolean; timeMs: number }

export default function Quiz() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const tgUser = useStore(s => s.tgUser)
  const saveAttempt = useStore(s => s.saveAttempt)

  const count = parseInt(params.get('count') ?? '10', 10)
  const timePerQ = parseInt(params.get('time') ?? '30', 10)
  const cat = params.get('cat') ?? undefined
  const idsParam = params.get('ids') ?? undefined
  const wrongOnly = params.get('wrong') === '1'
  const assignmentId = params.get('assignment') ?? undefined
  const allQuestions = useStore(s => s.questions)
  const _allAttemptsRaw = useStore(s => s.attempts)
  const allAttempts = useMemo(
    () => _allAttemptsRaw.filter(a => a.userId === tgUser?.id),
    [_allAttemptsRaw, tgUser?.id],
  )
  const bookmarks = useStore(s => s.bookmarks)
  const toggleBookmark = useStore(s => s.toggleBookmark)
  const unlockAchievement = useStore(s => s.unlockAchievement)

  const [questions] = useState<Question[]>(() => {
    // Priority: explicit ids → wrong-only → category/count
    if (idsParam) {
      const wanted = idsParam.split(',')
      const found = wanted.map(id => allQuestions.find(q => q.id === id) ?? QUESTIONS.find(q => q.id === id)).filter(Boolean) as Question[]
      return found
    }
    if (wrongOnly) {
      const wrongIds = new Set<string>()
      for (const a of allAttempts) for (const ans of a.answers) if (!ans.correct) wrongIds.add(ans.questionId)
      const pool = allQuestions.filter(q => wrongIds.has(q.id))
      return pool.slice(0, count)
    }
    return pickQuiz({ count, categories: cat ? [cat] : undefined })
  })
  const [idx, setIdx] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [secs, setSecs] = useState(timePerQ)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [showExit, setShowExit] = useState(false)
  const startedAt = useRef(Date.now())
  const qStartedAt = useRef(Date.now())

  const q = questions[idx]
  const progressPct = ((idx + (revealed ? 1 : 0)) / questions.length) * 100

  // Timer
  useEffect(() => {
    if (revealed) return
    setSecs(timePerQ)
    qStartedAt.current = Date.now()
    const interval = setInterval(() => {
      setSecs(s => {
        if (s <= 1) {
          clearInterval(interval)
          handleReveal(null)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  function handlePick(i: number) {
    if (revealed) return
    haptic('light')
    setChosen(i)
  }

  function handleReveal(forcedNull: number | null = chosen) {
    if (revealed) return
    const choice = forcedNull
    const correct = choice !== null && choice === q.correctIndex
    const rec: AnswerRecord = {
      questionId: q.id,
      chosenIndex: choice,
      correct,
      timeMs: Date.now() - qStartedAt.current,
    }
    setAnswers(a => [...a, rec])
    setRevealed(true)
    notify(correct ? 'success' : 'error')
  }

  function handleNext() {
    haptic('medium')
    if (idx + 1 >= questions.length) finish()
    else {
      setIdx(idx + 1)
      setChosen(null)
      setRevealed(false)
    }
  }

  function finish() {
    const finalAnswers = answers
    const score = finalAnswers.filter(a => a.correct).length
    const attempt: Attempt = {
      id: `att-${Date.now().toString(36)}`,
      userId: tgUser?.id ?? 0,
      startedAt: startedAt.current,
      finishedAt: Date.now(),
      durationMs: Date.now() - startedAt.current,
      questionIds: questions.map(q => q.id),
      answers: finalAnswers,
      score,
      total: questions.length,
      category: cat,
    }
    saveAttempt(attempt)

    // achievements (local detection — server side will reconcile)
    unlockAchievement('first_quiz')
    if (score === attempt.total && attempt.total >= 10) unlockAchievement('perfect_10')
    const totalCorrect = (allAttempts.reduce((s, a) => s + a.score, 0)) + score
    if (totalCorrect >= 500) unlockAchievement('total_correct_500')
    const allCount = allAttempts.length + 1
    if (allCount >= 50) unlockAchievement('attempts_50')
    if (allCount >= 100) unlockAchievement('attempts_100')

    if (assignmentId && SUPABASE_ENABLED) {
      recordAssignmentCompletion(assignmentId, attempt.id, score, attempt.total).catch(() => {})
    }

    navigate(`/u/result/${attempt.id}`, { replace: true })
  }

  const ringCirc = 2 * Math.PI * 22
  const dashOffset = ringCirc * (1 - secs / timePerQ)

  if (!q) {
    return <Shell><div className="flex-1 grid place-items-center font-display text-3xl">—</div></Shell>
  }

  return (
    <Shell className="overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-[max(env(safe-area-inset-top),16px)] pb-3 flex items-center justify-between gap-3">
        <button onClick={() => setShowExit(true)} className="w-9 h-9 rounded-full border border-[var(--hairline)] grid place-items-center">
          <XIcon className="w-4 h-4 stroke-[var(--ink)]" />
        </button>
        <button
          onClick={() => { toggleBookmark(q.id); haptic('light') }}
          className={clsx(
            'w-9 h-9 rounded-full grid place-items-center transition-colors',
            bookmarks.includes(q.id) ? 'bg-[var(--accent)] text-[var(--ink)]' : 'border border-[var(--hairline)] text-[var(--ink-soft)]',
          )}
          aria-label="bookmark"
        >
          <BookIcon className="w-4 h-4 stroke-current" />
        </button>
        <div className="flex-1 mx-3">
          <div className="flex items-baseline justify-between mb-1">
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--ink-soft)]">
              {t('quiz.question')} <span className="text-[var(--accent)] numerals">{(idx + 1).toString().padStart(2, '0')}</span> / {questions.length}
            </span>
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[var(--ink-soft)]">{q.category}</span>
          </div>
          <div className="h-[3px] bg-[var(--hairline)] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[var(--accent)]"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            />
          </div>
        </div>
        {/* Timer ring */}
        <div className="relative w-12 h-12">
          <svg viewBox="0 0 50 50" className="-rotate-90 w-full h-full">
            <circle cx="25" cy="25" r="22" stroke="var(--hairline)" strokeWidth="3" fill="none" />
            <motion.circle
              cx="25" cy="25" r="22"
              stroke={secs <= 5 ? 'var(--color-danger,#F87171)' : 'var(--accent)'}
              strokeWidth="3" fill="none" strokeLinecap="round"
              strokeDasharray={ringCirc}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 0.95, ease: 'linear' }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className={clsx('font-display text-lg numerals leading-none', secs <= 5 && 'text-[var(--color-danger,#F87171)]')}>{secs}</span>
          </div>
        </div>
      </div>

      {/* Question body — editorial */}
      <div className="px-5 pt-4 flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
            className="mb-5"
          >
            <div className="flex items-baseline gap-3 mb-3">
              <span className="font-display text-[64px] leading-none numerals text-[var(--ink-soft)] opacity-25">
                {q.number.toString().padStart(2, '0')}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--accent)]">{q.category}</span>
            </div>
            <h2 className="font-display text-[26px] leading-[1.15] tracking-tight text-[var(--ink)]">
              {q.question}
            </h2>
          </motion.div>
        </AnimatePresence>

        {/* Options */}
        <div className="flex-1 flex flex-col gap-2.5">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correctIndex
            const isChosen = i === chosen
            const showResult = revealed
            const state =
              !showResult ? (isChosen ? 'chosen' : 'idle') :
              isCorrect ? 'correct' :
              isChosen ? 'wrong' :
              'idle-revealed'

            return (
              <motion.button
                key={i}
                disabled={revealed}
                onClick={() => handlePick(i)}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 * i + 0.05, duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                className={clsx(
                  'group flex items-start gap-3 p-4 rounded-2xl border text-left transition-all',
                  state === 'idle' && 'bg-[var(--paper-2)] border-[var(--hairline)] active:scale-[0.99]',
                  state === 'chosen' && 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]',
                  state === 'correct' && 'bg-[#0F2F1A] text-white border-[#1F5C36]',
                  state === 'wrong' && 'bg-[#3D1218] text-white border-[#7B1F2C]',
                  state === 'idle-revealed' && 'bg-[var(--paper-2)] border-[var(--hairline)] opacity-50',
                )}
              >
                <span className={clsx(
                  'w-6 h-6 shrink-0 rounded-full grid place-items-center font-mono text-xs',
                  state === 'idle' && 'border border-[var(--hairline)] text-[var(--ink-soft)]',
                  state === 'chosen' && 'bg-[var(--paper)] text-[var(--ink)]',
                  state === 'correct' && 'bg-[#4ADE80] text-[#0F2F1A]',
                  state === 'wrong' && 'bg-[#F87171] text-[#3D1218]',
                  state === 'idle-revealed' && 'border border-[var(--hairline)] text-[var(--ink-soft)]',
                )}>
                  {state === 'correct' ? <CheckIcon className="w-3.5 h-3.5 stroke-current" /> :
                   state === 'wrong' ? <XIcon className="w-3.5 h-3.5 stroke-current" /> :
                   String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1 text-[15px] leading-snug">{opt}</span>
              </motion.button>
            )
          })}
        </div>

        {/* Footer action */}
        <div className="pt-4 pb-[max(env(safe-area-inset-bottom),16px)]">
          {!revealed ? (
            <button
              disabled={chosen === null}
              onClick={() => handleReveal(chosen)}
              className={clsx(
                'w-full rounded-2xl py-4 font-display text-xl flex items-center justify-center gap-2 transition-all',
                chosen === null
                  ? 'bg-[var(--paper-2)] text-[var(--ink-soft)] opacity-50 border border-[var(--hairline)]'
                  : 'bg-[var(--ink)] text-[var(--paper)] active:scale-[0.99]'
              )}
            >
              {t('quiz.submit')}
            </button>
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className={clsx(
                'rounded-xl px-4 py-3 mb-2 flex items-center gap-3',
                answers[answers.length - 1]?.correct
                  ? 'bg-[#0F2F1A]/40 text-[#4ADE80]'
                  : 'bg-[#3D1218]/40 text-[#F87171]'
              )}>
                <span className="font-display text-2xl">
                  {answers[answers.length - 1]?.correct ? t('quiz.correct') : t('quiz.incorrect')}
                </span>
                {!answers[answers.length - 1]?.correct && (
                  <span className="text-xs opacity-80 ml-auto font-mono">→ {String.fromCharCode(65 + q.correctIndex)}</span>
                )}
              </div>
              <button
                onClick={handleNext}
                className="w-full rounded-2xl bg-[var(--accent)] text-[var(--ink)] py-4 font-display text-xl flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
              >
                {idx + 1 >= questions.length ? t('quiz.finish') : t('quiz.next')}
                <ArrowIcon className="w-5 h-5 stroke-[var(--ink)]" />
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Exit modal */}
      <AnimatePresence>
        {showExit && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-end bg-black/50"
            onClick={() => setShowExit(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-full bg-[var(--paper)] rounded-t-3xl p-6 pb-[max(env(safe-area-inset-bottom),24px)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-[var(--hairline)] mx-auto mb-4" />
              <h3 className="font-display text-2xl mb-2">{t('quiz.confirmExit')}</h3>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setShowExit(false)} className="flex-1 rounded-2xl py-3 border border-[var(--hairline)]">
                  {t('quiz.cancel')}
                </button>
                <button onClick={() => navigate('/u', { replace: true })} className="flex-1 rounded-2xl py-3 bg-[var(--ink)] text-[var(--paper)]">
                  {t('quiz.exit')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
  )
}
