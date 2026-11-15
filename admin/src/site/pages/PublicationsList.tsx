import { useState } from 'react'
import { cx } from '../../components/ui'
import type { Paginated } from '../../lib/api'
import { useApi } from '../../lib/hooks'
import { CATEGORIES, type PublicationSummary } from '../config'
import { PublicationCard, usePageTitle } from '../ui'

export default function PublicationsList() {
  usePageTitle('Publications · Moon')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const { data, loading, error, reload } = useApi<Paginated<PublicationSummary>>(`/public/publications?per_page=9&page=${page}${category ? `&category=${category}` : ''}`)

  return (
    <>
      <section className="bg-gradient-to-br from-night to-[#4a2c8f] text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
          <h1 className="text-4xl font-black md:text-5xl">Publications</h1>
          <p className="mt-3 max-w-2xl text-lg text-[#e5dbff]">Les actualités de Moon, les événements, les campagnes de sensibilisation et des conseils santé.</p>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par catégorie">
          {[['', 'Toutes'], ...Object.entries(CATEGORIES).map(([k, c]) => [k, c.label])].map(([k, label]) => (
            <button
              key={k}
              onClick={() => (setCategory(k), setPage(1))}
              aria-pressed={category === k}
              className={cx('rounded-full border px-4 py-2 text-sm font-extrabold transition', category === k ? 'border-night bg-night text-white' : 'border-line bg-white hover:bg-lavender-soft')}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading && !data && [0, 1, 2].map((i) => <div key={i} className="h-80 animate-pulse rounded-3xl bg-lavender-soft" />)}
          {data?.data.map((p) => <PublicationCard key={p.id} p={p} />)}
        </div>
        {data && !data.data.length && <p className="mt-6 text-muted">Aucune publication dans cette catégorie pour le moment.</p>}
        {error && (
          <p className="mt-6 text-muted">
            Les publications ne peuvent pas être chargées.{' '}
            <button onClick={reload} className="font-bold text-purple underline">
              Réessayer
            </button>
          </p>
        )}
        {data && data.last_page > 1 && (
          <div className="mt-10 flex items-center justify-center gap-3">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-full border border-line px-4 py-2 font-bold disabled:opacity-40">
              ← Plus récentes
            </button>
            <span className="text-sm font-bold text-muted">
              Page {data.current_page} / {data.last_page}
            </span>
            <button disabled={page >= data.last_page} onClick={() => setPage(page + 1)} className="rounded-full border border-line px-4 py-2 font-bold disabled:opacity-40">
              Plus anciennes →
            </button>
          </div>
        )}
      </div>
    </>
  )
}
