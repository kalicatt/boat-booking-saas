const createAction = <K extends string>(key: K, label: string, description?: string) => ({ key, label, description })

type ActionConfig<K extends string> = Readonly<{ key: K; label: string; description?: string }>

type PermissionConfig<K extends string> = {
  label: string
  description?: string
  group: keyof typeof ADMIN_PERMISSION_GROUPS
  actions: ReadonlyArray<ActionConfig<K>>
}

export const ADMIN_PERMISSION_GROUPS = {
  overview: { label: "Vue d'ensemble" },
  operations: { label: 'Opérations quotidiennes' },
  fleet: { label: 'Flotte & logistique' },
  people: { label: 'Équipe & planning' },
  business: { label: 'Finance & reporting' },
  content: { label: 'Site & configuration' },
  personal: { label: 'Profil utilisateur' }
} as const

export const ADMIN_PERMISSION_CONFIG = {
  dashboard: {
    label: 'Tableau de bord',
    description: 'Aperçu quotidien, messages et santé de la flotte.',
    group: 'overview',
    actions: []
  },
  weather: {
    label: 'Météo',
    description: 'Conditions opérationnelles et alertes météo.',
    group: 'overview',
    actions: []
  },
  planning: {
    label: 'Planning & Résas',
    description: 'Calendrier opérationnel et gestion des départs.',
    group: 'operations',
    actions: [
      createAction('create', 'Créer une réservation'),
      createAction('edit', 'Modifier ou déplacer'),
      createAction('cancel', 'Annuler / rembourser'),
      createAction('assignFleet', 'Affecter une barque')
    ]
  },
  reservations: {
    label: 'Liste des réservations',
    description: 'Accès au listing détaillé et aux exports.',
    group: 'operations',
    actions: [
      createAction('create', 'Créer des dossiers'),
      createAction('edit', 'Modifier les informations'),
      createAction('cancel', 'Annuler / rembourser'),
      createAction('export', 'Exporter les données')
    ]
  },
  today: {
    label: 'Ops du jour',
    description: 'Vue opérateur pour embarquer / checker.',
    group: 'operations',
    actions: [
      createAction('checkin', "Valider l'embarquement"),
      createAction('edit', 'Marquer un no-show / ajouter un commentaire')
    ]
  },
  fleet: {
    label: 'Flotte & maintenance',
    description: 'Inventaire, charges, blocs batterie.',
    group: 'fleet',
    actions: [
      createAction('editBoats', 'Modifier les fiches barques'),
      createAction('logMaintenance', 'Créer un log maintenance'),
      createAction('setQuota', 'Définir le quota du jour')
    ]
  },
  blocks: {
    label: 'Blocages réservation',
    description: 'Créneaux fermés, matinées et journées.',
    group: 'fleet',
    actions: [
      createAction('create', 'Créer un blocage'),
      createAction('delete', 'Supprimer / modifier un blocage')
    ]
  },
  hours: {
    label: 'Heures & paie',
    description: 'Pointages, validations et exports.',
    group: 'people',
    actions: [
      createAction('log', 'Déclarer ses heures'),
      createAction('approve', 'Valider / corriger'),
      createAction('export', 'Exporter le rapport')
    ]
  },
  employees: {
    label: 'Équipe & comptes',
    description: 'Fiches collaborateur et droits.',
    group: 'people',
    actions: [
      createAction('invite', 'Inviter / créer un compte'),
      createAction('edit', 'Modifier les informations'),
      createAction('delete', 'Supprimer un compte'),
      createAction('permissions', 'Modifier les permissions')
    ]
  },
  stats: {
    label: 'Statistiques',
    description: 'CA, affluence et langues.',
    group: 'overview',
    actions: [
      createAction('viewRevenue', 'Voir le CA et les KPI sensibles'),
      createAction('export', 'Exporter les graphiques / CSV')
    ]
  },
  accounting: {
    label: 'Comptabilité & caisse',
    description: 'Sessions, ledger et clôtures.',
    group: 'business',
    actions: [
      createAction('close', 'Ouvrir / fermer une caisse'),
      createAction('refund', 'Valider les remboursements'),
      createAction('export', 'Exporter les écritures')
    ]
  },
  logs: {
    label: 'Mouchard',
    description: "Historique des actions sensibles.",
    group: 'business',
    actions: [createAction('export', 'Exporter les journaux')]
  },
  cms: {
    label: 'CMS & site',
    description: 'Contenus publics, slides et textes.',
    group: 'content',
    actions: [
      createAction('edit', 'Modifier les contenus'),
      createAction('publish', 'Publier / mettre en ligne')
    ]
  },
  settings: {
    label: 'Paramètres',
    description: 'Configuration globale et intégrations.',
    group: 'content',
    actions: [
      createAction('general', 'Modifier les options générales'),
      createAction('integrations', 'Modifier les intégrations / API')
    ]
  },
  profile: {
    label: 'Mon profil',
    description: 'Changement mot de passe & avatar.',
    group: 'personal',
    actions: [
      createAction('updateProfile', 'Mettre à jour les informations'),
      createAction('changePassword', 'Changer le mot de passe')
    ]
  }
} as const satisfies Record<string, PermissionConfig<string>>

export type AdminPermissionKey = keyof typeof ADMIN_PERMISSION_CONFIG
export type AdminPermissionAction<K extends AdminPermissionKey> = typeof ADMIN_PERMISSION_CONFIG[K]['actions'][number] extends ActionConfig<infer A>
  ? A
  : never

type PagePermission<K extends AdminPermissionKey> = {
  enabled: boolean
} & (AdminPermissionAction<K> extends never ? Record<string, never> : Record<AdminPermissionAction<K>, boolean>)

export type AdminPermissions = { [K in AdminPermissionKey]: PagePermission<K> }

const buildDefaults = (): AdminPermissions => {
  const accumulator = {} as AdminPermissions
  for (const key of Object.keys(ADMIN_PERMISSION_CONFIG) as AdminPermissionKey[]) {
    const config = ADMIN_PERMISSION_CONFIG[key]
    const page = { enabled: false } as PagePermission<typeof key>
    for (const action of config.actions) {
      page[action.key as AdminPermissionAction<typeof key>] = false
    }
    accumulator[key] = page
  }
  return accumulator
}

const BASE_DEFAULT_PERMISSIONS = buildDefaults()

export const DEFAULT_ADMIN_PERMISSIONS: AdminPermissions = BASE_DEFAULT_PERMISSIONS

export type PartialAdminPermissions = {
  [K in AdminPermissionKey]?: Partial<PagePermission<K>>
}

export type SerializedAdminPermissions = PartialAdminPermissions | null

export function compressAdminPermissions(input?: unknown): SerializedAdminPermissions {
  if (!input || typeof input !== 'object') {
    return null
  }

  const compact: PartialAdminPermissions = {}
  let hasData = false

  for (const key of Object.keys(ADMIN_PERMISSION_CONFIG) as AdminPermissionKey[]) {
    const raw = (input as Record<string, unknown>)[key]
    if (!raw || typeof raw !== 'object') {
      continue
    }

    const packed = {} as Partial<PagePermission<typeof key>>

    if (Object.prototype.hasOwnProperty.call(raw, 'enabled')) {
      const enabled = Boolean((raw as { enabled?: unknown }).enabled)
      if (enabled) {
        packed.enabled = true
      }
    }

    for (const action of ADMIN_PERMISSION_CONFIG[key].actions) {
      if (!Object.prototype.hasOwnProperty.call(raw, action.key)) {
        continue
      }
      const value = (raw as Record<string, unknown>)[action.key]
      if (value) {
        packed[action.key as AdminPermissionAction<typeof key>] = true
      }
    }

    if (Object.keys(packed).length > 0) {
      compact[key] = packed
      hasData = true
    }
  }

  return hasData ? compact : null
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

export const createEmptyAdminPermissions = (): AdminPermissions => clone(DEFAULT_ADMIN_PERMISSIONS)

export function resolveAdminPermissions(input?: unknown): AdminPermissions {
  const safe = createEmptyAdminPermissions()
  if (!input || typeof input !== 'object') {
    return safe
  }

  for (const key of Object.keys(ADMIN_PERMISSION_CONFIG) as AdminPermissionKey[]) {
    const raw = (input as Record<string, unknown>)[key]
    if (!raw || typeof raw !== 'object') continue
    const config = ADMIN_PERMISSION_CONFIG[key]
    const current = safe[key] as PagePermission<typeof key>

    if (Object.prototype.hasOwnProperty.call(raw, 'enabled')) {
      current.enabled = Boolean((raw as { enabled?: unknown }).enabled)
    }

    for (const action of config.actions) {
      if (Object.prototype.hasOwnProperty.call(raw, action.key)) {
        const value = (raw as Record<string, unknown>)[action.key]
        current[action.key as AdminPermissionAction<typeof key>] = Boolean(value)
      }
    }
  }

  return safe
}

export function hasPageAccess<K extends AdminPermissionKey>(permissions: AdminPermissions, key: K) {
  return Boolean(permissions[key]?.enabled)
}

export function hasPermission<K extends AdminPermissionKey>(
  permissions: AdminPermissions,
  key: K,
  action?: AdminPermissionAction<K>
) {
  const page = permissions[key]
  if (!page || !page.enabled) return false
  if (!action) return true
  const value = page[action]
  return typeof value === 'boolean' ? value : false
}

export function mergeAdminPermissions(
  base: AdminPermissions,
  patch: PartialAdminPermissions | undefined
): AdminPermissions {
  if (!patch) return clone(base)
  const next = clone(base)
  for (const key of Object.keys(patch) as AdminPermissionKey[]) {
    const target = next[key] as PagePermission<typeof key>
    const source = patch[key]
    if (!source || typeof source !== 'object') continue
    if (Object.prototype.hasOwnProperty.call(source, 'enabled')) {
      target.enabled = Boolean((source as { enabled?: unknown }).enabled)
    }
    for (const action of ADMIN_PERMISSION_CONFIG[key].actions) {
      if (Object.prototype.hasOwnProperty.call(source, action.key)) {
        const value = (source as Record<string, unknown>)[action.key]
        target[action.key as AdminPermissionAction<typeof key>] = Boolean(value)
      }
    }
  }
  return next
}

export const ADMIN_PERMISSION_SECTIONS = Object.entries(ADMIN_PERMISSION_CONFIG).map(([key, config]) => ({
  key: key as AdminPermissionKey,
  config
}))
