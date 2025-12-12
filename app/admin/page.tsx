import Image from 'next/image'
import Link from 'next/link'
import { BoatStatus } from '@prisma/client'

import { logout } from '@/lib/actions'
import { prisma } from '@/lib/prisma'
import { computeBatteryAlert } from '@/lib/maintenance'
import { ensureAdminPageAccess, canAccessAdminPage } from '@/lib/adminAccess'
import type { AdminPermissionKey } from '@/types/adminPermissions'

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

type RoleStyles = {
  avatar: string
  badge: string
  ring: string
}

const getRoleStyles = (role: string | null | undefined): RoleStyles => {
  switch (role) {
    case 'SUPERADMIN':
      return {
        avatar: 'bg-yellow-500',
        badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        ring: 'ring-yellow-100'
      }
    case 'ADMIN':
      return {
        avatar: 'bg-purple-600',
        badge: 'bg-purple-100 text-purple-800 border-purple-200',
        ring: 'ring-purple-100'
      }
    default:
      return {
        avatar: 'bg-blue-600',
        badge: 'bg-blue-100 text-blue-800 border-blue-200',
        ring: 'ring-blue-100'
      }
  }
}

export default async function AdminDashboard() {
  const { user, role, permissions } = await ensureAdminPageAccess({
    page: 'dashboard',
    auditEvent: 'UNAUTHORIZED_DASHBOARD'
  })

  const initials =
    `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() ||
    user?.name?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    '?'
  const displayName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || user?.name || user?.email || 'Compte Sweet Narcisse'
  const styles = getRoleStyles(role)

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
  const hasAnyTile = Object.values(pageAccess).some(Boolean)

  return (
    <div className="sn-admin">
      <div className="mx-auto max-w-6xl p-8">
        <div className="mb-10 flex flex-col items-end gap-6 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-800">Tableau de bord</h1>
            <p className="mt-2 text-slate-500">Espace de gestion Sweet Narcisse</p>
          </div>

          <div className={`sn-card flex items-center gap-4 rounded-full p-2 pr-4 ring-4 ${styles.ring}`}>
            <div
              className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-sm font-bold tracking-wider text-white shadow-inner ${
                user?.image ? 'bg-white' : styles.avatar
              }`}
            >
              {user?.image ? (
                <Image src={user.image} alt="Profile" width={40} height={40} className="h-full w-full rounded-full object-cover" unoptimized />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <div className="mr-4 flex flex-col">
              <span className="text-sm font-bold leading-none text-slate-800">{displayName}</span>
              <span className={`mt-1 w-fit rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${styles.badge}`}>
                {role ?? 'EMPLOYEE'}
              </span>
            </div>

            <div className="mx-1 h-8 w-px bg-slate-200" />

            <form action={logout}>
              <button type="submit" className="p-2 text-slate-400 transition hover:text-red-600" title="Se déconnecter">
                🚪
              </button>
            </form>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <AlertBanner title="Début de journée" icon="🌅" tone="info" items={startMessages} />
          <AlertBanner title="Fin de journée" icon="🌇" tone="warning" items={endMessages} />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
          {DASHBOARD_TILES.map((tile) => {
            if (!pageAccess[tile.key]) {
              return null
            }
            return (
              <Link
                key={tile.key}
                href={tile.href}
                className={`group block sn-card cursor-pointer rounded-2xl border border-transparent p-6 transition-all hover:-translate-y-0.5 hover:shadow-xl ${tile.hoverBorder}`}
              >
                <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${tile.iconClass}`}>
                  {tile.icon}
                </div>
                <h2 className={`mb-3 text-2xl font-bold text-slate-800 ${tile.hoverText}`}>{tile.label}</h2>
                <p className="text-sm text-slate-500">{tile.description}</p>
              </Link>
            )
          })}
        </div>

        {!hasAnyTile && (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Aucune section n&apos;est active pour votre compte. Contactez un administrateur pour obtenir les accès nécessaires.
          </p>
        )}
      </div>
    </div>
  )
}

type AlertBannerProps = {
  title: string
  icon: string
  items: string[]
  tone: 'info' | 'warning'
}

function AlertBanner({ title, icon, items, tone }: AlertBannerProps) {
  const palette = tone === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-sky-50 border-sky-200 text-slate-800'

  return (
    <div className={`rounded-xl border p-3 shadow-sm ${palette}`}>
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em]">
        <span>{icon}</span>
        <span>{title}</span>
      </div>
      <ul className="mt-2 space-y-1 text-[12px] leading-snug">
        {items.length ? (
          items.map((message) => (
            <li key={message} className="flex items-start gap-2">
              <span className="text-sm" aria-hidden="true">
                •
              </span>
              <span>{message}</span>
            </li>
          ))
        ) : (
          <li>Rien à signaler.</li>
        )}
      </ul>
    </div>
  )
}

