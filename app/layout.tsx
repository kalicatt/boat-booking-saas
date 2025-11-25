import "./globals.css";

export const metadata = {
  title: 'Sweet Narcisse Admin',
  description: 'Interface de gestion',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>
        {children}
      </body>
    </html>
  )
}