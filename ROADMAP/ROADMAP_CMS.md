Roadmap CMS : Module de Gestion de Contenu "Premium"

Ce document détaille l'implémentation d'un CMS sur-mesure intégré à l'application "NauticManager". L'objectif est d'offrir une autonomie totale au client sur le contenu, le SEO et les visuels, avec une expérience utilisateur fluide (Drag & Drop, Édition Riche, Multi-langue natif).

🏗️ Phase 1 : Architecture de Données (Backend)

Objectif : Préparer la base de données pour le contenu dynamique et multilingue.

1. Mise à jour du Schéma Prisma

Fichier : prisma/schema.prisma

Action : Ajouter les modèles pour la configuration, le carrousel, le SEO et les partenaires.

Code :

// Stockage des traductions { fr: "...", en: "..." }
model SiteConfig {
  key    String @id
  values Json
  label  String
  type   String // text, rich_text, image
  group  String
}

// Carrousel d'accueil
model HeroSlide {
  id           String  @id @default(uuid())
  imageDesktop String
  imageMobile  String? // Optimisation mobile
  title        Json    // Traduit
  subtitle     Json?   // Traduit
  order        Int     @default(0)
  isActive     Boolean @default(true)
}

// Partenaires
model Partner {
  id         String  @id @default(uuid())
  name       String
  logoUrl    String
  websiteUrl String?
  order      Int     @default(0)
  isVisible  Boolean @default(true)
}


Commande : npx prisma migrate dev --name add_cms_tables

2. API d'Upload de Fichiers (Local VPS)

Objectif : Permettre l'envoi d'images sans dépendre d'un service externe (S3).

Fichier : app/api/admin/upload/route.ts

Logique :

Recevoir FormData (fichier).

Vérifier le type MIME (image/jpeg, image/png).

Sauvegarder dans /public/uploads/ (volume Docker persistant).

Retourner l'URL relative (/uploads/image.jpg).

🎨 Phase 2 : Composants UI "Admin" (La Boîte à Outils)

Objectif : Créer des composants réutilisables pour une édition agréable.

1. Composant TranslatableInput (Onglets Langues)

Description : Un champ de saisie avec des onglets (🇫🇷 FR | 🇬🇧 EN | 🇩🇪 DE) pour éditer toutes les langues sans changer de page.

Fichier : app/admin/_components/cms/TranslatableInput.tsx

Tech : React State pour l'onglet actif.

2. Composant RichTextEditor (WYSIWYG)

Librairie : @tiptap/react + @tiptap/starter-kit.

Pourquoi ? Plus léger et moderne que Quill ou CKEditor. Parfait pour Next.js.

Fonctionnalités : Gras, Italique, Listes à puces, Liens.

Sortie : HTML brut stocké en base.

3. Composant ImageUploader

Description : Zone de "Drop" pour uploader une image avec prévisualisation immédiate.

Fichier : app/admin/_components/cms/ImageUploader.tsx

UX : Afficher l'image actuelle, bouton "Remplacer", barre de progression lors de l'upload.

🛠️ Phase 3 : Modules Fonctionnels (Les Pages Admin)

Objectif : Les interfaces que le client va utiliser.

1. Module "Hero Manager" (Carrousel)

Route : app/admin/cms/hero/page.tsx

Fonctionnalité "Wow" : Réorganisation par Glisser-Déposer (Drag & Drop).

Librairie : @dnd-kit/core et @dnd-kit/sortable.

Logique :

Liste des slides avec poignée de déplacement.

Bouton "Ajouter" ouvre un panneau latéral (Sheet).

Sauvegarde automatique du nouvel ordre via API (PUT /api/admin/hero/reorder).

2. Module "Partenaires"

Route : app/admin/cms/partners/page.tsx

Interface : Grille de cartes représentant les partenaires.

Actions : Toggle "Visible/Caché" immédiat, Édition du lien, Suppression.

3. Module "Textes & SEO"

Route : app/admin/cms/texts/page.tsx

Organisation : Accordéons par page (Accueil, Contact, Mentions Légales).

Champs :

SEO : Titre de la page (Browser Title), Description Google.

Contenu : Titres H1, Paragraphes d'intro (utilisant TranslatableInput).

🚀 Phase 4 : Intégration Front-End (Le Site Public)

Objectif : Afficher le contenu dynamique sur le site vitrine.

1. Utilitaire de Traduction (SSR)

Fichier : lib/i18n-cms.ts

Fonction : getLocalizedContent(lang: string)

Logique :

Récupère SiteConfig depuis Prisma (avec cache unstable_cache de Next.js pour la perf).

Transforme le JSON { fr: "X", en: "Y" } en string simple "X" selon la langue demandée.

Gère le "Fallback" (si DE n'existe pas, affiche EN).

2. Composant HeroSlider (Client Component)

Fichier : components/HeroSlider.tsx

Optimisation : Utiliser la balise <picture> HTML5 pour servir la bonne image selon l'écran.

<picture>
  <source media="(max-width: 768px)" srcSet={slide.imageMobile} />
  <img src={slide.imageDesktop} alt={slide.title} />
</picture>


Bénéfice : Le site charge instantanément sur mobile (image légère) tout en étant sublime sur écran 4K (image HD).

3. Page Dynamique "Partenaires"

Fichier : app/[lang]/partners/page.tsx

Code :

const partners = await prisma.partner.findMany({
  where: { isVisible: true },
  orderBy: { order: 'asc' }
})
// .map() pour afficher les logos...


📦 Stack Technique "High-End"

Pour réussir ce module, voici les librairies spécifiques à installer :

Librairie

Usage

Commande d'install

@tiptap/react

Éditeur de texte riche

npm install @tiptap/react @tiptap/pm @tiptap/starter-kit

@dnd-kit/core

Drag & Drop (Hero/Partenaires)

npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

lucide-react

Icônes modernes (Admin)

npm install lucide-react

clsx & tailwind-merge

Gestion propre des classes CSS

npm install clsx tailwind-merge