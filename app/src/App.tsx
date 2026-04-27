import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Entry from './screens/Entry'

import UserLayout from './screens/user/UserLayout'
import UserHome from './screens/user/Home'
import Quiz from './screens/user/Quiz'
import Result from './screens/user/Result'
import History from './screens/user/History'
import UserProfile from './screens/user/Profile'

import AdminLayout from './screens/admin/AdminLayout'
import AdminOverview from './screens/admin/Overview'
import AdminQuestions from './screens/admin/Questions'
import AdminUsers from './screens/admin/Users'
import AdminProfile from './screens/admin/Profile'

import SuperLayout from './screens/superadmin/SuperLayout'
import SuperOverview from './screens/superadmin/Overview'
import SuperAdmins from './screens/superadmin/Admins'
import SuperAllUsers from './screens/superadmin/AllUsers'
import SuperContent from './screens/superadmin/Content'
import SuperBroadcast from './screens/superadmin/Broadcast'

import { SUPABASE_ENABLED, supabase } from './lib/supabase'
import { useStore } from './store'

export default function App() {
  const hydrate = useStore(s => s.hydrateFromSupabase)

  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase) return
    // Hydrate on auth state change (so after sign-in we pull data)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) hydrate()
    })
    // Try once on mount in case a session is already present
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
        <Route path="result/:id" element={<Result />} />
      </Route>
      <Route path="/u/quiz" element={<Quiz />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminOverview />} />
        <Route path="questions" element={<AdminQuestions />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="profile" element={<AdminProfile />} />
      </Route>

      <Route path="/super" element={<SuperLayout />}>
        <Route index element={<SuperOverview />} />
        <Route path="admins" element={<SuperAdmins />} />
        <Route path="users" element={<SuperAllUsers />} />
        <Route path="content" element={<SuperContent />} />
        <Route path="broadcast" element={<SuperBroadcast />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
