import BookingWidget from '@/components/BookingWidget'
import { getDictionary } from '@/lib/get-dictionary'
import Image from 'next/image' // L'import est correct

// On définit params comme une Promise (Spécifique Next.js 15+)
export default async function LandingPage({ 
  params 
}: { 
  params: Promise<{ lang: 'en' | 'fr' | 'de' }> 
}) {
  
  // 1. On attend que les paramètres soient prêts et on extrait 'lang'
  const { lang } = await params;

  // 2. On charge le dictionnaire
  const dict = await getDictionary(lang);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 scroll-smooth">
      
      {/* --- NAVIGATION --- */}
      <nav className="fixed w-full z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="text-2xl font-serif font-bold text-[#0f172a]">
                Sweet <span className="text-[#eab308]">Narcisse</span>
            </div>
            
            <div className="hidden md:flex gap-8 text-sm font-semibold tracking-wide text-slate-600">
                <a href="#presentation" className="hover:text-[#eab308] transition duration-300">{dict.nav.experience}</a>
                <a href="#contact" className="hover:text-[#eab308] transition duration-300">{dict.nav.contact}</a>
                
                {/* Sélecteur de langue */}
                <div className="flex gap-2 ml-4 border-l pl-4 border-slate-300">
                    <a href="/fr" className={`hover:text-blue-600 ${lang === 'fr' ? 'font-bold text-black' : 'text-slate-400'}`}>FR</a>
                    <a href="/en" className={`hover:text-blue-600 ${lang === 'en' ? 'font-bold text-black' : 'text-slate-400'}`}>EN</a>
                    <a href="/de" className={`hover:text-blue-600 ${lang === 'de' ? 'font-bold text-black' : 'text-slate-400'}`}>DE</a>
                </div>
            </div>

            <a href="#reservation" className="bg-[#0f172a] text-[#eab308] px-6 py-2 rounded-full font-bold text-sm hover:bg-black transition shadow-lg transform hover:scale-105">
                {dict.nav.book}
            </a>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <header className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* CORRECTION 1: Image de fond (doit utiliser fill et priority) */}
        <div className="absolute inset-0 z-0">
             <Image 
                src="/images/hero-bg.jpg" // Assurez-vous que ce chemin est correct
                alt="Colmar Petite Venise" 
                fill // Remplir le conteneur parent (position: absolute)
                className="object-cover brightness-[0.60]"
                priority // Charger en priorité (car c'est le LCP)
             />
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 drop-shadow-lg">{dict.hero.title}</h1>
            <p className="text-xl md:text-2xl text-slate-200 mb-10 font-light max-w-2xl mx-auto leading-relaxed">{dict.hero.subtitle}</p>
            <a href="#reservation" className="bg-[#eab308] text-[#0f172a] px-10 py-4 rounded text-lg font-bold hover:bg-white hover:scale-105 transition transform shadow-xl inline-block">
                {dict.hero.cta}
            </a>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-white/50 text-2xl">↓</div>
      </header>

      {/* --- PRÉSENTATION --- */}
      <section id="presentation" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
                <h4 className="text-[#eab308] font-bold tracking-widest text-sm uppercase">Sweet Narcisse</h4>
                <h2 className="text-4xl font-serif font-bold text-[#0f172a]">{dict.presentation.title}</h2>
                <p className="text-slate-600 leading-relaxed text-lg text-justify">{dict.presentation.text}</p>
                <ul className="space-y-3 pt-4">
                    {dict.presentation.points.map((item: string) => (
                        <li key={item} className="flex items-center gap-3 text-slate-700 font-medium">
                            <span className="w-6 h-6 rounded-full bg-yellow-100 text-[#eab308] flex items-center justify-center font-bold">✓</span>
                            {item}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="relative group">
                 <div className="absolute -inset-4 bg-[#eab308]/20 rounded-2xl rotate-3 group-hover:rotate-6 transition duration-500"></div>
                 {/* CORRECTION 2: Image contenue (dimensions fixes) */}
                 <Image 
                    src="/images/presentation.jpg" // Assurez-vous que ce chemin est correct
                    alt="Barque Colmar" 
                    width={800} // Dimensions arbitraires pour respecter l'aspect ratio
                    height={500} 
                    className="relative rounded-2xl shadow-2xl w-full h-[500px] object-cover"
                 />
            </div>
        </div>
      </section>

      {/* --- RÉSERVATION --- */}
      <section id="reservation" className="py-24 px-4 bg-[#0f172a] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
             <div className="absolute w-96 h-96 bg-yellow-500 rounded-full blur-[120px] -top-20 -left-20"></div>
             <div className="absolute w-96 h-96 bg-blue-500 rounded-full blur-[120px] bottom-0 right-0"></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto text-center mb-12">
            <h2 className="text-4xl font-serif font-bold text-white mb-4">{dict.booking.title}</h2>
            <p className="text-slate-400 text-lg">{dict.booking.subtitle}</p>
        </div>

        {/* INTEGRATION WIDGET AVEC TRADUCTION */}
        <div className="relative z-10 animate-in slide-in-from-bottom-5 duration-700">
            <BookingWidget dict={dict} initialLang={lang} /> 
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer id="contact" className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 text-sm">
            
            {/* Colonne 1: Contact & Adresse */}
            <div className="md:col-span-1">
                <h5 className="text-white font-serif font-bold text-lg mb-4 flex items-center gap-2">
                    Sweet <span className="text-[#eab308]">Narcisse</span>
                </h5>
                <p className="leading-relaxed font-bold text-white mb-2">Départ : Pont Saint-Pierre</p>
                <p className="leading-relaxed">10 Rue de la Herse<br/>68000 Colmar, France</p>
                <p className="mt-4 font-bold text-white">📞 +33 3 89 20 68 92</p>
                <p>📧 contact@sweet-narcisse.fr</p>
            </div>
            
            {/* Colonne 2: Horaires */}
            <div>
                <h5 className="text-white font-serif font-bold text-lg mb-4">{dict.footer.hours_title}</h5>
                <p>{dict.footer.open_days}</p>
                <div className="mt-2 space-y-1">
                    <p className="text-white font-bold flex justify-between w-full max-w-[200px] whitespace-nowrap"><span>{dict.footer.morning_label}</span> <span>{dict.footer.morning_hours}</span></p>
                    <p className="text-white font-bold flex justify-between w-full max-w-[200px] whitespace-nowrap"><span>{dict.footer.afternoon_label}</span> <span>{dict.footer.afternoon_hours}</span></p>
                </div>
            </div>
            
            {/* Colonne 3: Informations */}
            <div>
                <h5 className="text-white font-serif font-bold text-lg mb-4">{dict.footer.infos}</h5>
                <a href="#" className="block hover:text-[#eab308] transition mb-2">{dict.footer.legal}</a>
                <a href="#" className="block hover:text-[#eab308] transition mb-2">{dict.footer.cgv}</a>
                <a href="/admin" className="inline-block bg-slate-800 text-slate-400 px-3 py-1 rounded hover:bg-slate-700 hover:text-white mt-4 text-xs transition">
                    {dict.footer.employee_access}
                </a>
            </div>
            
            {/* Colonne 4: Carte Google Maps (Plan d'Accès) */}
            <div className="md:col-span-1">
                <h5 className="text-white font-serif font-bold text-lg mb-4">Plan d'Accès</h5>
                <div className="rounded-lg overflow-hidden shadow-lg h-40 w-full border border-slate-700">
                    {/* CORRECTION 3: Intégration de l'iframe avec fill pour le responsive */}
                    <iframe 
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2665.933730020825!2d7.3546046767205695!3d48.0729220556597!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x479165e89c124c77%3A0x9da47dac5d840502!2sBarque%20Colmar%20au%20fil%20de%20l%E2%80%99eau%20*2A%20Sweet%20Narcisse!5e0!3m2!1sfr!2sfr!4v1764011388547!5m2!1sfr!2sfr" 
                        width="100%" 
                        height="100%" 
                        style={{ border: 0 }} 
                        allowFullScreen={false} 
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Localisation de l'embarcadère Sweet Narcisse"
                    ></iframe>
                </div>
            </div>

        </div>
        <div className="text-center mt-12 pt-8 border-t border-slate-800 text-xs opacity-50">
            {dict.footer.rights}
        </div>
      </footer>

    </div>
  )
}