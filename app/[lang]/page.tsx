import { getDictionary, SupportedLocale } from '@/lib/get-dictionary'
import LandingClient from '@/components/LandingClient'

// Server component: loads dictionary then renders client landing shell
export default async function LandingPage({ params }: { params: { lang: string } }) {
    const rawLang = params.lang
    const supported: SupportedLocale[] = ['en','fr','de','es','it']
    const safeLang: SupportedLocale = supported.includes(rawLang as SupportedLocale) ? rawLang as SupportedLocale : 'en'
    const dict = await getDictionary(safeLang)
    return <LandingClient dict={dict} lang={safeLang} />
}