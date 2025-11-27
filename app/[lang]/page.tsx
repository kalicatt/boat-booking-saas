import { getDictionary, SupportedLocale } from '@/lib/get-dictionary'
import LandingClient from '@/components/LandingClient'

// Server component: loads dictionary then renders client landing shell
export default async function LandingPage({ params }: { params: { lang: SupportedLocale } }) {
    const { lang } = params
    const dict = await getDictionary(lang)
    return <LandingClient dict={dict} lang={lang} />
}