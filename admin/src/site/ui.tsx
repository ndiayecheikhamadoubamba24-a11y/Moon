import { Apple, Play } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '../components/ui'
import { APP_STORE_URL, CATEGORIES, PLAY_STORE_URL, type PublicationSummary } from './config'

/** Boutons vers Google Play et l'App Store (désactivés tant que le lien n'est pas configuré). */
export function StoreButtons({ dark = false, className }: { dark?: boolean; className?: string }) {
  const stores = [
    { name: 'Google Play', pre: 'Disponible sur', url: PLAY_STORE_URL, icon: <Play className="size-6 fill-current" /> },
    { name: 'App Store', pre: 'Télécharger dans', url: APP_STORE_URL, icon: <Apple className="size-6" /> },
  ]
  return (
    <div className={cx('flex flex-wrap gap-3', className)}>
      {stores.map((s) => {
        const body = (
          <>
            {s.icon}
            <span className="text-left leading-tight">
              <span className="block text-[11px] font-semibold opacity-80">{s.url ? s.pre : 'Bientôt sur'}</span>
              <span className="block text-base font-black">{s.name}</span>
            </span>
          </>
        )
        const cls = cx(
          'inline-flex min-w-44 items-center gap-3 rounded-2xl px-4 py-2.5 transition',
          dark ? 'bg-white text-night' : 'bg-night text-white',
          s.url ? 'hover:-translate-y-0.5 hover:shadow-lg' : 'cursor-not-allowed opacity-70',
        )
        return s.url ? (
          <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className={cls} aria-label={`Télécharger Moon sur ${s.name}`}>
            {body}
          </a>
        ) : (
          <span key={s.name} className={cls} aria-disabled="true" title="L'application sera bientôt disponible">
            {body}
          </span>
        )
      })}
    </div>
  )
}

/** Capture d'écran de l'app dans un cadre de téléphone. */
export function PhoneShot({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={cx('rounded-[2.2rem] bg-night p-2 shadow-[0_24px_60px_rgba(43,24,88,0.35)]', className)}>
      <img src={src} alt={alt} loading="lazy" className="block aspect-[390/844] w-full rounded-[1.7rem] object-cover object-top" />
    </div>
  )
}

/** Léger glissement d'un bloc quand il entre à l'écran ; le bloc n'est jamais masqué. */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setShown(true), io.disconnect()), { rootMargin: '0px 0px -10% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    // Le contenu reste toujours visible (aperçus, impression, navigateurs sans animation) : seul un léger glissement s'anime.
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={cx('transition-transform duration-700 ease-out', shown ? 'translate-y-0' : 'translate-y-5', className)}>
      {children}
    </div>
  )
}

export function CategoryTag({ category }: { category: string }) {
  const c = CATEGORIES[category] ?? CATEGORIES.actualite
  return <span className={cx('inline-block rounded-full px-3 py-1 text-xs font-extrabold', c.tone)}>{c.label}</span>
}

export const fmtLongDate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const COVER_TONES: Record<string, string> = {
  actualite: 'from-[#4a2c8f] to-[#7b4fc4]',
  evenement: 'from-[#f5b85c] to-[#ec5f8c]',
  campagne: 'from-[#ec5f8c] to-[#7b4fc4]',
  conseil: 'from-[#3bb273] to-[#4a2c8f]',
}

export function PublicationCover({ p, className }: { p: Pick<PublicationSummary, 'cover_image' | 'category' | 'title'>; className?: string }) {
  if (p.cover_image) return <img src={p.cover_image} alt="" loading="lazy" className={cx('w-full object-cover', className)} />
  return (
    <div className={cx('relative flex items-center justify-center overflow-hidden bg-gradient-to-br', COVER_TONES[p.category] ?? COVER_TONES.actualite, className)} aria-hidden="true">
      <img src="/site/moon-mark.png" alt="" className="size-20 rounded-full bg-white/95 p-3 shadow-lg" />
      <span className="absolute top-4 left-6 text-xl text-white/70">✦</span>
      <span className="absolute right-8 bottom-6 text-2xl text-white/60">✧</span>
    </div>
  )
}

export function PublicationCard({ p }: { p: PublicationSummary }) {
  return (
    <Link to={`/publications/${p.slug}`} className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-white transition hover:-translate-y-1 hover:shadow-xl">
      <PublicationCover p={p} className="h-44" />
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-center justify-between gap-2">
          <CategoryTag category={p.category} />
          <time className="text-xs font-bold text-muted" dateTime={p.published_at}>
            {fmtLongDate(p.published_at)}
          </time>
        </div>
        <h3 className="text-lg leading-snug font-black text-balance group-hover:text-pink">{p.title}</h3>
        {p.excerpt && <p className="line-clamp-3 text-sm text-muted">{p.excerpt}</p>}
        <span className="mt-auto pt-2 text-sm font-extrabold text-purple">Lire la suite →</span>
      </div>
    </Link>
  )
}

/** Texte des publications : paragraphes, intertitres « ## » et listes « - ». Aucun HTML injecté. */
export function RichText({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, '').split(/\n{2,}/)
  return (
    <div className="space-y-4 text-[17px] leading-relaxed">
      {blocks.map((b, i) => {
        const lines = b.split('\n')
        if (lines[0].startsWith('## ')) {
          return (
            <div key={i} className="space-y-3">
              <h2 className="pt-2 text-2xl font-black">{lines[0].slice(3)}</h2>
              {lines.length > 1 && <RichText text={lines.slice(1).join('\n')} />}
            </div>
          )
        }
        if (lines.every((l) => l.startsWith('- '))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-6 marker:text-pink">
              {lines.map((l, j) => (
                <li key={j}>{l.slice(2)}</li>
              ))}
            </ul>
          )
        }
        return <p key={i}>{lines.join(' ')}</p>
      })}
    </div>
  )
}

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title
  }, [title])
}
