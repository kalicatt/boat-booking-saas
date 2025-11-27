import Link from 'next/link'
import { auth } from '@/auth'
import { logout } from '@/lib/actions'
import { redirect } from 'next/navigation'

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

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER AVEC PROFIL COLORÉ */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 pb-6 border-b border-slate-200 gap-4">
          
          {/* Titre */}
          <div>
            <h1 className="text-4xl font-bold text-slate-800">Tableau de Bord</h1>
            <p className="text-slate-500 mt-2">Espace de gestion Sweet Narcisse</p>
          </div>
          
          {/* CARTE PROFIL & DÉCONNEXION */}
          <div className={`flex items-center gap-4 bg-white p-2 pr-4 rounded-full shadow-sm border border-slate-200 ring-4 ${styles.ring}`}>
            
            {/* Avatar : Image OU Initiales */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm tracking-wider shadow-inner overflow-hidden ${!user.image ? styles.avatar : 'bg-white'}`}>
              {user.image ? (
                <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
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

        {/* GRILLE D'OPTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          
          {/* 1. PLANNING */}
          <Link href="/admin/planning" className="group block bg-white p-8 rounded-2xl shadow-md border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer transform hover:-translate-y-1">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition duration-300">
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
          <Link href="/admin/reservations" className="group block bg-white p-8 rounded-2xl shadow-md border border-slate-200 hover:shadow-xl hover:border-green-300 transition-all cursor-pointer transform hover:-translate-y-1">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition duration-300">
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
          <Link href="/admin/stats" className="group block bg-white p-8 rounded-2xl shadow-md border border-slate-200 hover:shadow-xl hover:border-purple-300 transition-all cursor-pointer transform hover:-translate-y-1">
            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition duration-300">
              📊
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-purple-600">
              Statistiques
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Suivre le chiffre d'affaires, l'affluence et la répartition par langue/barque.
            </p>
          </Link>

          {/* 4. HEURES & PAIE */}
          <Link href="/admin/hours" className="group block bg-white p-8 rounded-2xl shadow-md border border-slate-200 hover:shadow-xl hover:border-orange-300 transition-all cursor-pointer transform hover:-translate-y-1">
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition duration-300">
              🕒
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-orange-600">
              Heures & Paie
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Saisir les heures des employés et générer les rapports mensuels.
            </p>
          </Link>

          {/* 5. ÉQUIPE & COMPTES */}
          {(user.role === 'ADMIN' || user.role === 'SUPERADMIN') && (
            <Link href="/admin/employees" className="group block bg-white p-8 rounded-2xl shadow-md border border-slate-200 hover:shadow-xl hover:border-pink-300 transition-all cursor-pointer transform hover:-translate-y-1">
              <div className="w-16 h-16 bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition duration-300">
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

          {/* 6. MOUCHARD (Logs) */}
          <Link href="/admin/logs" className="group block bg-white p-8 rounded-2xl shadow-md border border-slate-200 hover:shadow-xl hover:border-slate-400 transition-all cursor-pointer transform hover:-translate-y-1">
            <div className="w-16 h-16 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition duration-300">
              🕵️‍♂️
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-slate-600">
              Mouchard (Logs)
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Surveiller l'activité : suppressions, modifications et sécurité.
            </p>
          </Link>

          {/* 7. Blocages de réservation (Admins uniquement) */}
          {(user.role === 'ADMIN' || user.role === 'SUPERADMIN') && (
            <Link href="/admin/blocks" className="group block bg-white p-8 rounded-2xl shadow-md border border-slate-200 hover:shadow-xl hover:border-red-300 transition-all cursor-pointer transform hover:-translate-y-1">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition duration-300">
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


          {/* CARTE 8 : MON PROFIL */}
          <Link href="/admin/profile" className="group block bg-white p-8 rounded-2xl shadow-md border border-slate-200 hover:shadow-xl hover:border-slate-500 transition-all cursor-pointer transform hover:-translate-y-1">
            <div className="w-16 h-16 bg-slate-800 text-white rounded-2xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition duration-300">
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