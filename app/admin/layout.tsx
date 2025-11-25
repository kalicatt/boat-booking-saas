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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {children}
    </div>
  )
}