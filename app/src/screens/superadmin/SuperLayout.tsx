import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Shell } from '../../components/Shell'
import { TabBar } from '../../components/TabBar'
import { ChartIcon, ShieldIcon, UsersIcon, QuestionIcon, SendIcon } from '../../components/Icons'

export default function SuperLayout() {
  const { t } = useTranslation()
  return (
    <Shell>
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
      <TabBar tabs={[
        { to: '/super', label: t('admin.overview'), icon: <ChartIcon /> },
        { to: '/super/admins', label: t('nav.admins'), icon: <ShieldIcon /> },
        { to: '/super/users', label: t('nav.users'), icon: <UsersIcon /> },
        { to: '/super/content', label: t('super.contentBank'), icon: <QuestionIcon /> },
        { to: '/super/broadcast', label: t('super.broadcast'), icon: <SendIcon /> },
      ]} />
    </Shell>
  )
}
