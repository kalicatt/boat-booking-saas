import "../globals.css";

export const metadata = {
  title: 'Admin - Sweet Narcisse',
  description: 'Panneau de gestion',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ON NE MET PLUS <html lang="fr"> NI <body> ICI
  // Car c'est le fichier parent (src/app/layout.tsx) qui s'en charge.
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <a href="/admin" aria-label="Admin Sweet Narcisse" className="flex items-center gap-3">
            <img src="/images/logo.jpg" alt="Sweet Narcisse" className="h-8 w-auto" />
            <span className="font-serif font-bold">Admin</span>
          </a>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}