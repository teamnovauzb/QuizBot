import { useEffect, useState } from 'react'

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFadeOut(true), 1700)
    const t2 = setTimeout(onDone, 2200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div
      className={
        'fixed inset-0 z-[200] grid place-items-center bg-[var(--bg)] aurora transition-opacity duration-500 ' +
        (fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100')
      }
    >
      <div className="relative z-10 text-center">
        <div className="relative mx-auto mb-6 w-28 h-28">
          <div className="absolute inset-0 rounded-[28px] bg-[var(--accent)] opacity-30 blur-2xl animate-pulse" />
          <img src="/logo.svg" alt="Shifokor" className="relative w-full h-full drop-shadow-[0_8px_24px_rgba(93,229,168,0.35)]" />
        </div>
        <h1 className="font-display font-bold text-4xl tracking-tight">Shifokor</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)] tracking-wide">Bilim Sinovi</p>
        <div className="mt-8 flex justify-center gap-2">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce"
              style={{ animationDelay: `${i * 150}ms`, animationDuration: '900ms' }}
            />
          ))}
        </div>
      </div>
      <div className="absolute bottom-10 z-10 text-[10px] uppercase tracking-[0.3em] font-mono text-[var(--text-muted)]">
        102 savol · 9 boʻlim · 3 til
      </div>
    </div>
  )
}
