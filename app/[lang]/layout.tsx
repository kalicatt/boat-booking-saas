import "../globals.css";
// ... imports de fonts ...

export default function LangLayout({
  children,
  params // On garde params même si on ne l'utilise plus pour le <html>
}: {
  children: React.ReactNode
  params: { lang: string }
}) {
  return (
    // PLUS DE <html> NI <body> ICI NON PLUS
    // On retourne juste le contenu (la structure globale est gérée par src/app/layout.tsx)
    <div className="antialiased bg-slate-50 text-slate-900">
        {children}
    </div>
  );
}