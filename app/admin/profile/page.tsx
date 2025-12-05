import ProfileClientPage from './ProfileClientPage'
import { ensureAdminPageAccess } from '@/lib/adminAccess'

export default async function ProfilePage() {
  await ensureAdminPageAccess({ page: 'profile', auditEvent: 'UNAUTHORIZED_PROFILE' })
  return <ProfileClientPage />
}
