import type { TranslationRecord } from '@/types/cms'

export type SiteConfigFieldType = 'text' | 'textarea' | 'rich_text'

export type SiteConfigFieldDefinition = {
  key: string
  label: string
  helperText?: string
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
    description: 'Balises titre et description pour la page d\'entree.',
    fields: [
      {
        key: 'seo.home.title',
        label: 'Titre SEO',
        helperText: 'Affiche dans l\'onglet du navigateur et les resultats Google.',
        type: 'text',
        translatable: true,
        required: true
      },
      {
        key: 'seo.home.description',
        label: 'Description Google',
        helperText: '160 caracteres recommandes. Utilise par les moteurs de recherche.',
        type: 'textarea',
        rows: 4,
        translatable: true
      },
      {
        key: 'seo.home.image',
        label: 'Image Open Graph',
        helperText: 'URL absolue ou relative pour Facebook/Twitter (1200x630).',
        type: 'text',
        translatable: false,
        inputMode: 'image'
      }
    ]
  },
  {
    id: 'home_copy',
    title: 'Contenus - Accueil',
    description: 'Textes principaux affiches sur le site public.',
    fields: [
      {
        key: 'home.hero.eyebrow',
        label: 'Accroche courte',
        helperText: 'Texte au-dessus du titre principal.',
        type: 'text',
        translatable: true,
        required: true
      },
      {
        key: 'home.hero.cta',
        label: 'Bouton principal',
        helperText: 'Label du bouton de reservation.',
        type: 'text',
        translatable: true,
        required: true
      },
      {
        key: 'home.story.paragraph',
        label: 'Paragraphe d\'introduction',
        helperText: 'Court texte presentant l\'experience.',
        type: 'textarea',
        rows: 5,
        translatable: true
      }
    ]
  },
  {
    id: 'legal_assets',
    title: 'Mentions & Footer',
    description: 'Informations obligatoires et textes de pied de page.',
    fields: [
      {
        key: 'legal.mentions',
        label: 'Mentions legales',
        helperText: 'Contenu HTML riche affiche dans la page dediee.',
        type: 'rich_text',
        translatable: false
      },
      {
        key: 'footer.contact.line',
        label: 'Texte de contact',
        helperText: 'Phrase courte dans le footer.',
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
