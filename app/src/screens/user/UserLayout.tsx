import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Shell } from '../../components/Shell'
import { TabBar } from '../../components/TabBar'
import { HomeIcon, HistoryIcon, UserIcon, ChartIcon, BookIcon } from '../../components/Icons'
import { NetworkBadge } from '../../components/NetworkBadge'

export default function UserLayout() {
  const { t } = useTranslation()
  return (
    <Shell>
      <NetworkBadge />
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
      <TabBar tabs={[
        { to: '/u', label: t('nav.home'), icon: <HomeIcon /> },
        { to: '/u/leaderboard', label: t('nav.leaderboard'), icon: <ChartIcon /> },
        { to: '/u/bookmarks', label: t('nav.bookmarks'), icon: <BookIcon /> },
        { to: '/u/history', label: t('nav.history'), icon: <HistoryIcon /> },
        { to: '/u/profile', label: t('nav.profile'), icon: <UserIcon /> },
      ]} />
    </Shell>
  )
}
