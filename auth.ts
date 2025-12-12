import NextAuth, { AuthError } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { z } from "zod"
import { resolveAdminPermissions, type AdminPermissions } from '@/types/adminPermissions'

// --- 1. CONFIGURATION TYPES (Pour éviter les @ts-ignore) ---
declare module "next-auth" {
  interface User {
    role?: string
    firstName?: string
    lastName?: string
    adminPermissions?: AdminPermissions
    isActive?: boolean
  }
  interface Session {
    user: {
      role?: string
      firstName?: string
      lastName?: string
      id?: string
      image?: string | null
      adminPermissions?: AdminPermissions
      isActive?: boolean
    } & import("next-auth").DefaultSession["user"]
  }
}

type ExtendedToken = {
  role?: string
  firstName?: string
  lastName?: string
  id?: string
  image?: string | null
  adminPermissions?: AdminPermissions
  sessionVersion?: number
  isActive?: boolean
}

// --- 2. SCHÉMA DE VALIDATION ZOD ---
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
    updateAge: 24 * 60 * 60,   // 24 heures
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Validation Zod
        const parsedCredentials = loginSchema.safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          
          const user = await prisma.user.findUnique({ where: { email } })
          
          if (!user || !user.password) return null
          if (user.isActive === false) {
            throw new AuthError('AccessDenied', { cause: 'ACCOUNT_DISABLED' })
          }

          const isPasswordValid = await compare(password, user.password)

          if (isPasswordValid) {
             // On retourne l'objet complet pour les callbacks
             const permissions = resolveAdminPermissions(user.adminPermissions)
             return {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
               image: user.image,
               adminPermissions: permissions,
               sessionVersion: user.sessionVersion ?? 0,
               isActive: user.isActive
             }
          }
        }
        return null
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      const extended = token as typeof token & ExtendedToken & { sub?: string }

      if (user) {
        const enriched = user as typeof user & { sessionVersion?: number; adminPermissions?: AdminPermissions }
        extended.role = enriched.role
        extended.firstName = enriched.firstName
        extended.lastName = enriched.lastName
        extended.id = enriched.id
        extended.image = enriched.image
        extended.adminPermissions = resolveAdminPermissions(enriched.adminPermissions)
        extended.sessionVersion = enriched.sessionVersion ?? 0
        extended.isActive = enriched.isActive !== false
        return extended
      }

      const userId = typeof extended.sub === 'string' ? extended.sub : extended.id
      if (!userId) {
        return extended
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          firstName: true,
          lastName: true,
          image: true,
          adminPermissions: true,
          sessionVersion: true,
          isActive: true
        }
      })

      if (!dbUser) {
        return {}
      }

      const isActive = dbUser.isActive !== false
      extended.isActive = isActive
      extended.role = isActive ? dbUser.role : undefined
      extended.firstName = dbUser.firstName
      extended.lastName = dbUser.lastName
      extended.id = dbUser.id
      extended.image = dbUser.image
      extended.adminPermissions = resolveAdminPermissions(dbUser.adminPermissions)
      extended.sessionVersion = dbUser.sessionVersion ?? 0
      return extended
    },
    async session({ session, token }) {
      const extended = token as typeof token & ExtendedToken & { sub?: string }
      if (!session.user || !extended.sub || !extended.id) {
        return session
      }

      session.user.role = extended.role as string | undefined
      session.user.firstName = extended.firstName as string | undefined
      session.user.lastName = extended.lastName as string | undefined
      session.user.id = extended.id
      session.user.image = (extended.image as string | null | undefined) ?? null
      session.user.adminPermissions = extended.adminPermissions ?? resolveAdminPermissions()
      session.user.isActive = extended.isActive !== false
      if (session.user.isActive === false) {
        session.user.role = undefined
      }
      return session
    }
  }
})