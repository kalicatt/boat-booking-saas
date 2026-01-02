import { BoatStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { computeBatteryAlert } from '@/lib/maintenance'
import { ensureAdminPageAccess, canAccessAdminPage } from '@/lib/adminAccess'
import type { AdminPermissionKey } from '@/types/adminPermissions'
import { FloatingAlerts } from './_components/FloatingAlerts'
import { DashboardTiles } from './_components/DashboardTiles'

type DashboardTile = {
  key: AdminPermissionKey
  href: string
  label: string
  description: string
  icon: string
  iconClass: string
  hoverBorder: string
  hoverText: string
}

const DASHBOARD_TILES = [
  {
    key: 'planning',
    href: '/admin/planning',
    label: 'Planning & Résas',
    description: 'Accéder au calendrier, gérer les départs du jour et ajuster les réservations.',
    icon: '📅',
    iconClass: 'bg-blue-100 text-blue-600',
    hoverBorder: 'hover:border-blue-300',
    hoverText: 'group-hover:text-blue-600'
  },
  {
    key: 'reservations',
    href: '/admin/reservations',
    label: 'Liste des réservations',
    description: 'Créer, consulter, modifier ou exporter les réservations.',
    icon: '📋',
    iconClass: 'bg-green-100 text-green-600',
    hoverBorder: 'hover:border-green-300',
    hoverText: 'group-hover:text-green-600'
  },
  {
    key: 'today',
    href: '/admin/today',
    label: 'Ops du jour',
    description: "Vue opérateur temps-réel pour checker les départs et valider l'embarquement.",
    icon: '⚓️',
    iconClass: 'bg-sky-100 text-sky-600',
    hoverBorder: 'hover:border-sky-300',
    hoverText: 'group-hover:text-sky-600'
  },
  {
    key: 'stats',
    href: '/admin/stats',
    label: 'Statistiques',
    description: "Suivre le chiffre d'affaires, l'affluence et les langues.",
    icon: '📊',
    iconClass: 'bg-purple-100 text-purple-600',
    hoverBorder: 'hover:border-purple-300',
    hoverText: 'group-hover:text-purple-600'
  },
  {
    key: 'weather',
    href: '/admin/weather',
    label: 'Météo',
    description: 'Consulter les conditions et décider des ouvertures.',
    icon: '🌤️',
    iconClass: 'bg-sky-100 text-sky-600',
    hoverBorder: 'hover:border-sky-300',
    hoverText: 'group-hover:text-sky-600'
  },
  {
    key: 'fleet',
    href: '/admin/fleet',
    label: 'Flotte & maintenance',
    description: 'Renommer les barques, suivre batteries et générer des alertes.',
    icon: '🚤',
    iconClass: 'bg-emerald-100 text-emerald-600',
    hoverBorder: 'hover:border-emerald-300',
    hoverText: 'group-hover:text-emerald-600'
  },
  {
    key: 'hours',
    href: '/admin/hours',
    label: 'Heures & paie',
    description: 'Saisir, corriger et exporter les heures des collaborateurs.',
    icon: '🕒',
    iconClass: 'bg-orange-100 text-orange-600',
    hoverBorder: 'hover:border-orange-300',
    hoverText: 'group-hover:text-orange-600'
  },
  {
    key: 'accounting',
    href: '/admin/accounting',
    label: 'Comptabilité & caisse',
    description: 'Ledger, clôtures journalières, remboursements et exports.',
    icon: '💶',
    iconClass: 'bg-indigo-100 text-indigo-600',
    hoverBorder: 'hover:border-indigo-300',
    hoverText: 'group-hover:text-indigo-600'
  },
  {
    key: 'employees',
    href: '/admin/employees',
    label: 'Équipe & comptes',
    description: 'Inviter, éditer et gérer les permissions des collaborateurs.',
    icon: '👥',
    iconClass: 'bg-pink-100 text-pink-600',
    hoverBorder: 'hover:border-pink-300',
    hoverText: 'group-hover:text-pink-600'
  },
  {
    key: 'logs',
    href: '/admin/logs',
    label: 'Mouchard (logs)',
    description: "Consulter l'historique des actions sensibles.",
    icon: '🕵️‍♂️',
    iconClass: 'bg-slate-100 text-slate-600',
    hoverBorder: 'hover:border-slate-400',
    hoverText: 'group-hover:text-slate-600'
  },
  {
    key: 'blocks',
    href: '/admin/blocks',
    label: 'Blocages réservation',
    description: 'Fermer des journées, matinées ou créneaux spécifiques.',
    icon: '⛔',
    iconClass: 'bg-red-100 text-red-600',
    hoverBorder: 'hover:border-red-300',
    hoverText: 'group-hover:text-red-600'
  },
  {
    key: 'cms',
    href: '/admin/cms',
    label: 'CMS & site',
    description: 'Modifier les contenus publics et publier les changements.',
    icon: '📰',
    iconClass: 'bg-cyan-100 text-cyan-600',
    hoverBorder: 'hover:border-cyan-300',
    hoverText: 'group-hover:text-cyan-600'
  },
  {
    key: 'settings',
    href: '/admin/settings',
    label: 'Paramètres',
    description: 'Intégrations, options globales et configuration avancée.',
    icon: '⚙️',
    iconClass: 'bg-amber-100 text-amber-600',
    hoverBorder: 'hover:border-amber-300',
    hoverText: 'group-hover:text-amber-600'
  },
  {
    key: 'profile',
    href: '/admin/profile',
    label: 'Mon profil',
    description: 'Mettre à jour vos informations et votre mot de passe.',
    icon: '👤',
    iconClass: 'bg-slate-800 text-white',
    hoverBorder: 'hover:border-slate-500',
    hoverText: 'group-hover:text-slate-600'
  }
] as const satisfies ReadonlyArray<DashboardTile>

type TileAccessMap = Record<DashboardTile['key'], boolean>

export default async function AdminDashboard() {
  const { role, permissions } = await ensureAdminPageAccess({
    page: 'dashboard',
    auditEvent: 'UNAUTHORIZED_DASHBOARD'
  })

  const now = new Date()
  const normalizedDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const [fleetBoats, quotaRecord] = await Promise.all([
    prisma.boat.findMany({ orderBy: { name: 'asc' } }),
    prisma.dailyBoatQuota.findUnique({ where: { day: normalizedDay } })
  ])

  const fleetSummaries = fleetBoats.map((boat) => {
    const battery = computeBatteryAlert(boat.lastChargeDate, boat.batteryCycleDays)
    return {
      name: boat.name,
      status: boat.status,
      batteryLevel: battery.level,
      daysSinceCharge: battery.daysSinceCharge
    }
  })

  const criticalBoats = fleetSummaries
    .filter((boat) => boat.batteryLevel === 'CRITICAL')
    .map((boat) => `${boat.name} (J+${boat.daysSinceCharge})`)
  const warningBoats = fleetSummaries
    .filter((boat) => boat.batteryLevel === 'WARNING')
    .map((boat) => `${boat.name} (J+${boat.daysSinceCharge})`)
  const maintenanceBoats = fleetSummaries
    .filter((boat) => boat.status === BoatStatus.MAINTENANCE)
    .map((boat) => boat.name)

  const todaysQuota = quotaRecord?.boatsAvailable ?? 4
  const totalActiveBoats = fleetSummaries.filter((boat) => boat.status === BoatStatus.ACTIVE).length

  const startMessages: string[] = []
  if (criticalBoats.length) {
    startMessages.push(`Batteries critiques : ${criticalBoats.join(', ')}`)
  }
  if (maintenanceBoats.length) {
    startMessages.push(`${maintenanceBoats.length} barque(s) en maintenance : ${maintenanceBoats.join(', ')}`)
  }
  if (todaysQuota < totalActiveBoats) {
    startMessages.push(`Limiter les départs à ${todaysQuota} barque(s) sur ${totalActiveBoats} actives.`)
  }
  if (quotaRecord?.note) {
    startMessages.push(`Note du chef d'équipe : ${quotaRecord.note}`)
  }
  if (!startMessages.length) {
    startMessages.push("Départ possible sur l'ensemble de la flotte.")
  }

  const endMessages: string[] = []
  if (criticalBoats.length) {
    endMessages.push(`Alerte 🔴 : ${criticalBoats.join(', ')} à immobiliser.`)
  }
  if (warningBoats.length) {
    endMessages.push(`Prévoir recharge pour ${warningBoats.join(', ')}.`)
  }
  if (!endMessages.length) {
    endMessages.push('Fin de journée : aucune alerte, cloche possible ✅')
  }

  const pageAccess = DASHBOARD_TILES.reduce((acc, tile) => {
    acc[tile.key] = canAccessAdminPage(role, permissions, tile.key)
    return acc
  }, {} as TileAccessMap)

  return (
    <>
      {/* Bulles flottantes d'alertes */}
      <FloatingAlerts startAlerts={startMessages} endAlerts={endMessages} />

      <div className="space-y-6">
        {/* Navigation principale - Grid modernisé */}
        <DashboardTiles 
          tiles={DASHBOARD_TILES.map(tile => ({
            key: tile.key,
            href: tile.href,
            label: tile.label,
            description: tile.description,
            icon: tile.icon,
            iconClass: tile.iconClass,
            hoverBorder: tile.hoverBorder,
            hoverText: tile.hoverText
          }))} 
          pageAccess={pageAccess} 
        />
      </div>
    </>
  )
}

