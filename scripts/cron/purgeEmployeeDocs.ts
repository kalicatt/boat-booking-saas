import { EmployeeDocumentAction, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { deleteObject } from '../../lib/storage'
import { logDocumentAction } from '../../lib/documentAudit'

const MILLIS_PER_DAY = 86_400_000

const ARCHIVE_GRACE_DAYS = readNumber(process.env.EMPLOYEE_DOC_ARCHIVE_GRACE_DAYS, 30)
const EXPIRY_GRACE_DAYS = readNumber(process.env.EMPLOYEE_DOC_EXPIRE_GRACE_DAYS, 7)
const BATCH_SIZE = Math.max(1, readNumber(process.env.EMPLOYEE_DOC_PURGE_BATCH_SIZE, 50))

function readNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function computeCutoff(days: number) {
  const clamped = Math.max(0, days)
  if (clamped === Infinity) {
    return null
  }
  const now = Date.now()
  return new Date(now - clamped * MILLIS_PER_DAY)
}

async function purgeDocuments() {
  const archiveCutoff = computeCutoff(ARCHIVE_GRACE_DAYS)
  const expireCutoff = computeCutoff(EXPIRY_GRACE_DAYS)

  const criteria: Prisma.EmployeeDocumentWhereInput[] = []

  if (archiveCutoff) {
    criteria.push({
      status: 'ARCHIVED',
      archivedAt: { not: null, lte: archiveCutoff }
    })
  }

  if (expireCutoff) {
    criteria.push({
      expiresAt: { not: null, lte: expireCutoff }
    })
  }

  if (!criteria.length) {
    console.log('[purgeEmployeeDocs] No criteria configured, exiting.')
    return { purged: 0, failed: 0 }
  }

  let purged = 0
  let failed = 0

  while (true) {
    const batch = await prisma.employeeDocument.findMany({
      where: { OR: criteria },
      take: BATCH_SIZE,
      orderBy: { updatedAt: 'asc' },
      select: {
        id: true,
        userId: true,
        storageKey: true,
        fileName: true,
        archivedAt: true,
        expiresAt: true,
        updatedAt: true,
        status: true
      }
    })

    if (!batch.length) {
      break
    }

    for (const doc of batch) {
      const info = `${doc.id} (${doc.fileName})`
      try {
        if (doc.storageKey) {
          await deleteObject(doc.storageKey)
        }
      } catch (error) {
        failed += 1
        console.error(`[purgeEmployeeDocs] Failed to delete object`, info, error)
        continue
      }

      try {
        await prisma.employeeDocument.delete({ where: { id: doc.id } })
      } catch (error) {
        failed += 1
        console.error(`[purgeEmployeeDocs] Failed to delete record`, info, error)
        continue
      }

      try {
        const details = buildDetails(doc)
        await logDocumentAction({
          documentId: doc.id,
          targetUserId: doc.userId,
          actorId: null,
          action: EmployeeDocumentAction.DELETE,
          details
        })
      } catch (error) {
        console.warn(`[purgeEmployeeDocs] Audit log failed for`, info, error)
      }

      purged += 1
      console.log(`[purgeEmployeeDocs] Purged`, info)
    }
  }

  return { purged, failed }
}

function buildDetails(doc: {
  status: string
  archivedAt: Date | null
  expiresAt: Date | null
}) {
  const parts: string[] = [`status=${doc.status}`]
  if (doc.archivedAt) {
    parts.push(`archivedAt=${doc.archivedAt.toISOString()}`)
  }
  if (doc.expiresAt) {
    parts.push(`expiresAt=${doc.expiresAt.toISOString()}`)
  }
  return `Cron purge → ${parts.join(' | ')}`
}

async function main() {
  try {
    const { purged, failed } = await purgeDocuments()
    console.log(`[purgeEmployeeDocs] Completed: purged=${purged}, failed=${failed}`)
    if (failed > 0) {
      process.exitCode = 1
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('[purgeEmployeeDocs] Fatal error', error)
  process.exitCode = 1
})
