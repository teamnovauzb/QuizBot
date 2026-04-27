import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import Entry from './screens/Entry'
import PhoneGate from './screens/PhoneGate'

import UserLayout from './screens/user/UserLayout'
import UserHome from './screens/user/Home'
import Quiz from './screens/user/Quiz'
import Result from './screens/user/Result'
import History from './screens/user/History'
import UserProfile from './screens/user/Profile'
import Bookmarks from './screens/user/Bookmarks'
import Leaderboard from './screens/user/Leaderboard'
import Achievements from './screens/user/Achievements'
import Assignments from './screens/user/Assignments'

import AdminLayout from './screens/admin/AdminLayout'
import AdminOverview from './screens/admin/Overview'
import AdminQuestions from './screens/admin/Questions'
import AdminUsers from './screens/admin/Users'
import AdminProfile from './screens/admin/Profile'
import AdminBulkImport from './screens/admin/BulkImport'
import AdminAssignments from './screens/admin/Assignments'
import AdminUserDetail from './screens/admin/UserDetail'

import SuperLayout from './screens/superadmin/SuperLayout'
import SuperOverview from './screens/superadmin/Overview'
import SuperAdmins from './screens/superadmin/Admins'
import SuperAllUsers from './screens/superadmin/AllUsers'
import SuperContent from './screens/superadmin/Content'
import SuperBroadcast from './screens/superadmin/Broadcast'
import SuperCategories from './screens/superadmin/Categories'
import SuperBotConfig from './screens/superadmin/BotConfig'
import SuperAnalytics from './screens/superadmin/Analytics'
import SuperAudit from './screens/superadmin/Audit'

import { SUPABASE_ENABLED, supabase } from './lib/supabase'
import { useStore } from './store'
import { isTelegram } from './lib/telegram'
import { isCachedShared, markCached } from './lib/phone'

import { SplashScreen } from './components/SplashScreen'
import { Onboarding } from './components/Onboarding'
import { TelegramBackButton } from './components/TelegramBackButton'

const SPLASH_KEY = 'shifokorat_splash'
const ONBOARD_KEY = 'shifokorat_onboarded'

function PhoneGateGuard({ children }: { children: React.ReactNode }) {
  const tgUser = useStore(s => s.tgUser)
  const me = useStore(s => s.users.find(u => u.telegramId === tgUser?.id))
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!tgUser) return
    if (location.pathname.startsWith('/phone')) return
    const hasPhone = me?.phoneVerified || me?.phone || isCachedShared(tgUser.id)
    if (!hasPhone) navigate('/phone', { replace: true })
  }, [tgUser, me?.phoneVerified, me?.phone, location.pathname, navigate])

  return <>{children}</>
}

export default function App() {
  const hydrate = useStore(s => s.hydrateFromSupabase)
  const tgUser = useStore(s => s.tgUser)

  // Splash + Onboarding state
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem(SPLASH_KEY))
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase) return
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) hydrate()
    })
    supabase.auth.getSession().then(({ data }) => { if (data.session) hydrate() })
    return () => sub.subscription.unsubscribe()
  }, [hydrate])

  // Trigger onboarding for first-time users (after splash)
  useEffect(() => {
    if (showSplash) return
    const seen = localStorage.getItem(ONBOARD_KEY)
    if (!seen) setShowOnboarding(true)
  }, [showSplash])

  // Sync cached phone → store on app load (so guard doesn't re-prompt after a refresh)
  useEffect(() => {
    if (!tgUser) return
    if (isCachedShared(tgUser.id)) {
      // ensure cache exists; if user previously skipped, this is empty-string but valid
    }
  }, [tgUser])

  const inTg = isTelegram()

  return (
    <>
      <Toaster
        position="bottom-center"
        containerStyle={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }}
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--hairline-strong)',
            borderRadius: '14px',
            padding: '12px 18px',
            fontSize: '13px',
            fontWeight: 500,
            backdropFilter: 'blur(20px) saturate(160%)',
            WebkitBackdropFilter: 'blur(20px) saturate(160%)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            maxWidth: '90vw',
          },
          success: { iconTheme: { primary: '#5DE5A8', secondary: '#0A1814' } },
          error: { iconTheme: { primary: '#FF6B6B', secondary: '#0A1814' } },
        }}
      />

      {showSplash && (
        <SplashScreen onDone={() => {
          sessionStorage.setItem(SPLASH_KEY, '1')
          setShowSplash(false)
        }} />
      )}
      {!showSplash && showOnboarding && (
        <Onboarding onDone={() => {
          localStorage.setItem(ONBOARD_KEY, '1')
          setShowOnboarding(false)
        }} />
      )}

      {inTg && <TelegramBackButton />}

      <Routes>
        <Route path="/" element={<Entry />} />
        <Route path="/phone" element={<PhoneGate />} />

        <Route path="/u" element={<PhoneGateGuard><UserLayout /></PhoneGateGuard>}>
          <Route index element={<UserHome />} />
          <Route path="history" element={<History />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="bookmarks" element={<Bookmarks />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="achievements" element={<Achievements />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="result/:id" element={<Result />} />
        </Route>
        <Route path="/u/quiz" element={<PhoneGateGuard><Quiz /></PhoneGateGuard>} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="questions" element={<AdminQuestions />} />
          <Route path="assignments" element={<AdminAssignments />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:id" element={<AdminUserDetail />} />
          <Route path="profile" element={<AdminProfile />} />
        </Route>
        <Route path="/admin/import" element={<AdminBulkImport />} />

        <Route path="/super" element={<SuperLayout />}>
          <Route index element={<SuperOverview />} />
          <Route path="analytics" element={<SuperAnalytics />} />
          <Route path="admins" element={<SuperAdmins />} />
          <Route path="users" element={<SuperAllUsers />} />
          <Route path="content" element={<SuperContent />} />
          <Route path="categories" element={<SuperCategories />} />
          <Route path="broadcast" element={<SuperBroadcast />} />
          <Route path="config" element={<SuperBotConfig />} />
          <Route path="audit" element={<SuperAudit />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

// suppress markCached unused warning during dev; util used directly elsewhere
void markCached
