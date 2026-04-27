// Hooks for Telegram MainButton + BackButton — wires Telegram's native UI to React.

import { useEffect } from 'react'
import { getTg } from './telegram'

export function useMainButton(opts: { text?: string; onClick?: () => void; show?: boolean; disabled?: boolean }) {
  const { text, onClick, show = true, disabled = false } = opts
  useEffect(() => {
    const tg = getTg()
    const btn = tg?.MainButton
    if (!btn) return
    if (text) btn.setText(text)
    if (disabled) btn.disable(); else btn.enable()
    if (show) btn.show(); else { btn.hide(); return }
    if (onClick) {
      btn.onClick(onClick)
      return () => btn.offClick(onClick)
    }
  }, [text, onClick, show, disabled])

  useEffect(() => () => { getTg()?.MainButton?.hide() }, [])
}

export function useBackButton(onClick?: () => void) {
  useEffect(() => {
    const tg = getTg()
    const back = tg?.BackButton
    if (!back) return
    back.show()
    if (onClick) {
      back.onClick(onClick)
      return () => { back.offClick(onClick); back.hide() }
    }
    return () => back.hide()
  }, [onClick])
}
