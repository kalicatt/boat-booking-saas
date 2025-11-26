import { getDictionary } from '@/lib/get-dictionary'
import Image from 'next/image'

export default async function PartnersPage({ params }: { params: Promise<{ lang: 'en' | 'fr' | 'de' }> }) {
  const { lang } = await params
  const dict = await getDictionary(lang)

  const partners = [
    { name: 'Maison du Chocolat', tag: 'Artisan', img: '/images/partner1.jpg', url: '#', desc: 'Produits gourmands locaux et durables.' },
    { name: 'Eco Colmar Initiative', tag: 'Éco', img: '/images/partner2.jpg', url: '#', desc: 'Actions pour préserver la Lauch et son écosystème.' },
    { name: 'Atelier du Bois', tag: 'Craft', img: '/images/partner3.jpg', url: '#', desc: 'Savoir‑faire traditionnel pour nos infrastructures.' }
  ]

  return (
    <main className="min-h-screen bg-water-gradient text-white pb-24">
      <div className="relative pt-32 pb-16 px-6 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl font-serif font-bold mb-4 drop-shadow">{dict.partners?.title || 'Partners'}</h1>
        <p className="text-slate-200 text-lg leading-relaxed">{dict.partners?.subtitle}</p>
        <a href={`/${lang}`} className="inline-block mt-6 text-sm font-semibold text-[#eab308] hover:underline">
          {dict.partners?.back_home}
        </a>
      </div>
      <div className="max-w-6xl mx-auto px-6 grid gap-8 md:grid-cols-3">
        {partners.map(p => (
          <div key={p.name} className="group relative bg-white/5 backdrop-blur rounded-xl border border-white/10 p-4 flex flex-col">
            <div className="relative w-full h-40 mb-4 overflow-hidden rounded-lg">
              <Image src={p.img} alt={p.name} fill className="object-cover group-hover:scale-105 transition" />
            </div>
            <h3 className="text-xl font-serif font-bold mb-1 text-[#eab308]">{p.name}</h3>
            <span className="text-xs uppercase tracking-wide bg-[#eab308] text-black px-2 py-1 rounded font-bold w-fit mb-2">{p.tag}</span>
            <p className="text-sm text-slate-200 flex-1">{p.desc}</p>
            <a href={p.url} className="mt-4 text-sm font-semibold text-[#eab308] hover:text-white transition">
              {dict.partners?.learn_more}
            </a>
          </div>
        ))}
      </div>
    </main>
  )
}
