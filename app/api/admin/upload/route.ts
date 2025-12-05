import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { auth } from '@/auth'
import { log } from '@/lib/logger'

const allowedRoles = ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN']
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads')

export const runtime = 'nodejs'

const ensureAdmin = async () => {
  const session = await auth()
  const role = typeof session?.user?.role === 'string' ? session.user.role : 'GUEST'
  if (!session || !allowedRoles.includes(role)) {
    return { session: null, role, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session, role }
}

const getExtensionFromName = (name: string | undefined | null) => {
  if (!name) return null
  const parts = name.split('.')
  if (parts.length < 2) return null
  return parts.pop()?.toLowerCase() ?? null
}

export async function POST(req: Request) {
  const { session, role, error } = await ensureAdmin()
  if (!session) return error

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!allowedMimeTypes.has(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 })
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 413 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const extension = getExtensionFromName(file.name) ?? (file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg')
    const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}.${extension}`
    await fs.mkdir(UPLOADS_DIR, { recursive: true })
    const filePath = path.join(UPLOADS_DIR, filename)
    await fs.writeFile(filePath, buffer)

    const url = `/uploads/${filename}`
    await log('info', 'Admin image uploaded', { route: '/api/admin/upload', role, filename })
    return NextResponse.json({ url })
  } catch (err) {
    await log('error', 'Admin upload failed', {
      route: '/api/admin/upload',
      role,
      error: err instanceof Error ? err.message : String(err)
    })
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
