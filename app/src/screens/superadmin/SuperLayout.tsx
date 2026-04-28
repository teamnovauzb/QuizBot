import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Shell } from '../../components/Shell'
import { TabBar } from '../../components/TabBar'
import { ChartIcon, ShieldIcon, UsersIcon, QuestionIcon, SendIcon, SettingsIcon } from '../../components/Icons'
import { NetworkBadge } from '../../components/NetworkBadge'

export default function SuperLayout() {
  const { t } = useTranslation()
  return (
    <Shell>
      <NetworkBadge />
      <Outlet />
      <TabBar tabs={[
        { to: '/super', label: t('admin.overview'), icon: <ChartIcon /> },
        { to: '/super/analytics', label: t('nav.analytics'), icon: <ChartIcon /> },
        { to: '/super/admins', label: t('nav.admins'), icon: <ShieldIcon /> },
        { to: '/super/users', label: t('nav.users'), icon: <UsersIcon /> },
        { to: '/super/content', label: t('super.contentBank'), icon: <QuestionIcon /> },
        { to: '/super/broadcast', label: t('super.broadcast'), icon: <SendIcon /> },
        { to: '/super/config', label: t('nav.config'), icon: <SettingsIcon /> },
      ]} />
    </Shell>
  )
}
