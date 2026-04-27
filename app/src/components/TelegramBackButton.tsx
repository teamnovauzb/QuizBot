import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getTg } from '../lib/telegram'

/**
 * Wires Telegram's hardware/software BackButton to react-router navigation.
 * Hidden on root routes (/), shown everywhere else.
 */
export function TelegramBackButton() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const back = getTg()?.BackButton
    if (!back) return

    const isRoot = location.pathname === '/' ||
      location.pathname === '/u' ||
      location.pathname === '/admin' ||
      location.pathname === '/super'

    if (isRoot) {
      try { back.hide() } catch {}
      return
    }

    const handler = () => {
      if (window.history.length > 1) navigate(-1)
      else navigate('/')
    }
    try {
      back.onClick(handler)
      back.show()
    } catch {}
    return () => {
      try { back.offClick(handler); back.hide() } catch {}
    }
  }, [location.pathname, navigate])

  return null
}
