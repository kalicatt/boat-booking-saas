import { ensureAdminPageAccess } from '@/lib/adminAccess'
import { prisma } from '@/lib/prisma'
import { ProDashboardClient } from './ProDashboardClient'

export default async function AdminDashboardPage() {
  await ensureAdminPageAccess({
    page: 'dashboard',
    auditEvent: 'UNAUTHORIZED_DASHBOARD'
  })

  // Fetch today's stats
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  const [todayBookings, activeBoats] = await Promise.all([
    prisma.booking.findMany({
      where: {
        date: {
          gte: startOfDay,
          lt: endOfDay
        },
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      },
      select: {
        id: true,
        startTime: true,
        numberOfPeople: true,
        status: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      },
      take: 10
    }),
    prisma.boat.count({
      where: {
        status: 'ACTIVE'
      }
    })
  ])

  const todayRevenue = await prisma.booking.aggregate({
    where: {
      date: {
        gte: startOfDay,
        lt: endOfDay
      },
      status: 'CONFIRMED',
      isPaid: true
    },
    _sum: {
      totalPrice: true
    }
  })

  const stats = {
    todayBookings: todayBookings.length,
    todayRevenue: todayRevenue._sum?.totalPrice || 0,
    activeBoats,
    pendingTasks: todayBookings.filter(b => b.status === 'PENDING').length
  }

  const upcomingBookings = todayBookings.map(booking => {
    const time = new Date(booking.startTime)
    const hours = time.getHours().toString().padStart(2, '0')
    const minutes = time.getMinutes().toString().padStart(2, '0')
    
    return {
      id: booking.id,
      time: `${hours}:${minutes}`,
      customerName: `${booking.user?.firstName || ''} ${booking.user?.lastName || ''}`.trim() || 'Client',
      guests: booking.numberOfPeople,
      status: booking.status
    }
  })

  return <ProDashboardClient stats={stats} upcomingBookings={upcomingBookings} />
}
