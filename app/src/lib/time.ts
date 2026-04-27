export function fmtMs(ms: number): string {
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function relTime(ms: number, t: (k: string) => string): string {
  const diff = Date.now() - ms
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return t('common.today')
  if (m < 60) return `${m} ${t('common.minutes')}`
  if (h < 24) return `${h}h`
  if (d === 1) return t('common.yesterday')
  if (d < 30) return `${d} ${t('common.daysAgo')}`
  return new Date(ms).toLocaleDateString()
}
