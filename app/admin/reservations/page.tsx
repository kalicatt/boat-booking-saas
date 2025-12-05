import ReservationsAdminPage from './reservations'
import { ensureAdminPageAccess } from '@/lib/adminAccess'

export default async function ReservationsPage() {
  await ensureAdminPageAccess({ page: 'reservations', auditEvent: 'UNAUTHORIZED_RESERVATIONS' })
  return <ReservationsAdminPage />
}
