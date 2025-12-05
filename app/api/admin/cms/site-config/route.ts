import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { log } from '@/lib/logger'
import { getSiteConfigGroups, upsertSiteConfigEntries } from '@/lib/cms/siteConfig'
import { SITE_CONFIG_DEFINITION_MAP } from '@/lib/cms/siteConfigDefinitions'
import type { SiteConfigFieldDefinition } from '@/lib/cms/siteConfigDefinitions'

const allowedRoles = ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN']

const ensureAdmin = async () => {
  const session = await auth()
  const role = typeof session?.user?.role === 'string' ? session.user.role : 'GUEST'
  if (!session || !allowedRoles.includes(role)) {
    return { session: null, role, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session, role }
}

export async function GET() {
  const { session, error } = await ensureAdmin()
  if (!session) return error
  const groups = await getSiteConfigGroups()
  return NextResponse.json({ groups })
}

export async function PUT(req: Request) {
  const { session, role, error } = await ensureAdmin()
  if (!session) return error

  try {
    const body = (await req.json()) as Record<string, unknown>
    const entries = Array.isArray(body.entries) ? body.entries : []
    if (!entries.length) {
      return NextResponse.json({ error: 'Aucune donnée à enregistrer.' }, { status: 400 })
    }

    const prepared = entries
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null
        const key = typeof (entry as { key?: unknown }).key === 'string' ? (entry as { key: string }).key : null
        if (!key) return null
        const definition = SITE_CONFIG_DEFINITION_MAP.get(key)
        if (!definition) {
          return null
        }
        return {
          definition: definition as SiteConfigFieldDefinition,
          value: (entry as { value?: unknown }).value
        }
      })
      .filter((item): item is { definition: SiteConfigFieldDefinition; value: unknown } => Boolean(item))

    if (!prepared.length) {
      return NextResponse.json({ error: 'Champs inconnus.' }, { status: 400 })
    }

    await upsertSiteConfigEntries(prepared)

    await log('info', 'Site config updated', {
      route: '/api/admin/cms/site-config',
      role,
      entries: prepared.length
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    await log('error', 'Site config update failed', {
      route: '/api/admin/cms/site-config',
      role,
      error: err instanceof Error ? err.message : String(err)
    })
    return NextResponse.json({ error: 'Impossible d\'enregistrer la configuration.' }, { status: 500 })
  }
}
