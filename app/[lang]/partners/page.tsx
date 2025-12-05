import { getDictionary, SupportedLocale } from '@/lib/get-dictionary'
import Link from 'next/link'
import { getPublishedCmsPayload } from '@/lib/cms/publicContent'

export default async function PartnersPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: rawLang } = await params
  const supported: SupportedLocale[] = ['en', 'fr', 'de', 'es', 'it']
  const safeLang: SupportedLocale = supported.includes(rawLang as SupportedLocale)
    ? (rawLang as SupportedLocale)
    : 'en'
  const dict = await getDictionary(safeLang)
  const cmsPayload = await getPublishedCmsPayload()
  const partners = cmsPayload.partners.filter((partner) => partner.isVisible)

  return (
    <main className="min-h-screen bg-water-gradient pb-24 text-white">
      <div className="relative mx-auto max-w-4xl px-6 pt-32 pb-16 text-center">
        <h1 className="mb-4 text-5xl font-serif font-bold drop-shadow">
          {dict.partners?.title || 'Partners'}
        </h1>
        <p className="text-lg leading-relaxed text-slate-200">{dict.partners?.subtitle}</p>
        <Link
          href={`/${safeLang}`}
          className="mt-6 inline-block text-sm font-semibold text-[#eab308] transition hover:underline"
        >
          {dict.partners?.back_home}
        </Link>
      </div>
      <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-3">
        {partners.length ? (
          partners.map((partner) => (
            <article
              key={partner.id}
              className="group relative flex flex-col rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur"
            >
              <div className="relative mb-4 h-40 w-full overflow-hidden rounded-lg border border-white/10 bg-white/10">
                <div
                  className="absolute inset-0 bg-contain bg-center bg-no-repeat transition duration-300 group-hover:scale-105"
                  style={{ backgroundImage: `url(${partner.logoUrl})` }}
                />
              </div>
              <h3 className="text-xl font-serif font-bold text-[#eab308]">{partner.name}</h3>
              <p className="text-xs uppercase tracking-wide text-slate-200">
                #{partner.order + 1}
              </p>
              <p className="flex-1 text-sm text-slate-200">
                {dict.partners?.list_title ?? 'Partenaire officiel'}
              </p>
              {partner.websiteUrl ? (
                <a
                  href={partner.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 text-sm font-semibold text-[#eab308] transition hover:text-white"
                >
                  {dict.partners?.learn_more}
                </a>
              ) : null}
            </article>
          ))
        ) : (
          <div className="md:col-span-3 rounded-2xl border border-dashed border-white/20 bg-white/5 p-10 text-center text-sm text-white/70">
            Aucun partenaire n&apos;est disponible pour le moment.
          </div>
        )}
      </div>
    </main>
  )
}
