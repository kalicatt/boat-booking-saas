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
    // On retourne le contenu avec un header simple et le logo
    <div className="antialiased bg-slate-50 text-slate-900 min-h-screen flex flex-col">
      <header className="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3">
          <a href="/" aria-label="Accueil Sweet Narcisse" className="flex items-center gap-3">
            <img src="/images/logo.jpg" alt="Sweet Narcisse" className="h-8 w-auto" />
            <span className="sr-only">Sweet Narcisse</span>
          </a>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/logo.jpg" alt="Sweet Narcisse" className="h-6 w-auto" />
            <span className="text-sm text-slate-600">© {new Date().getFullYear()} Sweet Narcisse</span>
          </div>
          <div className="text-xs text-slate-500">Pont-Saint Pierre, Colmar</div>
        </div>
      </footer>
    </div>
  );
}