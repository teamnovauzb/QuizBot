import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Shell } from '../../components/Shell'
import { TabBar } from '../../components/TabBar'
import {
  ChartIcon, ShieldIcon, UsersIcon, QuestionIcon, SendIcon, SettingsIcon, BookIcon, EditIcon,
} from '../../components/Icons'
import { NetworkBadge } from '../../components/NetworkBadge'

export default function SuperLayout() {
  const { t } = useTranslation()
  return (
    <Shell>
      <NetworkBadge />
      <Outlet />
      <TabBar tabs={[
        { to: '/super', label: t('admin.overview'), icon: <ChartIcon /> },
        { to: '/super/users', label: t('nav.users'), icon: <UsersIcon /> },
        { to: '/super/admins', label: t('nav.admins'), icon: <ShieldIcon /> },
        { to: '/super/content', label: t('super.contentBank'), icon: <QuestionIcon /> },
        // overflow ↓
        { to: '/super/groups', label: t('nav.groups'), icon: <UsersIcon /> },
        { to: '/super/categories', label: t('nav.categories'), icon: <BookIcon /> },
        { to: '/super/broadcast', label: t('super.broadcast'), icon: <SendIcon /> },
        { to: '/super/broadcasts', label: t('broadcasts.title'), icon: <SendIcon /> },
        { to: '/super/analytics', label: t('nav.analytics'), icon: <ChartIcon /> },
        { to: '/super/audit', label: t('super.auditLog'), icon: <EditIcon /> },
        { to: '/super/config', label: t('nav.config'), icon: <SettingsIcon /> },
      ]} />
    </Shell>
  )
}
