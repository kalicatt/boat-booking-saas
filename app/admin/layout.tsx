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
    <div className="sn-admin flex flex-col">
      <header className="sn-admin-header">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <a href="/admin" aria-label="Admin Sweet Narcisse" className="flex items-center gap-3 nav-link">
            <img src="/images/logo.jpg" alt="Sweet Narcisse" className="h-8 w-auto rounded-sm shadow-sm" />
            <span className="font-serif font-bold">Admin</span>
          </a>
          {/* Dark mode removed */}
        </div>
      </header>
      <main className="flex-1 px-4 py-4">
        <div className="max-w-6xl mx-auto sn-card sn-card-body">
          {children}
        </div>
      </main>
    </div>
  )
}