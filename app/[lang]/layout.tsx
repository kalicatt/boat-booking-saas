// Global CSS is already imported in root layout; avoid duplicate import here.
import { ReactNode } from 'react';
import type { Metadata } from 'next'
import { getDictionary, SupportedLocale } from '@/lib/get-dictionary'
import { getPublishedCmsPayload, getSiteConfigValue } from '@/lib/cms/publicContent'
import {
  DEFAULT_LOCALE as CMS_DEFAULT_LOCALE,
  SUPPORTED_LOCALES as CMS_SUPPORTED_LOCALES,
  type LocaleCode
} from '@/types/cms'
import PlausibleAnalytics from '@/components/PlausibleAnalytics'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'

// 1. Définition du type avec Promise pour params (Spécifique Next.js 15)
interface LangLayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}

const SUPPORTED_SHELL_LOCALES: SupportedLocale[] = ['en', 'fr', 'de', 'es', 'it']

const resolveCmsLocale = (lang: SupportedLocale): LocaleCode => {
  return CMS_SUPPORTED_LOCALES.includes(lang as LocaleCode) ? (lang as LocaleCode) : CMS_DEFAULT_LOCALE
}

const getBaseUrl = () => {
  const fallback = 'http://localhost:3000'
  const envBase = process.env.NEXT_PUBLIC_BASE_URL
  const vercelBase = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
  const raw = envBase || vercelBase || fallback
  return raw.replace(/\/$/, '')
}

const toAbsoluteUrl = (value: string | null | undefined): string | null => {
  if (!value || !value.trim()) return null
  const trimmed = value.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  const base = getBaseUrl()
  if (trimmed.startsWith('/')) {
    return `${base}${trimmed}`
  }
  return `${base}/${trimmed}`
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang: rawLang } = await params
  const safeLang: SupportedLocale = SUPPORTED_SHELL_LOCALES.includes(rawLang as SupportedLocale)
    ? (rawLang as SupportedLocale)
    : 'en'
  const dict = await getDictionary(safeLang)
  const cmsPayload = await getPublishedCmsPayload()
  const cmsLocale = resolveCmsLocale(safeLang)
  const title =
    getSiteConfigValue(cmsPayload, 'seo.home.title', cmsLocale) || dict.hero?.title || 'Sweet Narcisse'
  const description =
    getSiteConfigValue(cmsPayload, 'seo.home.description', cmsLocale) ||
    dict.presentation?.text ||
    'Promenades en barque sur la Petite Venise de Colmar.'
  const rawOgImage = getSiteConfigValue(cmsPayload, 'seo.home.image', cmsLocale)
  const image = toAbsoluteUrl(rawOgImage) ?? toAbsoluteUrl('/images/hero-bg.jpg')
  const images = image ? [{ url: image }] : undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined
    }
  }
}

// 2. Le composant doit être async
export default async function LangLayout({
  children,
  params
}: LangLayoutProps) {
  await params;

  return (
    // Conteneur vitrine en mode clair uniquement
    <div className="relative antialiased text-slate-900 min-h-screen overflow-x-hidden bg-[#f5fbff]">
      {/* Parallax water background layer */}
      <div
        id="sn-water-bg"
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        suppressHydrationWarning={true}
        style={{
          backgroundRepeat: 'repeat',
          backgroundSize: '1600px 1200px',
          filter: 'saturate(1.1) contrast(1.02)'
        }}
      />
      {children}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function(){
              var bg = document.getElementById('sn-water-bg');
              if(!bg) return;
              var svgString = '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200">'
                + '<defs>'
                  + '<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
                    + '<stop offset="0" stop-color="#e6f2ff"/>'
                    + '<stop offset="1" stop-color="#f5fbff"/>'
                  + '</linearGradient>'
                + '</defs>'
                + '<rect width="1600" height="1200" fill="url(#g)"/>'
                + '<g fill="none" stroke="#bfe0ff" stroke-width="2" opacity="0.5">'
                  + '<path d="M0 150 Q400 120 800 150 T1600 150" />'
                  + '<path d="M0 300 Q350 270 800 300 T1600 300" />'
                  + '<path d="M0 450 Q450 420 800 450 T1600 450" />'
                  + '<path d="M0 600 Q300 570 800 600 T1600 600" />'
                  + '<path d="M0 750 Q380 720 800 750 T1600 750" />'
                  + '<path d="M0 900 Q420 870 800 900 T1600 900" />'
                + '</g>'
              + '</svg>';
              var svg = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgString);
              bg.style.backgroundImage = 'url(' + svg + ')';
              bg.style.backgroundRepeat = 'repeat';
              bg.style.backgroundSize = '1600px 1200px';
              var lastY = 0; var rafId = null;
              var update = function(y){
                var offsetY = Math.round(y * 0.25);
                var offsetX = Math.round(y * 0.05);
                bg.style.backgroundPosition = offsetX + 'px ' + offsetY + 'px';
              };
              var onScroll = function(){
                lastY = window.scrollY || window.pageYOffset || 0;
                if(rafId) return;
                rafId = requestAnimationFrame(function(){ rafId = null; update(lastY); });
              };
              // Initialize after hydration to avoid SSR/client mismatch
              requestAnimationFrame(function(){ onScroll(); });
              window.addEventListener('scroll', onScroll, { passive: true });
            })();
          `,
        }}
      />
      <PlausibleAnalytics />
      <ServiceWorkerRegistration />
    </div>
  );
}