import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './lib/theme'  // applies stored theme before render
import './i18n'
import App from './App'
import { initTelegram } from './lib/telegram'

// Init Telegram WebApp once at app startup so viewport + safe-area CSS vars
// (--tg-vh, --tg-content-top, --tg-safe-top) are populated regardless of
// which route the user lands on (e.g. direct refresh of /u/profile).
initTelegram()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
