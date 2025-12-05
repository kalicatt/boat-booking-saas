import type { TranslationRecord } from '@/types/cms'

export type SiteConfigFieldType = 'text' | 'textarea' | 'rich_text'

export type SiteConfigFieldDefinition = {
  key: string
  label: string
  helperText?: string
  previewLocation?: string
  previewAnchor?: string
  type: SiteConfigFieldType
  translatable: boolean
  rows?: number
  required?: boolean
  inputMode?: 'image'
}

export type SiteConfigGroupDefinition = {
  id: string
  title: string
  description?: string
  fields: SiteConfigFieldDefinition[]
}

export const SITE_CONFIG_GROUPS: SiteConfigGroupDefinition[] = [
  {
    id: 'seo_home',
    title: 'SEO - Page Accueil',
    description: 'Identifiants utilises par les moteurs de recherche et le partage social.',
    fields: [
      {
        key: 'seo.home.title',
        label: 'Titre SEO',
        helperText: 'S\'affiche sur l\'onglet du navigateur et comme titre bleu dans Google.',
        previewLocation: 'Google / Onglet navigateur (non visible sur la page).',
        type: 'text',
        translatable: true,
        required: true
      },
      {
        key: 'seo.home.description',
        label: 'Description Google',
        helperText: 'Résumé de 160 caracteres maximum affiche sous le titre dans Google.',
        previewLocation: 'Google / Partage social (non visible sur la page).',
        type: 'textarea',
        rows: 4,
        translatable: true
      },
      {
        key: 'seo.home.image',
        label: 'Image Open Graph',
        helperText: 'Image 1200x630px partagee sur Facebook/Twitter lors d\'un partage.',
        previewLocation: "Facebook, LinkedIn, etc. lors du partage d'un lien.",
        type: 'text',
        translatable: false,
        inputMode: 'image'
      }
    ]
  },
  {
    id: 'home_copy',
    title: 'Contenus - Accueil',
    description: 'Textes visibles sur la page d\'accueil (hero et introduction).',
    fields: [
      {
        key: 'home.hero.eyebrow',
        label: 'Accroche courte',
        helperText: 'Badge en lettres capitales situe juste au-dessus du grand titre.',
        previewLocation: 'Accueil > Bloc hero (bandeau superieur).',
        previewAnchor: 'hero',
        type: 'text',
        translatable: true,
        required: true
      },
      {
        key: 'home.hero.cta',
        label: 'Bouton principal',
        helperText: 'Texte du bouton bleu "Reserver" place sous le titre du hero.',
        previewLocation: 'Accueil > Bloc hero (bouton d\'action).',
        previewAnchor: 'hero',
        type: 'text',
        translatable: true,
        required: true
      },
      {
        key: 'home.story.paragraph',
        label: 'Paragraphe d\'introduction',
        helperText: 'Grand paragraphe qui raconte l\'experience dans la section "Sweet Narcisse".',
        previewLocation: 'Accueil > Section presentation (sous le hero).',
        previewAnchor: 'presentation',
        type: 'textarea',
        rows: 5,
        translatable: true
      }
    ]
  },
  {
    id: 'legal_assets',
    title: 'Mentions & Footer',
    description: 'Textes legaux et informations complementaires visibles en bas de page.',
    fields: [
      {
        key: 'legal.mentions',
        label: 'Mentions legales',
        helperText: 'Contenu HTML de la page /legal. Peut inclure titres, paragraphes, liens.',
        previewLocation: 'Page Mentions legales complete (/legal).',
        type: 'rich_text',
        translatable: false
      },
      {
        key: 'footer.contact.line',
        label: 'Texte de contact',
        helperText: 'Petite phrase juste au-dessus des liens legaux dans le footer.',
        previewLocation: 'Accueil > Footer (colonne Infos).',
        previewAnchor: 'footer',
        type: 'text',
        translatable: true
      }
    ]
  }
]

export type SiteConfigFieldState = SiteConfigFieldDefinition & {
  value: TranslationRecord | string
}

export type SiteConfigGroupState = {
  id: string
  title: string
  description?: string
  fields: SiteConfigFieldState[]
}

export const SITE_CONFIG_DEFINITION_MAP = new Map(
  SITE_CONFIG_GROUPS.flatMap((group) => group.fields.map((field) => [field.key, field]))
)
