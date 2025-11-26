"use client"
import BookingWidget from '@/components/BookingWidget'
import { getDictionary } from '@/lib/get-dictionary'
import Image from 'next/image'
import { useEffect, useState } from 'react'

// On définit params comme une Promise (Spécifique Next.js 15+)
export default function LandingPage({ params }: { params: Promise<{ lang: 'en' | 'fr' | 'de' }> }) {
    const [dict, setDict] = useState<any>(null)
    const [lang, setLang] = useState<'en'|'fr'|'de'>('fr')
    const [scrolled, setScrolled] = useState(false)
    useEffect(()=>{
        (async()=>{
            const p = await params
            setLang(p.lang)
            const d = await getDictionary(p.lang)
            setDict(d)
        })()
    },[params])
    useEffect(()=>{
        const onScroll = () => setScrolled(window.scrollY > 40)
        window.addEventListener('scroll', onScroll)
        return ()=> window.removeEventListener('scroll', onScroll)
    },[])
    if(!dict) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
    return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 scroll-smooth">
      
      {/* --- NAVIGATION --- */}
            <nav className={`fixed w-full z-40 backdrop-blur-md transition-all ${scrolled ? 'bg-white/80 shadow-md h-16' : 'bg-white/90 h-20'} border-b border-slate-100`}>
                <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
            <div className="text-2xl font-serif font-bold text-[#0f172a]">
                Sweet <span className="text-[#eab308]">Narcisse</span>
            </div>
            
            <div className="hidden md:flex gap-8 text-sm font-semibold tracking-wide text-slate-600">
                <a href="#presentation" className="hover:text-[#eab308] transition duration-300">{dict.nav.experience}</a>
                <a href={`/${lang}/partners`} className="hover:text-[#eab308] transition duration-300">{dict.partners?.nav || 'Partners'}</a>
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
    <header className="relative h-screen flex items-center justify-center overflow-hidden bg-water-gradient">
        {/* CORRECTION 1: Image de fond (doit utiliser fill et priority) */}
                <div className="absolute inset-0 z-0 opacity-70">
                        <Image 
                            src="/images/hero-bg.jpg"
                            alt="Colmar Petite Venise" 
                            fill
                            className="object-cover mix-blend-multiply"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(13,27,42,0.85)] via-[rgba(27,73,101,0.55)] to-[rgba(234,179,8,0.15)]" />
                </div>
        
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto fade-in">
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 drop-shadow-lg leading-[1.05]">{dict.hero.title}</h1>
            <p className="text-xl md:text-2xl text-slate-200 mb-10 font-light max-w-3xl mx-auto leading-relaxed">{dict.hero.subtitle}</p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <a href="#reservation" className="bg-[#eab308] text-[#0f172a] px-10 py-4 rounded text-lg font-bold hover:bg-white hover:scale-105 transition transform shadow-xl inline-block">
                  {dict.hero.cta}
              </a>
              <a href={`/${lang}/partners`} className="text-[#eab308] font-bold hover:underline text-sm">{dict.partners?.nav}</a>
            </div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-white/50 text-2xl">↓</div>
      </header>

      {/* --- PRÉSENTATION --- */}
    <section id="presentation" className="py-24 px-6 bg-sand-gradient">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
                <h4 className="text-[#eab308] font-bold tracking-widest text-sm uppercase">Sweet Narcisse</h4>
                <h2 className="text-4xl font-serif font-bold text-deep">{dict.presentation.title}</h2>
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

            {/* --- LOGOS / TRUST --- */}
            <section className="py-8 px-6 bg-white">
                <div className="max-w-6xl mx-auto text-center mb-6 fade-in">
                    <h3 className="text-sm uppercase tracking-widest text-slate-500 font-semibold">{dict.logos?.title}</h3>
                </div>
                <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 opacity-70">
                    {[1,2,3,4,5,6].map(n => (
                        <div key={n} className="flex items-center justify-center h-16 grayscale hover:grayscale-0 transition">
                            <Image src={`/images/logo${n}.png`} alt={`Logo ${n}`} width={120} height={50} className="object-contain" />
                        </div>
                    ))}
                </div>
            </section>

            {/* --- BENTO GRID BENEFITS --- */}
            <section className="py-24 px-6 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-12 text-center fade-in">
                        <h2 className="text-4xl font-serif font-bold mb-4">Pourquoi choisir notre balade ?</h2>
                        <p className="text-slate-600 max-w-2xl mx-auto">Un format pensé pour maximiser votre plaisir et minimiser les frictions.</p>
                    </div>
                    <div className="grid gap-6 md:grid-cols-3 auto-rows-[200px]">
                        {dict.bento?.cards?.map((c: any, idx: number) => (
                            <div key={idx} className={`fade-in rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between bg-gradient-to-br from-slate-50 to-slate-100 hover:shadow-lg transition group ${idx===0||idx===3? 'md:row-span-2' : ''}`}>
                                <h3 className="font-serif text-xl font-bold mb-2 text-[#0f172a] group-hover:text-[#eab308] transition">{c.title}</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">{c.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- SOCIAL PROOF --- */}
            <section className="py-24 px-6 bg-sand-gradient">
                <div className="max-w-5xl mx-auto text-center mb-12 fade-in">
                    <h2 className="text-4xl font-serif font-bold mb-3">{dict.social?.title}</h2>
                    <p className="text-slate-600 max-w-xl mx-auto">{dict.social?.subtitle}</p>
                </div>
                <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-3">
                    {[{ name:'Sophie', text:'Magique. On redécouvre la ville sous un angle apaisant.' },{ name:'Mark', text:'Highlight of our weekend in Alsace. Authentic & calm.' },{ name:'Anna', text:'Kinder waren begeistert, wir auch. Très belle expérience.' }].map(r => (
                        <div key={r.name} className="fade-in bg-white rounded-xl shadow-sm p-6 border border-slate-100 flex flex-col">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-[#eab308]/20 flex items-center justify-center font-bold text-[#0f172a]">{r.name[0]}</div>
                                <span className="font-semibold">{r.name}</span>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed flex-1">“{r.text}”</p>
                            <div className="mt-4 text-xs text-slate-400">★★★★★</div>
                        </div>
                    ))}
                </div>
                <div className="text-center mt-10">
                    <a href="#" className="text-[#0f172a] bg-[#eab308] px-6 py-3 rounded-full font-bold text-sm hover:bg-white transition shadow-md">{dict.social?.cta}</a>
                </div>
            </section>

      {/* --- RÉSERVATION --- */}
            <div className="wave-divider" aria-hidden="true">
                <svg viewBox="0 0 1440 80" preserveAspectRatio="none"><path fill="#0d1b2a" d="M0,80 L0,40 C160,10 320,10 480,30 C640,50 800,70 960,60 C1120,50 1280,20 1440,30 L1440,80 Z" /></svg>
            </div>
            <section id="reservation" className="py-24 px-4 bg-[#0d1b2a] relative overflow-hidden fade-in">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
             <div className="absolute w-96 h-96 bg-yellow-500 rounded-full blur-[120px] -top-20 -left-20"></div>
             <div className="absolute w-96 h-96 bg-blue-500 rounded-full blur-[120px] bottom-0 right-0"></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto text-center mb-12">
            <h2 className="text-4xl font-serif font-bold text-white mb-4">{dict.booking.title}</h2>
            <p className="text-slate-400 text-lg">{dict.booking.subtitle}</p>
        </div>

        {/* INTEGRATION WIDGET AVEC TRADUCTION */}
                <div className="relative z-10 fade-in">
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
        <div className="text-center mt-12 pt-8 border-t border-slate-800 text-xs opacity-50 flex flex-col items-center gap-2">
            <a href={`/${lang}/partners`} className="text-slate-400 hover:text-[#eab308] transition text-xs font-semibold">{dict.partners?.nav || 'Partners'}</a>
            <span>{dict.footer.rights}</span>
        </div>
      </footer>

    </div>
  )
}