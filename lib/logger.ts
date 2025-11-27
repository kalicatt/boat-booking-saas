import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

type Level = 'info'|'warn'|'error'

interface LogCtx {
  route?: string
  bookingId?: string | number
}

export async function createLog(action: string, details: string) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return
    await prisma.log.create({ data: { action, details, userId } })
  } catch (error) {
    console.error("Erreur lors de la création du log:", error)
  }
}

export async function log(level: Level, message: string, ctx?: LogCtx){
  const payload = { ts: new Date().toISOString(), level, message, ...ctx }
  const line = JSON.stringify(payload)
  if(level==='info') console.log(line)
  else if(level==='warn') console.warn(line)
  else console.error(line)
  try {
    await createLog(level.toUpperCase()+': '+message, JSON.stringify(ctx||{}))
  } catch {}
}