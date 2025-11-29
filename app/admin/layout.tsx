import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import "../globals.css";

export const metadata = {
  title: 'Admin - Sweet Narcisse',
  description: 'Panneau de gestion',
}

export default function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  // ON NE MET PLUS <html lang="fr"> NI <body> ICI
  // Car c'est le fichier parent (src/app/layout.tsx) qui s'en charge.
  return (
    <div className="sn-admin flex flex-col">
      <header className="sn-admin-header">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <Link href="/admin" aria-label="Admin Sweet Narcisse" className="flex items-center gap-3 nav-link">
            <Image
              src="/images/logo.jpg"
              alt="Sweet Narcisse"
              width={128}
              height={32}
              className="h-8 w-auto rounded-sm shadow-sm"
              priority
            />
            <span className="font-serif font-bold">Admin</span>
          </Link>
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