import "./globals.css";
import { Playfair_Display, Inter } from 'next/font/google'

import NativeBrandingInitializer from '@/components/NativeBrandingInitializer'

const display = Playfair_Display({ subsets: ['latin'], variable: '--font-display' })
const inter = Inter({ subsets: ['latin'], variable: '--font-body' })

export const metadata = {
  title: 'Sweet Narcisse Admin',
  description: 'Interface de gestion',
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${display.variable} ${inter.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </head>
      <body className="font-[var(--font-body)] bg-slate-50 text-slate-900">
        {/* Dark mode removed */}
        <NativeBrandingInitializer />
        {children}
      </body>
    </html>
  )
}