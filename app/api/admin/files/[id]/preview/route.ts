import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'node:stream'
import { EmployeeDocumentAction } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getObjectStream } from '@/lib/storage'
import { createLog } from '@/lib/logger'
import { ensureDocumentAdminAccess } from '../../_access'
import { extractRequestContext, logDocumentAction } from '@/lib/documentAudit'

type RouteParams = { id: string | string[] }

const pickId = (raw?: string | string[]) => {
  if (!raw) return null
  return Array.isArray(raw) ? raw[0] : raw
}

function toWebStream(body: Awaited<ReturnType<typeof getObjectStream>>['body']) {
  if (!body) {
    throw new Error('Flux de stockage indisponible')
  }

  if (typeof (body as ReadableStream<Uint8Array>)?.getReader === 'function') {
    return body as ReadableStream<Uint8Array>
  }

  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    return body.stream()
  }

  if (body instanceof Uint8Array) {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(body)
        controller.close()
      }
    })
  }

  if (body instanceof Readable) {
    return Readable.toWeb(body) as ReadableStream<Uint8Array>
  }

  throw new Error('Type de flux non supporté')
}

async function resolveDocumentId(req: NextRequest, params: Promise<RouteParams>) {
  const resolved = await params
  const fromParams = pickId(resolved?.id)
  if (fromParams) {
    return fromParams
  }

  const segments = req.nextUrl.pathname.split('/').filter(Boolean)
  const previewIndex = segments.lastIndexOf('preview')
  if (previewIndex > 0) {
    return segments[previewIndex - 1]
  }
  return null
}

export async function GET(req: NextRequest, context: { params: Promise<RouteParams> }) {
  const access = await ensureDocumentAdminAccess()
  if ('error' in access) return access.error

  const documentId = await resolveDocumentId(req, context.params)
  if (!documentId) {
    return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 })
  }

  const document = await prisma.employeeDocument.findUnique({ where: { id: documentId } })
  if (!document || document.status === 'ARCHIVED') {
    return NextResponse.json({ error: 'Document introuvable ou archivé' }, { status: 404 })
  }

  try {
    const object = await getObjectStream(document.storageKey)
    const stream = toWebStream(object.body)

    await createLog('EMPLOYEE_DOC_PREVIEW', `Prévisualisation document ${document.id} par ${access.user.id ?? 'inconnu'}`)
    await logDocumentAction({
      documentId: document.id,
      targetUserId: document.userId,
      actorId: access.user.id,
      action: EmployeeDocumentAction.PREVIEW,
      details: document.fileName,
      ...extractRequestContext(req)
    })

    const headers = new Headers()
    headers.set('Content-Type', object.contentType || document.mimeType || 'application/octet-stream')
    if (object.contentLength) {
      headers.set('Content-Length', object.contentLength.toString())
    }
    headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(document.fileName)}"`)
    headers.set('Cache-Control', 'private, max-age=30, must-revalidate')
    headers.set('X-Frame-Options', 'SAMEORIGIN')

    return new NextResponse(stream, { headers })
  } catch (error) {
    console.error('GET /api/admin/files/[id]/preview', error)
    return NextResponse.json({ error: 'Prévisualisation impossible' }, { status: 500 })
  }
}
