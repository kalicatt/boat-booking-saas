import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = loginSchema.safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user || !user.password) return null;

          const passwordsMatch = await bcrypt.compare(password, user.password);

          if (passwordsMatch) return user;
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.image = user.image; // <--- AJOUT (On stocke l'image dans le token)
      }
      return token;
    },
    // 🚨 AJOUTEZ CE BLOC : Configuration de la session
  session: {
    // 30 jours (la durée est en secondes)
    maxAge: 30 * 24 * 60 * 60, 
    // Mettez à jour le jeton plus fréquemment (si nécessaire)
    updateAge: 24 * 60 * 60, // Toutes les 24 heures
  },
  
    async session({ session, token }) {
      if (session.user) {
        // @ts-ignore
        session.user.role = token.role;
        // @ts-ignore
        session.user.firstName = token.firstName as string;
        // @ts-ignore
        session.user.lastName = token.lastName as string;
        
        session.user.image = token.image as string; // <--- AJOUT (On la passe à la session)
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  }
});