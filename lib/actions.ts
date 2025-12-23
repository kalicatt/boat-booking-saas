'use server'
 
import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
 
export async function authenticate(formData: FormData) {
  try {
    await signIn('credentials', {
        email: formData.get('email'),
        password: formData.get('password'),
        redirect: false, // Désactiver la redirection serveur pour éviter les boucles 303 sur mobile
    });
    // Retourner un succès explicite - la redirection sera gérée côté client
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Identifiants incorrects.' };
        case 'AccessDenied': {
          const cause = typeof error.cause === 'string' ? error.cause : undefined
          if (cause === 'ACCOUNT_DISABLED') {
            return { error: 'Compte désactivé. Contactez un administrateur pour réactiver votre accès.' }
          }
          return { error: 'Accès refusé.' }
        }
        default:
          return { error: "Une erreur est survenue." };
      }
    }
    throw error;
  }
}

export async function logout() {
  // On déconnecte l'utilisateur et on le renvoie vers la page de login
  await signOut({ redirectTo: '/login' });
}