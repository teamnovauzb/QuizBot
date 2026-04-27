import { useEffect, useState } from 'react'

export function NetworkBadge() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' || navigator.onLine)
  useEffect(() => {
    const a = () => setOnline(true), b = () => setOnline(false)
    window.addEventListener('online', a)
    window.addEventListener('offline', b)
    return () => { window.removeEventListener('online', a); window.removeEventListener('offline', b) }
  }, [])
  if (online) return null
  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 rounded-full bg-[#F87171] text-white px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] shadow">
      offline · changes will sync
    </div>
  )
}
