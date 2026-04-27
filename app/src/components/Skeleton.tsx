import clsx from 'clsx'

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('rounded-md bg-[var(--paper-2)] animate-pulse', className)} />
}

export function SkeletonRow({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  )
}
