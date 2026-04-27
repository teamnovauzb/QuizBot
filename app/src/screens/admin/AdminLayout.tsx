import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Shell } from '../../components/Shell'
import { TabBar } from '../../components/TabBar'
import { ChartIcon, QuestionIcon, UsersIcon, UserIcon } from '../../components/Icons'

export default function AdminLayout() {
  const { t } = useTranslation()
  return (
    <Shell>
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
      <TabBar tabs={[
        { to: '/admin', label: t('admin.overview'), icon: <ChartIcon /> },
        { to: '/admin/questions', label: t('nav.questions'), icon: <QuestionIcon /> },
        { to: '/admin/users', label: t('nav.users'), icon: <UsersIcon /> },
        { to: '/admin/profile', label: t('nav.profile'), icon: <UserIcon /> },
      ]} />
    </Shell>
  )
}
