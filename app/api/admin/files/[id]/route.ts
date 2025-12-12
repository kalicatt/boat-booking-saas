import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deleteObject } from '@/lib/storage'
import { createLog } from '@/lib/logger'
import { ensureDocumentAdminAccess } from '../_access'

type RouteParams = { id?: string | string[] }

const isPromise = (value: unknown): value is Promise<RouteParams> =>
  typeof value === 'object' && value !== null && 'then' in (value as Record<string, unknown>)

const pickId = (raw?: string | string[]) => {
  if (!raw) return null
  return Array.isArray(raw) ? raw[0] : raw
}

async function resolveDocumentId(req: NextRequest, params?: RouteParams | Promise<RouteParams>) {
  let candidate: string | string[] | undefined
  if (params) {
    const resolved = isPromise(params) ? await params : params
    candidate = resolved?.id
  }

  const direct = pickId(candidate)
  if (direct) return direct

  const segments = req.nextUrl.pathname.split('/').filter(Boolean)
  const last = segments[segments.length - 1]
  return last ?? null
}

export async function DELETE(req: NextRequest, context: { params?: RouteParams | Promise<RouteParams> }) {
  const access = await ensureDocumentAdminAccess()
  if ('error' in access) return access.error

  const documentId = await resolveDocumentId(req, context?.params)
  if (!documentId) {
    return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 })
  }

  const document = await prisma.employeeDocument.findUnique({ where: { id: documentId } })
  if (!document) {
    return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
  }

  try {
    await deleteObject(document.storageKey)
  } catch (error) {
    console.error('DELETE /api/admin/files/[id] storage', error)
    return NextResponse.json({ error: 'Suppression stockage impossible' }, { status: 502 })
  }

  await prisma.employeeDocument.delete({ where: { id: documentId } })

  await createLog('EMPLOYEE_DOC_DELETE', `Suppression document ${document.id} par ${access.user.id ?? 'inconnu'}`)

  return NextResponse.json({ deleted: true })
}
