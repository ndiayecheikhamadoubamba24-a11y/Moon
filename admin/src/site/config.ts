/**
 * Liens vers les magasins d'applications. À renseigner dans .env dès que l'app est publiée :
 *   VITE_PLAY_STORE_URL=https://play.google.com/store/apps/details?id=org.moon.app
 *   VITE_APP_STORE_URL=https://apps.apple.com/app/idXXXXXXXXX
 * Tant qu'un lien est vide, le bouton correspondant affiche « Bientôt disponible ».
 */
export const PLAY_STORE_URL: string = import.meta.env.VITE_PLAY_STORE_URL ?? ''
export const APP_STORE_URL: string = import.meta.env.VITE_APP_STORE_URL ?? ''

export const CONTACT_EMAIL: string = import.meta.env.VITE_CONTACT_EMAIL ?? 'contact@moon.sn'

export const CATEGORIES: Record<string, { label: string; tone: string }> = {
  actualite: { label: 'Actualité', tone: 'bg-lavender text-purple' },
  evenement: { label: 'Événement', tone: 'bg-gold-soft text-[#9a5f0c]' },
  campagne: { label: 'Campagne', tone: 'bg-pink-soft text-[#b8325f]' },
  conseil: { label: 'Conseil santé', tone: 'bg-mint-soft text-[#1f7a4a]' },
}

export type PublicationSummary = {
  id: number
  title: string
  slug: string
  category: string
  excerpt: string | null
  cover_image: string | null
  featured: boolean
  published_at: string
}
