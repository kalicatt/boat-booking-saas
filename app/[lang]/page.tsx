import { getDictionary } from '@/lib/get-dictionary'
import LandingClient from '@/components/LandingClient'

// Server component: loads dictionary then renders client landing shell
export default async function LandingPage({ params }: { params: Promise<{ lang: 'en' | 'fr' | 'de' }> }) {
    const { lang } = await params
    const dict = await getDictionary(lang)
    return <LandingClient dict={dict} lang={lang} />
}