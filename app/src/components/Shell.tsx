import { type ReactNode } from 'react'
import clsx from 'clsx'

export function Shell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('relative flex flex-col min-h-[100dvh] bg-[var(--paper)] text-[var(--ink)] overflow-x-hidden grain', className)}>
      {children}
    </div>
  )
}

export function PageHeader({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <header className="px-5 pt-4 pb-3 flex items-end justify-between gap-3 paper-rise">
      <div>
        {eyebrow && <div className="text-[10px] tracking-[0.18em] uppercase font-mono text-[var(--ink-soft)] opacity-70 mb-1">{eyebrow}</div>}
        <h1 className="font-display text-[40px] leading-[0.95] tracking-tight">{title}</h1>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  )
}

export function Hairline({ label }: { label?: string }) {
  if (!label) return <div className="h-px bg-[var(--hairline)] mx-5" />
  return (
    <div className="flex items-center gap-3 px-5 my-3">
      <div className="h-px flex-1 bg-[var(--hairline)]" />
      <span className="text-[10px] uppercase tracking-[0.22em] font-mono text-[var(--ink-soft)] opacity-70">{label}</span>
      <div className="h-px flex-1 bg-[var(--hairline)]" />
    </div>
  )
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'relative rounded-2xl border border-[var(--hairline)] bg-[var(--paper-2)]',
        onClick && 'cursor-pointer active:scale-[0.99] transition-transform',
        className,
      )}
    >
      {children}
    </div>
  )
}
