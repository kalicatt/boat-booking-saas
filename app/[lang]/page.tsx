import { getDictionary, SupportedLocale } from '@/lib/get-dictionary'
import LandingClient from '@/components/LandingClient'
import { getPublishedCmsPayload } from '@/lib/cms/publicContent'
import {
    DEFAULT_LOCALE as CMS_DEFAULT_LOCALE,
    SUPPORTED_LOCALES as CMS_SUPPORTED_LOCALES,
    type LocaleCode
} from '@/types/cms'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'
export const fetchCache = 'force-no-store'

// Server component: loads dictionary then renders client landing shell
export default async function LandingPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang: rawLang } = await params
    const supported: SupportedLocale[] = ['en', 'fr', 'de', 'es', 'it']
    const safeLang: SupportedLocale = supported.includes(rawLang as SupportedLocale)
        ? (rawLang as SupportedLocale)
        : 'en'
    const dict = await getDictionary(safeLang)
    const cmsPayload = await getPublishedCmsPayload()
    const cmsLocale: LocaleCode = CMS_SUPPORTED_LOCALES.includes(safeLang as LocaleCode)
        ? (safeLang as LocaleCode)
        : CMS_DEFAULT_LOCALE

    const session = await auth()
    const userRole = typeof session?.user?.role === 'string' ? session.user.role : undefined

    return <LandingClient dict={dict} lang={safeLang} cmsContent={cmsPayload} initialCmsLocale={cmsLocale} userRole={userRole} />
}