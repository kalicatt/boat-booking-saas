import Link from 'next/link'
import { AdminPageShell } from '@/app/admin/_components/AdminPageShell'
import { ensureAdminPageAccess } from '@/lib/adminAccess'

const CMS_SECTIONS = [
  {
    href: '/admin/cms/hero',
    title: 'Hero & Accroches',
    description: 'Gérer les slides, photos desktop/mobile et messages multilingues du carrousel.',
    icon: '🌅',
    accent: 'bg-rose-100 text-rose-600'
  },
  {
    href: '/admin/cms/texts',
    title: 'Textes & SEO',
    description: 'Modifier les blocs éditoriaux, CTA et métadonnées (titres, descriptions, Open Graph).',
    icon: '📝',
    accent: 'bg-amber-100 text-amber-600'
  },
  {
    href: '/admin/cms/partners',
    title: 'Partenaires',
    description: 'Ajouter ou masquer des logos, gérer les liens et l’ordre d’affichage.',
    icon: '🤝',
    accent: 'bg-emerald-100 text-emerald-600'
  },
  {
    href: '/admin/cms/preview',
    title: 'Prévisualisation',
    description: 'Consulter le site en mode brouillon par langue avant publication.',
    icon: '👀',
    accent: 'bg-indigo-100 text-indigo-600'
  }
] as const

export default async function CmsHubPage() {
  await ensureAdminPageAccess({ page: 'cms', auditEvent: 'UNAUTHORIZED_CMS_INDEX' })

  return (
    <AdminPageShell
      title="Gestion du site"
      description="Retrouvez tous les modules CMS au même endroit pour préparer et publier le contenu public."
      backHref="/admin"
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {CMS_SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group block rounded-2xl border border-slate-200 p-6 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl"
          >
            <div
              className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition duration-300 ${section.accent} group-hover:scale-105`}
            >
              {section.icon}
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900 group-hover:text-slate-700">
                {section.title}
              </h2>
              <p className="text-sm text-slate-500">{section.description}</p>
              <span className="inline-flex items-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Explorer <span aria-hidden="true" className="ml-2 group-hover:translate-x-1">→</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </AdminPageShell>
  )
}
