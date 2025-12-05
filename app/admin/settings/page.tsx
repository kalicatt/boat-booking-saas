import SettingsClient from './settingsClient'
import { ensureAdminPageAccess } from '@/lib/adminAccess'

export default async function SettingsPage() {
  await ensureAdminPageAccess({ page: 'settings', auditEvent: 'UNAUTHORIZED_SETTINGS' })
  return <SettingsClient />
}
