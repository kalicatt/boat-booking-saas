import Image from 'next/image'
import Link from 'next/link'
import { auth } from '@/auth'
import { logout } from '@/lib/actions'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { computeBatteryAlert } from '@/lib/maintenance'
import { BoatStatus } from '@prisma/client'

// 1. On définit le type complet de l'utilisateur pour TypeScript
interface ExtendedUser {
  name?: string | null
  email?: string | null
  image?: string | null
  firstName?: string | null
  lastName?: string | null
  role?: string
}

export default async function AdminDashboard() {
  const session = await auth()
  
  // 2. On "force" le type ici pour dire à TS : "T'inquiète, ces champs existent"
  const user = session?.user as ExtendedUser | undefined

  // 3. REDIRECTION SI NON CONNECTÉ (Au lieu d'une page blanche)
  if (!user) {
    redirect('/login')
  }

  // Calcul des initiales (avec fallback de sécurité)
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || user.name?.[0]?.toUpperCase() || '?'

  // 4. DÉFINITION DES COULEURS SELON LE RÔLE
  const getRoleStyles = (role: string) => {
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
      default: // EMPLOYEE
        return {
          avatar: 'bg-blue-600',
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          ring: 'ring-blue-100'
        }
    }
  }

  const styles = getRoleStyles(user.role || 'EMPLOYEE')

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
    startMessages.push('Départ possible sur l’ensemble de la flotte.')
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

  return (
    <div className="sn-admin">
      <div className="max-w-6xl mx-auto p-8">
        
        {/* HEADER AVEC PROFIL COLORÉ */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 pb-5 border-b border-slate-200 gap-6">
          
          {/* Titre */}
          <div>
            <h1 className="text-4xl font-bold text-slate-800">Tableau de Bord</h1>
            <p className="text-slate-500 mt-2">Espace de gestion Sweet Narcisse</p>
          </div>
          
          {/* CARTE PROFIL & DÉCONNEXION */}
          <div className={`flex items-center gap-4 sn-card p-2 pr-4 rounded-full ring-4 ${styles.ring}`}>
            
            {/* Avatar : Image OU Initiales */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm tracking-wider shadow-inner overflow-hidden ${!user.image ? styles.avatar : 'bg-white'}`}>
              {user.image ? (
                <Image
                  src={user.image}
                  alt="Profile"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-white">{initials}</span>
              )}
            </div>

            {/* Infos Texte */}
            <div className="flex flex-col mr-4">
              <span className="text-sm font-bold text-slate-800 leading-none">
                {user.firstName} {user.lastName}
              </span>
              <span className={`text-[10px] font-bold uppercase mt-1 px-2 py-0.5 rounded w-fit border ${styles.badge}`}>
                {user.role}
              </span>
            </div>

            {/* Séparateur */}
            <div className="h-8 w-px bg-slate-200 mx-1"></div>

            {/* Bouton Déconnexion */}
            <form action={logout}>
              <button type="submit" className="text-slate-400 hover:text-red-600 transition p-2" title="Se déconnecter">
                🚪
              </button>
            </form>
          </div>

        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <AlertBanner title="Début de journée" icon="🌅" tone="info" items={startMessages} />
          <AlertBanner title="Fin de journée" icon="🌇" tone="warning" items={endMessages} />
        </div>

        {/* GRILLE D'OPTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          
          {/* 1. PLANNING */}
          <Link href="/admin/planning" className="group block sn-card p-6 rounded-2xl hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer hover:-translate-y-0.5">
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-3xl mb-5 group-hover:scale-105 transition duration-300">
              📅
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-blue-600">
              Planning & Résas
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Accéder au calendrier, gérer les départs du jour et modifier les réservations.
            </p>
          </Link>

          {/* 2. LISTE DES RÉSERVATIONS */}
          <Link href="/admin/reservations" className="group block sn-card p-6 rounded-2xl hover:shadow-xl hover:border-green-300 transition-all cursor-pointer hover:-translate-y-0.5">
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center text-3xl mb-5 group-hover:scale-105 transition duration-300">
              📋
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-green-600">
              Liste des Réservations
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Créer, consulter, modifier, convertir depuis les contacts et chaîner des groupes.
            </p>
          </Link>

          {/* 3. STATISTIQUES */}
          <Link href="/admin/stats" className="group block sn-card p-6 rounded-2xl hover:shadow-xl hover:border-purple-300 transition-all cursor-pointer hover:-translate-y-0.5">
            <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center text-3xl mb-5 group-hover:scale-105 transition duration-300">
              📊
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-purple-600">
              Statistiques
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Suivre le chiffre d&apos;affaires, l&apos;affluence et la répartition par langue/barque.
            </p>
          </Link>

          {/* 3bis. FLOTTE & MAINTENANCE */}
          {(user.role === 'ADMIN' || user.role === 'SUPERADMIN') && (
            <Link href="/admin/fleet" className="group block sn-card p-6 rounded-2xl hover:shadow-xl hover:border-emerald-300 transition-all cursor-pointer hover:-translate-y-0.5">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl mb-5 group-hover:scale-105 transition duration-300">
                🚤
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-emerald-600">
                Flotte & Maintenance
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Renommer les barques, suivre batterie/alertes et mettre en maintenance instantanément.
              </p>
            </Link>
          )}

          {/* 4. HEURES & PAIE */}
          <Link href="/admin/hours" className="group block sn-card p-6 rounded-2xl hover:shadow-xl hover:border-orange-300 transition-all cursor-pointer hover:-translate-y-0.5">
            <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center text-3xl mb-5 group-hover:scale-105 transition duration-300">
              🕒
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-orange-600">
              Heures & Paie
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Saisir les heures des employés et générer les rapports mensuels.
            </p>
          </Link>

          {/* 5. COMPTABILITÉ */}
          {(user.role === 'ADMIN' || user.role === 'SUPERADMIN') && (
            <Link href="/admin/accounting" className="group block sn-card p-6 rounded-2xl hover:shadow-xl hover:border-indigo-300 transition-all cursor-pointer hover:-translate-y-0.5">
              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mb-5 group-hover:scale-105 transition duration-300">
                💶
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-indigo-600">
                Comptabilité
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Ledger, caisse, clôture journalière et exports CSV/PDF.
              </p>
            </Link>
          )}

          {/* 6. ÉQUIPE & COMPTES */}
          {(user.role === 'ADMIN' || user.role === 'SUPERADMIN') && (
            <Link href="/admin/employees" className="group block sn-card p-6 rounded-2xl hover:shadow-xl hover:border-pink-300 transition-all cursor-pointer hover:-translate-y-0.5">
              <div className="w-14 h-14 bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center text-3xl mb-5 group-hover:scale-105 transition duration-300">
                👥
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-pink-600">
                Équipe & Comptes
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Gérer les employés, droits et accès administrateur.
              </p>
            </Link>
          )}

          {/* 7. MOUCHARD (Logs) */}
          <Link href="/admin/logs" className="group block sn-card p-6 rounded-2xl hover:shadow-xl hover:border-slate-400 transition-all cursor-pointer hover:-translate-y-0.5">
            <div className="w-14 h-14 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center text-3xl mb-5 group-hover:scale-105 transition duration-300">
              🕵️‍♂️
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-slate-600">
              Mouchard (Logs)
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Surveiller l&apos;activité : suppressions, modifications et sécurité.
            </p>
          </Link>

          {/* 8. Blocages de réservation (Admins uniquement) */}
          {(user.role === 'ADMIN' || user.role === 'SUPERADMIN') && (
            <Link href="/admin/blocks" className="group block sn-card p-6 rounded-2xl hover:shadow-xl hover:border-red-300 transition-all cursor-pointer hover:-translate-y-0.5">
              <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-3xl mb-5 group-hover:scale-105 transition duration-300">
                ⛔
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-red-600">
                Blocages Réservation
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Bloquer des journées, matinées, après-midi ou horaires spécifiques.
              </p>
            </Link>
          )}

          {/* 9. CMS & Site (Admins uniquement) */}
          {(user.role === 'ADMIN' || user.role === 'SUPERADMIN') && (
            <Link href="/admin/cms" className="group block sn-card p-6 rounded-2xl hover:shadow-xl hover:border-cyan-300 transition-all cursor-pointer hover:-translate-y-0.5">
              <div className="w-14 h-14 bg-cyan-100 text-cyan-600 rounded-2xl flex items-center justify-center text-3xl mb-5 group-hover:scale-105 transition duration-300">
                📰
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-cyan-600">
                CMS & Site
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Modifier le contenu public, valider les brouillons et mettre en ligne.
              </p>
            </Link>
          )}


          {/* CARTE 10 : MON PROFIL */}
          <Link href="/admin/profile" className="group block sn-card p-6 rounded-2xl hover:shadow-xl hover:border-slate-500 transition-all cursor-pointer hover:-translate-y-0.5">
            <div className="w-14 h-14 bg-slate-800 text-white rounded-2xl flex items-center justify-center text-3xl mb-5 group-hover:scale-105 transition duration-300">
              👤
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-slate-600">
              Mon Profil
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Modifier mon mot de passe personnel.
            </p>
          </Link>
        </div>
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
  const palette =
    tone === 'warning'
      ? 'bg-amber-50 border-amber-200 text-amber-900'
      : 'bg-sky-50 border-sky-200 text-slate-800'

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${palette}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em]">
        <span>{icon}</span>
        <span>{title}</span>
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {items.length ? (
          items.map((message) => (
            <li key={message} className="flex items-start gap-2">
              <span className="text-base" aria-hidden="true">
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