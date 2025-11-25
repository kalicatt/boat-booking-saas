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

  // --- LE BLOC CALLBACKS DOIT ÊTRE ICI ---
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.image = user.image; // Stockage dans le token
      }
      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        // Transfert du token vers la session
        // @ts-ignore
        session.user.role = token.role;
        // @ts-ignore
        session.user.firstName = token.firstName as string;
        // @ts-ignore
        session.user.lastName = token.lastName as string;
        // @ts-ignore
        session.user.image = token.image as string; 
      }
      return session;
    }
  },
  // --- FIN DU BLOC CALLBACKS ---
  
  // --- LE BLOC SESSION DOIT ÊTRE ICI (NIVEAU SUPÉRIEUR) ---
  session: {
    // 30 jours (la durée est en secondes)
    maxAge: 30 * 24 * 60 * 60, 
    // Mettre à jour le jeton plus fréquemment (si nécessaire)
    updateAge: 24 * 60 * 60, // Toutes les 24 heures
  },
  
  pages: {
    signIn: '/login',
  }
});