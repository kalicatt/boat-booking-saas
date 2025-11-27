import "./globals.css";
import { Playfair_Display, Inter } from 'next/font/google'

const display = Playfair_Display({ subsets: ['latin'], variable: '--font-display' })
const inter = Inter({ subsets: ['latin'], variable: '--font-body' })

export const metadata = {
  title: 'Sweet Narcisse Admin',
  description: 'Interface de gestion',
  icons: {
    icon: '/images/logo.jpg',
    shortcut: '/images/logo.jpg',
    apple: '/images/logo.jpg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${display.variable} ${inter.variable}`}>
      <body className="font-[var(--font-body)]">
        {children}
      </body>
    </html>
  )
}