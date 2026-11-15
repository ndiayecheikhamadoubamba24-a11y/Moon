import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Loading } from '../../components/ui'
import { useApi } from '../../lib/hooks'
import type { PublicationSummary } from '../config'
import { CategoryTag, fmtLongDate, PublicationCard, PublicationCover, RichText, StoreButtons, usePageTitle } from '../ui'

type Full = PublicationSummary & { body: string; related: PublicationSummary[] }

export default function Article() {
  const { slug } = useParams()
  const { data: p, loading, error } = useApi<Full>(`/public/publications/${slug}`)
  usePageTitle(p ? `${p.title} · Moon` : 'Publication · Moon')

  if (loading && !p) return <Loading />
  if (error || !p)
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-3xl font-black">Publication introuvable</h1>
        <p className="mt-2 text-muted">Elle a peut-être été retirée.</p>
        <Link to="/publications" className="mt-6 inline-block rounded-full bg-pink px-5 py-3 font-extrabold text-white">
          Voir toutes les publications
        </Link>
      </div>
    )

  return (
    <article>
      <div className="mx-auto max-w-3xl px-4 pt-10 md:px-6">
        <Link to="/publications" className="inline-flex items-center gap-1 text-sm font-bold text-muted hover:text-night">
          <ArrowLeft className="size-4" /> Publications
        </Link>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <CategoryTag category={p.category} />
          <time className="text-sm font-bold text-muted" dateTime={p.published_at}>
            {fmtLongDate(p.published_at)}
          </time>
        </div>
        <h1 className="mt-4 text-4xl leading-tight font-black text-balance md:text-5xl">{p.title}</h1>
        {p.excerpt && <p className="mt-4 text-xl text-muted">{p.excerpt}</p>}
      </div>
      <div className="mx-auto mt-8 max-w-4xl px-4 md:px-6">
        <PublicationCover p={p} className="h-64 rounded-3xl md:h-80" />
      </div>
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <RichText text={p.body} />
        <div className="mt-12 rounded-3xl bg-lavender-soft p-6">
          <p className="text-lg font-black">Moon t'accompagne au quotidien.</p>
          <p className="mt-1 text-muted">Suis ton cycle, apprends en jouant et pose tes questions en toute confidentialité.</p>
          <StoreButtons className="mt-4" />
        </div>
      </div>
      {p.related.length > 0 && (
        <div className="bg-white py-14">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <h2 className="text-2xl font-black">À lire aussi</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {p.related.map((r) => (
                <PublicationCard key={r.id} p={r} />
              ))}
            </div>
          </div>
        </div>
      )}
    </article>
  )
}
