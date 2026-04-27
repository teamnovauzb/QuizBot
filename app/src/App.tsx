import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Entry from './screens/Entry'

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

export default function App() {
  const hydrate = useStore(s => s.hydrateFromSupabase)

  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase) return
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) hydrate()
    })
    supabase.auth.getSession().then(({ data }) => { if (data.session) hydrate() })
    return () => sub.subscription.unsubscribe()
  }, [hydrate])

  return (
    <Routes>
      <Route path="/" element={<Entry />} />

      <Route path="/u" element={<UserLayout />}>
        <Route index element={<UserHome />} />
        <Route path="history" element={<History />} />
        <Route path="profile" element={<UserProfile />} />
        <Route path="bookmarks" element={<Bookmarks />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="achievements" element={<Achievements />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="result/:id" element={<Result />} />
      </Route>
      <Route path="/u/quiz" element={<Quiz />} />

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
  )
}
