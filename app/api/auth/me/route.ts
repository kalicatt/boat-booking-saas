import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { resolveAdminPermissions } from '@/types/adminPermissions'

// 1. FIX: On définit l'interface pour TypeScript
interface ExtendedUser {
  role?: string
}

export async function GET() {
  const session = await auth()
  
  // 2. FIX: On force le type de l'utilisateur
  const user = session?.user as ExtendedUser | undefined

  // Maintenant on peut accéder à .role sans erreur
  const permissions = resolveAdminPermissions((user as { adminPermissions?: unknown } | undefined)?.adminPermissions)
  return NextResponse.json({ role: user?.role || 'GUEST', permissions })
}