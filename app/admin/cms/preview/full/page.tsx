import { getDictionary, SupportedLocale } from '@/lib/get-dictionary'
import LandingClient from '@/components/LandingClient'
import { getPublishedCmsPayload } from '@/lib/cms/publicContent'
import {
    DEFAULT_LOCALE as CMS_DEFAULT_LOCALE,
    SUPPORTED_LOCALES as CMS_SUPPORTED_LOCALES,
    type LocaleCode
} from '@/types/cms'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'
export const fetchCache = 'force-no-store'

// Admin Immersive Preview
export default async function FullPreviewPage({ searchParams }: { searchParams: Promise<{ lang: string }> }) {
    const { lang: rawLang } = await searchParams

    // Auth Check
    const session = await auth()
    const role = typeof session?.user?.role === 'string' ? session.user.role : null
    if (!role || !['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN'].includes(role)) {
        redirect('/login')
    }

    const supported: SupportedLocale[] = ['en', 'fr', 'de', 'es', 'it']
    const safeLang: SupportedLocale = supported.includes(rawLang as SupportedLocale)
        ? (rawLang as SupportedLocale)
        : 'fr' // Default to FR for admin

    const dict = await getDictionary(safeLang)
    const cmsPayload = await getPublishedCmsPayload()
    const cmsLocale: LocaleCode = CMS_SUPPORTED_LOCALES.includes(safeLang as LocaleCode)
        ? (safeLang as LocaleCode)
        : CMS_DEFAULT_LOCALE

    // Pass userRole="ADMIN" to enable the toolbar
    return <LandingClient dict={dict} lang={safeLang} cmsContent={cmsPayload} initialCmsLocale={cmsLocale} userRole="ADMIN" />
}
