import { Buffer } from 'node:buffer'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadObject } from '@/lib/storage'
import { ensureDocumentAdminAccess } from '../../_access'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const access = await ensureDocumentAdminAccess()
  if ('error' in access) return access.error

  try {
    const { documentId } = await params
    if (!documentId) {
      return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 })
    }

    const document = await prisma.employeeDocument.findUnique({ where: { id: documentId } })
    if (!document) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    }

    if (document.status === 'ARCHIVED') {
      return NextResponse.json({ error: 'Document archivé' }, { status: 409 })
    }

    if (document.status !== 'PENDING') {
      return NextResponse.json({ error: 'Document déjà transféré' }, { status: 409 })
    }

    const uploaderId = access.user.id
    if (document.uploadedById && uploaderId && document.uploadedById !== uploaderId) {
      return NextResponse.json({ error: 'Upload attribué à un autre utilisateur' }, { status: 403 })
    }

    const body = Buffer.from(await req.arrayBuffer())
    if (!body.length) {
      return NextResponse.json({ error: 'Fichier vide' }, { status: 400 })
    }

    await uploadObject({
      key: document.storageKey,
      body,
      contentType: document.mimeType,
      checksumSha256: undefined
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PUT /api/admin/files/upload/[documentId]', error)
    return NextResponse.json({ error: 'Upload serveur impossible' }, { status: 500 })
  }
}
