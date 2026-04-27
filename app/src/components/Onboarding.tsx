import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowIcon, BookIcon, FlameIcon, SparkleIcon, ChartIcon } from './Icons'

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)

  const slides = [
    {
      Icon: BookIcon,
      title: t('onboarding.s1.title'),
      desc: t('onboarding.s1.desc'),
    },
    {
      Icon: FlameIcon,
      title: t('onboarding.s2.title'),
      desc: t('onboarding.s2.desc'),
    },
    {
      Icon: ChartIcon,
      title: t('onboarding.s3.title'),
      desc: t('onboarding.s3.desc'),
    },
  ]

  function next() {
    if (step < slides.length - 1) setStep(s => s + 1)
    else onDone()
  }

  const slide = slides[step]
  const Icon = slide.Icon
  const isLast = step === slides.length - 1

  return (
    <div className="fixed inset-0 z-[150] flex flex-col items-center justify-between bg-[var(--bg)] aurora pt-[max(env(safe-area-inset-top),24px)] pb-[max(env(safe-area-inset-bottom),24px)] px-6 overflow-hidden">
      <button
        onClick={onDone}
        className="absolute top-[max(env(safe-area-inset-top),24px)] right-6 z-10 text-xs font-mono uppercase tracking-[0.18em] text-[var(--text-muted)]"
      >
        {t('onboarding.skip')}
      </button>

      <div className="relative z-10 flex-1 w-full flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            className="text-center max-w-sm"
          >
            <div className="relative mx-auto mb-8 w-28 h-28">
              <div className="absolute inset-0 rounded-3xl bg-[var(--accent)] opacity-20 blur-2xl animate-pulse" />
              <div className="relative w-full h-full rounded-3xl glass-strong grid place-items-center text-[var(--accent)]">
                <Icon className="w-12 h-12" />
              </div>
              <SparkleIcon className="absolute -top-2 -right-2 w-6 h-6 stroke-[var(--accent)]" />
            </div>
            <h2 className="font-display font-bold text-3xl leading-tight tracking-tight mb-4">{slide.title}</h2>
            <p className="text-base text-[var(--text-muted)] leading-relaxed">{slide.desc}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-6">
        {/* dots */}
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={
                'rounded-full transition-all duration-300 ' +
                (i === step ? 'w-7 h-2 bg-[var(--accent)]' : 'w-2 h-2 bg-[var(--hairline-strong)]')
              }
            />
          ))}
        </div>

        <button
          onClick={next}
          className="w-full rounded-2xl py-4 bg-[var(--accent)] text-[var(--bg)] font-display font-bold text-base flex items-center justify-center gap-2 active:scale-[0.99] shadow-[0_8px_32px_-8px_var(--accent-glow)]"
        >
          {isLast ? t('onboarding.start') : t('onboarding.next')}
          <ArrowIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
