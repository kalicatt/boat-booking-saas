import "../globals.css";
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
    // On retourne juste le contenu (la structure globale est gérée par src/app/layout.tsx)
    <div className="antialiased bg-slate-50 text-slate-900">
        {children}
    </div>
  );
}