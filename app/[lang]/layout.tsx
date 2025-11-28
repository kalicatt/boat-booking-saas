// Global CSS is already imported in root layout; avoid duplicate import here.
import { ReactNode } from 'react';

// 1. Définition du type avec Promise pour params (Spécifique Next.js 15)
interface LangLayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string }>; 
}

// 2. Le composant doit être async
export default async function LangLayout({
  children,
  params
}: LangLayoutProps) {

  // 3. On await les params pour satisfaire Next.js, même si on n'utilise pas 'lang' ici
  await params; 

  return (
    // Conteneur vitrine en mode clair uniquement
    <div className="antialiased bg-slate-50 text-slate-900 min-h-screen">
      {children}
    </div>
  );
}