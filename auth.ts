import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { z } from "zod"

// --- 1. CONFIGURATION TYPES (Pour éviter les @ts-ignore) ---
declare module "next-auth" {
  interface User {
    role?: string
    firstName?: string
    lastName?: string
  }
  interface Session {
    user: {
      role?: string
      firstName?: string
      lastName?: string
      id?: string
    } & import("next-auth").DefaultSession["user"]
  }
}

declare module "@auth/core/jwt" { 
  interface JWT {
    role?: string
    firstName?: string
    lastName?: string
    id?: string
  }
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

          const isPasswordValid = await compare(password, user.password)

          if (isPasswordValid) {
             // On retourne l'objet complet pour les callbacks
             return {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                image: user.image,
             }
          }
        }
        return null
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.firstName = user.firstName
        token.lastName = user.lastName
        token.id = user.id
        token.image = user.image 
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        // Plus besoin de @ts-ignore grâce au module declare plus haut !
        session.user.role = token.role
        session.user.firstName = token.firstName
        session.user.lastName = token.lastName
        // FIX: On force le type string pour l'ID
        session.user.id = token.id as string
        session.user.image = token.image as string | null | undefined
      }
      return session
    }
  }
})