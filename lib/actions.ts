'use server'
 
import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';
 
export async function authenticate(formData: FormData) {
  try {
    await signIn('credentials', {
        email: formData.get('email'),
        password: formData.get('password'),
        redirectTo: '/admin', // On redirige vers le planning après succès
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Identifiants incorrects.' };
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