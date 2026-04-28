import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Shell } from '../../components/Shell'
import { TabBar } from '../../components/TabBar'
import { ChartIcon, QuestionIcon, UsersIcon, UserIcon, BookIcon } from '../../components/Icons'
import { NetworkBadge } from '../../components/NetworkBadge'

export default function AdminLayout() {
  const { t } = useTranslation()
  return (
    <Shell>
      <NetworkBadge />
      <Outlet />
      <TabBar tabs={[
        { to: '/admin', label: t('admin.overview'), icon: <ChartIcon /> },
        { to: '/admin/questions', label: t('nav.questions'), icon: <QuestionIcon /> },
        { to: '/admin/assignments', label: t('nav.assignments'), icon: <BookIcon /> },
        { to: '/admin/users', label: t('nav.users'), icon: <UsersIcon /> },
        { to: '/admin/profile', label: t('nav.profile'), icon: <UserIcon /> },
      ]} />
    </Shell>
  )
}
